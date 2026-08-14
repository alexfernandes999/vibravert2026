"use server";

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

  const ext = arquivo.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const marca = String(dados.get("marca") ?? "banner").replace(/[^a-z0-9-]/gi, "").toLowerCase();
  const nome = `${marca}-${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(nome, await arquivo.arrayBuffer(), {
      contentType: arquivo.type,
      cacheControl: "31536000",
      upsert: false,
    });

  if (error) return { ok: false, erro: `Não subiu: ${error.message}` };

  return { ok: true, url: `${url}/storage/v1/object/public/${BUCKET}/${nome}` };
}
