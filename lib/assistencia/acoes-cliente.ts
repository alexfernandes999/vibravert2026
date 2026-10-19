"use server";

import { after } from "next/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { rastreioValido } from "@/lib/regras/nf";
import { chaveValida, linkProtocolo } from "./acesso";
import { ESPACOS_FOTO, type EspacoFoto } from "./esquemas";
import { RE_PROTOCOLO } from "./protocolo";
import { processarChamado } from "./analise";

const so = (s: string) => s.replace(/\D/g, "");

/** Acompanhamento: protocolo + CPF levam à página do chamado. */
export async function consultarProtocolo(_: unknown, dados: FormData): Promise<{ erro: string } | never> {
  const protocolo = String(dados.get("protocolo") ?? "").trim().toUpperCase();
  const documento = so(String(dados.get("documento") ?? ""));
  if (!RE_PROTOCOLO.test(protocolo)) return { erro: "O protocolo tem o formato AT-2026-000123." };
  const c = await prisma.chamado.findUnique({ where: { protocolo }, select: { documento: true } });
  // Mesma resposta para protocolo inexistente e CPF errado: não confirma que o protocolo existe.
  if (!c || c.documento !== documento) return { erro: "Não encontramos um chamado com este protocolo e este CPF/CNPJ." };
  redirect(linkProtocolo(protocolo));
}

/** "Já enviou? Informe o rastreio." */
export async function informarRastreio(protocolo: string, chave: string, _: unknown, dados: FormData) {
  if (!chaveValida(protocolo, chave)) return { erro: "Link inválido. Abra o chamado pelo acompanhamento." };
  const codigo = String(dados.get("rastreio") ?? "").trim().toUpperCase();
  if (!rastreioValido(codigo)) return { erro: "O código tem 2 letras, 9 números e 2 letras · por exemplo QB123456789BR." };
  const c = await prisma.chamado.findUnique({ where: { protocolo }, select: { id: true, status: true } });
  if (!c || c.status !== "AGUARDANDO_ENVIO") return { erro: "Este chamado não está aguardando envio." };
  await prisma.chamado.update({ where: { id: c.id }, data: { rastreio: codigo, status: "A_CAMINHO" } });
  revalidatePath(`/assistencia/protocolo/${protocolo}`);
  return { ok: true };
}

/** Reenvio das fotos que faltavam: volta para a análise. */
export async function reenviarFotos(protocolo: string, chave: string, fotos: Partial<Record<EspacoFoto, string>>) {
  if (!chaveValida(protocolo, chave)) return { erro: "Link inválido." };
  const c = await prisma.chamado.findUnique({ where: { protocolo }, select: { id: true, status: true } });
  if (!c || c.status !== "PENDENTE_INFORMACAO") return { erro: "Este chamado não está esperando fotos." };
  const entradas = Object.entries(fotos).filter(
    ([e, caminho]) => ESPACOS_FOTO.includes(e as EspacoFoto) && /^tmp\/[a-f0-9-]{36}\/[a-z_]+\.(jpg|jpeg|png|webp|heic|heif)$/.test(caminho ?? ""),
  ) as [EspacoFoto, string][];
  if (!entradas.length) return { erro: "Envie pelo menos uma foto." };

  await prisma.$transaction([
    prisma.foto.createMany({ data: entradas.map(([espaco, caminho]) => ({ chamadoId: c.id, espaco, caminho, caminhoReduzido: caminho })) }),
    prisma.chamado.update({ where: { id: c.id }, data: { status: "ANALISANDO" } }),
  ]);
  after(async () => {
    try {
      await processarChamado(c.id);
    } catch {
      await prisma.chamado.update({ where: { id: c.id }, data: { status: "EM_ANALISE" } });
    }
  });
  return { ok: true };
}
