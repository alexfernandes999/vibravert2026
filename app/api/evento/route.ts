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
    const { etapa } = await req.json();
    if (VALIDAS.has(etapa)) await registrar(etapa as EtapaFunil);
  } catch {
    // medição nunca devolve erro para a página
  }
  return NextResponse.json({ ok: true });
}
