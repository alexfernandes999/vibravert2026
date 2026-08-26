"use server";

import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";
import { autenticado } from "@/lib/admin-auth";

/**
 * Sobe imagem de banner para o Storage do Supabase.
 *
 * Usa a chave de serviço, que só existe no servidor. Subir direto do navegador
 * exigiria expor uma chave com permissão de escrita no bucket · qualquer
 * pessoa poderia então gravar arquivo na loja.
 *
 * O nome do arquivo leva a posição e o instante: subir a arte nova sobre a
 * antiga deixaria o navegador do cliente mostrando a velha por causa do cache,
 * e ninguém entenderia por que "não salvou".
 */
const BUCKET = "banners";

/**
 * O quadrado padrão de foto de produto.
 *
 * 1200 × 1200 é a medida do Mercado Livre, e é o que faz uma vitrine parecer
 * uma vitrine: foto que chega em qualquer proporção sai do mesmo tamanho, e a
 * prateleira deixa de ter uma bomba grande ao lado de uma pequena por acidente
 * de recorte.
 *
 * A imagem é encaixada inteira dentro do quadrado e o que falta vira branco ·
 * cortar para preencher decapitaria metade das bombas, que são altas e
 * estreitas. Branco porque é o fundo que essas fotos já têm e é o que o
 * Mercado Livre e o Google Shopping pedem.
 */
const LADO = 1200;

async function aoQuadrado(arquivo: File) {
  return sharp(Buffer.from(await arquivo.arrayBuffer()))
    .rotate() // respeita o EXIF · foto de celular sobe deitada sem isto
    .resize(LADO, LADO, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .flatten({ background: "#ffffff" }) // PNG transparente vira branco, não preto
    .jpeg({ quality: 86, mozjpeg: true })
    .toBuffer();
}

const TIPOS = ["image/jpeg", "image/png", "image/webp", "image/avif"];
const TAMANHO_MAX = 6 * 1024 * 1024;

export type Envio = { ok: true; url: string } | { ok: false; erro: string };

export async function enviarImagem(dados: FormData): Promise<Envio> {
  if (!(await autenticado())) return { ok: false, erro: "Sessão expirada. Entre de novo." };

  const arquivo = dados.get("arquivo");
  if (!(arquivo instanceof File) || arquivo.size === 0) {
    return { ok: false, erro: "Escolha uma imagem." };
  }
  if (!TIPOS.includes(arquivo.type)) {
    return { ok: false, erro: "Use JPG, PNG, WebP ou AVIF." };
  }
  if (arquivo.size > TAMANHO_MAX) {
    return { ok: false, erro: `A imagem tem ${(arquivo.size / 1048576).toFixed(1)} MB · o limite é 6 MB.` };
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !chave) return { ok: false, erro: "Armazenamento não configurado no servidor." };

  const supabase = createClient(url, chave, { auth: { persistSession: false } });

  // Foto de produto sai sempre no quadrado padrão. Banner não · a arte já vem
  // na medida da posição e encaixar num quadrado a destruiria.
  const quadrada = String(dados.get("quadrada") ?? "") === "1";
  let corpo: ArrayBuffer | Buffer;
  let tipoFinal = arquivo.type;
  try {
    corpo = quadrada ? await aoQuadrado(arquivo) : await arquivo.arrayBuffer();
    if (quadrada) tipoFinal = "image/jpeg";
  } catch {
    return { ok: false, erro: "Não consegui ler esta imagem. Tente salvar de novo em JPG ou PNG." };
  }

  const ext = quadrada ? "jpg" : arquivo.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const marca = String(dados.get("marca") ?? "banner").replace(/[^a-z0-9-]/gi, "").toLowerCase();
  // A pasta separa foto de produto de arte de banner dentro do mesmo bucket.
  // Bucket novo exigiria criar e liberar leitura pública de novo · a pasta
  // resolve igual e não depende de ninguém mexer no Supabase.
  const pasta = String(dados.get("pasta") ?? "").replace(/[^a-z0-9-]/gi, "").toLowerCase();
  const nome = `${pasta ? `${pasta}/` : ""}${marca}-${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(nome, corpo, {
      contentType: tipoFinal,
      cacheControl: "31536000",
      upsert: false,
    });

  if (error) return { ok: false, erro: `Não subiu: ${error.message}` };

  return { ok: true, url: `${url}/storage/v1/object/public/${BUCKET}/${nome}` };
}
