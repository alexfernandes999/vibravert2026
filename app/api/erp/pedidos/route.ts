import { NextResponse, type NextRequest } from "next/server";
import { sincronizar } from "@/lib/erp/espelho";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Pedidos de venda quase ao vivo: a cada 2 minutos lê só o que mudou no Bling
 * (filtro de alteração) e usa o resto do tempo nos detalhes. A rodada completa
 * (/api/erp/sincronizar, 15 em 15 min) cuida do resto. Se uma estiver rodando,
 * a outra pula, pela mesma trava.
 */
export async function GET(req: NextRequest) {
  const segredo = process.env.CRON_SECRET;
  const autorizado = segredo
    ? req.headers.get("authorization") === `Bearer ${segredo}`
    : (req.headers.get("user-agent") ?? "").startsWith("vercel-cron");
  if (!autorizado) return NextResponse.json({ ok: false }, { status: 401 });

  return NextResponse.json(await sincronizar({ orcamentoMs: 15_000, entidades: ["pedido_venda"] }));
}
