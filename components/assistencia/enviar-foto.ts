"use client";

import { createClient } from "@supabase/supabase-js";
import { pedirEnvioDeFoto } from "@/lib/assistencia/abrir";
import type { EspacoFoto } from "@/lib/assistencia/esquemas";

/** Reduz a foto no aparelho (lado maior 2000 px). HEIC que o navegador não lê sobe como está. */
async function reduzir(arquivo: File): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(arquivo);
    const escala = Math.min(1, 2000 / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * escala);
    canvas.height = Math.round(bmp.height * escala);
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.85));
    return blob ?? arquivo;
  } catch {
    return arquivo;
  }
}

/**
 * Sobe uma foto direto ao bucket privado, pela URL assinada do servidor.
 * Devolve o caminho no rascunho e uma prévia local.
 */
export async function enviarFoto(rascunho: string | null, espaco: EspacoFoto, arquivo: File) {
  const corpo = await reduzir(arquivo);
  const tipo = corpo.type || arquivo.type || "image/jpeg";
  const r = await pedirEnvioDeFoto(rascunho, espaco, tipo);
  if (!r.ok) throw new Error(r.erro);
  const supa = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const { error } = await supa.storage.from("assistencia").uploadToSignedUrl(r.caminho, r.token, corpo, { contentType: tipo });
  if (error) throw new Error("Não foi possível enviar a foto. Verifique a conexão e tente de novo.");
  return { rascunho: r.rascunho, caminho: r.caminho, previa: URL.createObjectURL(corpo) };
}
