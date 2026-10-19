import sharp from "sharp";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import type { EspacoFoto } from "./esquemas";

/**
 * Storage privado da assistência (bucket "assistencia").
 *
 * Nada aqui é público. O navegador sobe a foto por uma URL de envio assinada
 * (sem passar a foto pelo servidor, que tem limite de 4,5 MB por requisição na
 * Vercel), e tudo o que é lido sai por URL assinada de poucos minutos.
 */
const BUCKET = "assistencia";
/** Lado maior da versão reduzida · a que vai para a IA e para o portal. */
export const LADO_REDUZIDO = 1000;
const LEITURA_SEGUNDOS = 10 * 60;

function cliente() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !chave) throw new Error("Storage não configurado (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)");
  return createClient(url, chave, { auth: { persistSession: false } }).storage.from(BUCKET);
}

const EXTENSOES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
};

/** URL para o navegador subir uma foto ainda sem chamado (pasta tmp). */
export async function urlDeEnvio(rascunho: string, espaco: EspacoFoto, tipo: string) {
  const ext = EXTENSOES[tipo];
  if (!ext) throw new Error("tipo de imagem não aceito");
  const caminho = `tmp/${rascunho}/${espaco}.${ext}`;
  const { data, error } = await cliente().createSignedUploadUrl(caminho, { upsert: true });
  if (error || !data) throw new Error(`falha ao assinar envio: ${error?.message}`);
  return { caminho, url: data.signedUrl, token: data.token };
}

export const novoRascunho = () => randomUUID();

export async function baixar(caminho: string): Promise<Buffer> {
  const { data, error } = await cliente().download(caminho);
  if (error || !data) throw new Error(`arquivo não encontrado: ${caminho}`);
  return Buffer.from(await data.arrayBuffer());
}

export async function subir(caminho: string, corpo: Buffer, tipo: string) {
  const { error } = await cliente().upload(caminho, corpo, { contentType: tipo, upsert: false });
  if (error) throw new Error(`falha ao gravar ${caminho}: ${error.message}`);
}

export async function urlAssinada(caminho: string, segundos = LEITURA_SEGUNDOS) {
  const { data, error } = await cliente().createSignedUrl(caminho, segundos);
  if (error || !data) throw new Error(`falha ao assinar leitura: ${error?.message}`);
  return data.signedUrl;
}

/**
 * Leva a foto do rascunho para a pasta do chamado e grava a versão reduzida.
 *
 * Reduzir para ~1000 px é a otimização de custo mais importante do projeto:
 * a foto inteira custa até 3,5 vezes mais tokens na API. A versão reduzida
 * também é a que o portal mostra · o original fica guardado para a bancada.
 */
export async function arquivarFoto(origem: string, protocolo: string, espaco: EspacoFoto) {
  const bruto = await baixar(origem);
  const imagem = sharp(bruto, { failOn: "none" }).rotate();
  const meta = await imagem.metadata();
  const reduzida = await imagem
    .resize(LADO_REDUZIDO, LADO_REDUZIDO, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer({ resolveWithObject: true });

  const ext = origem.split(".").pop() ?? "jpg";
  const caminho = `chamados/${protocolo}/${espaco}-original.${ext}`;
  const caminhoReduzido = `chamados/${protocolo}/${espaco}.jpg`;
  await subir(caminho, bruto, `image/${ext === "jpg" ? "jpeg" : ext}`);
  await subir(caminhoReduzido, reduzida.data, "image/jpeg");

  return {
    caminho,
    caminhoReduzido,
    largura: meta.width ?? null,
    altura: meta.height ?? null,
    bytes: bruto.length,
    reduzida: reduzida.data,
  };
}
