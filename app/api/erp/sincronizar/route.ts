import { NextResponse, type NextRequest } from "next/server";
import { sincronizar } from "@/lib/erp/espelho";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Agendamento do espelho do Bling. Cada chamada lê por até 45 s e para; a
 * seguinte continua de onde esta parou.
 */
export async function GET(req: NextRequest) {
  const segredo = process.env.CRON_SECRET;
  const autorizado = segredo
    ? req.headers.get("authorization") === `Bearer ${segredo}`
    : (req.headers.get("user-agent") ?? "").startsWith("vercel-cron");
  if (!autorizado) return NextResponse.json({ ok: false }, { status: 401 });

  return NextResponse.json(await sincronizar({ orcamentoMs: 45_000 }));
}
