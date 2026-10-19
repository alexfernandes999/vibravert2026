import { NextResponse, type NextRequest } from "next/server";
import { lembretesAutomaticos } from "@/lib/lembretes";
import { rotinaAssistencia } from "@/lib/assistencia/rotinas";

/**
 * Agendamento diário da Vercel · a garantia de que a varredura roda mesmo num
 * dia sem visitas. A varredura é idempotente (um lembrete por pedido), então
 * uma chamada a mais não manda nada duplicado.
 */
export async function GET(req: NextRequest) {
  const segredo = process.env.CRON_SECRET;
  const autorizado = segredo
    ? req.headers.get("authorization") === `Bearer ${segredo}`
    : (req.headers.get("user-agent") ?? "").startsWith("vercel-cron");
  if (!autorizado) return NextResponse.json({ ok: false }, { status: 401 });

  // A rotina da assistência pega carona no mesmo agendamento diário.
  const assistencia = await rotinaAssistencia().catch((e) => ({ erro: String(e) }));
  return NextResponse.json({ ok: true, ...(await lembretesAutomaticos()), assistencia });
}
