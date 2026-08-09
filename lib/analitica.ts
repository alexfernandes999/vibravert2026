"use server";

import { cookies, headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import type { EtapaFunil } from "@prisma/client";

/**
 * Registro do funil.
 *
 * Sem isto, "o site não converte" é opinião. Com isto é um número: quantos
 * chegaram, quantos abriram um produto, quantos puseram no carrinho, quantos
 * foram ao checkout e quantos pagaram — e em qual desses degraus se perde
 * gente.
 *
 * A sessão é um identificador aleatório em cookie. Não guarda nome, e-mail,
 * IP nem nada que identifique a pessoa: serve só para ligar os passos do mesmo
 * visitante. Por isso não precisa de banner de consentimento.
 */
const SESSAO = "vv_s";
const ORIGEM = "vv_o";
const TRINTA_DIAS = 60 * 60 * 24 * 30;

/** Referenciador cru → nome legível no relatório. */
function classificar(ref: string | null, utmSource?: string, utmMedium?: string) {
  if (utmSource) return `${utmSource} / ${utmMedium ?? "campanha"}`;
  if (!ref) return "direto";
  try {
    const h = new URL(ref).hostname.replace(/^www\./, "");
    if (h.includes("google")) return "google / orgânico";
    if (h.includes("bing")) return "bing / orgânico";
    if (h.includes("instagram")) return "instagram / social";
    if (h.includes("facebook") || h.includes("fb.")) return "facebook / social";
    if (h.includes("mercadolivre") || h.includes("mercadolibre")) return "mercado livre / marketplace";
    if (h.includes("whatsapp") || h.includes("wa.me")) return "whatsapp / mensagem";
    if (h.includes("youtube")) return "youtube / social";
    if (h.includes("vibravert")) return "direto";
    return `${h} / referência`;
  } catch {
    return "direto";
  }
}

async function sessao() {
  const c = await cookies();
  let s = c.get(SESSAO)?.value;
  if (!s) {
    s = crypto.randomUUID();
    c.set(SESSAO, s, { maxAge: TRINTA_DIAS, httpOnly: true, sameSite: "lax", path: "/" });
  }
  return s;
}

/**
 * A origem é gravada uma vez e não se sobrescreve.
 *
 * Quem chega pelo Google, sai e volta digitando o endereço não virou "direto":
 * quem trouxe a venda foi o Google. Sobrescrever a cada visita faz o canal
 * "direto" roubar o crédito de todos os outros — é o erro de atribuição mais
 * comum que existe.
 */
export async function registrar(etapa: EtapaFunil, params?: Record<string, string | undefined>) {
  try {
    const c = await cookies();
    const s = await sessao();

    let origem = c.get(ORIGEM)?.value;
    let utm = { source: params?.utm_source, medium: params?.utm_medium, campaign: params?.utm_campaign };

    if (!origem) {
      const ref = (await headers()).get("referer");
      origem = classificar(ref, utm.source, utm.medium);
      c.set(ORIGEM, origem, { maxAge: TRINTA_DIAS, httpOnly: true, sameSite: "lax", path: "/" });
    }

    await prisma.evento.create({
      data: {
        sessao: s,
        etapa,
        origem,
        utmSource: utm.source ?? null,
        utmMedium: utm.medium ?? null,
        utmCampaign: utm.campaign ?? null,
      },
    });
  } catch {
    // Analítica nunca pode derrubar a página que está medindo.
  }
}

export async function origemDaSessao() {
  const c = await cookies();
  return c.get(ORIGEM)?.value ?? "direto";
}
