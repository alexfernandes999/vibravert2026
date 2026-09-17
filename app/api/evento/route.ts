import { NextResponse, type NextRequest } from "next/server";
import { registrar } from "@/lib/analitica";
import type { EtapaFunil } from "@prisma/client";

/**
 * Registro do funil por chamada do navegador.
 *
 * Antes a visita era gravada durante a renderização da página, o que obrigava
 * home e ficha a serem dinâmicas: cada visitante esperava uma ida ao banco
 * antes de ver qualquer coisa. As páginas voltam a ser servidas prontas e a
 * medição acontece depois de a página aparecer, sem ninguém esperar por ela.
 */
const VALIDAS = new Set(["VISITA", "PRODUTO"]);

export async function POST(req: NextRequest) {
  try {
    const { etapa, ref, utm } = await req.json();
    const texto = (v: unknown) => (typeof v === "string" && v.length <= 500 ? v : undefined);
    if (VALIDAS.has(etapa)) {
      await registrar(etapa as EtapaFunil, {
        ref: texto(ref),
        utm_source: texto(utm?.utm_source),
        utm_medium: texto(utm?.utm_medium),
        utm_campaign: texto(utm?.utm_campaign),
        gclid: texto(utm?.gclid),
        fbclid: texto(utm?.fbclid),
      });
    }
  } catch {
    // medição nunca devolve erro para a página
  }
  return NextResponse.json({ ok: true });
}
