import { createHmac, timingSafeEqual } from "node:crypto";
import { after, NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { atualizarUm } from "@/lib/erp/espelho";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Avisos do Bling (webhooks da API v3): pedido de venda, produto e estoque.
 * Com eles o espelho fica ao vivo; o cron de 15 em 15 min vira só a rede de
 * segurança para aviso perdido.
 *
 * Segurança: o aviso só serve para dizer QUAL registro mudou · o registro é
 * relido da API do Bling, nunca gravado a partir do corpo do aviso. Quando o
 * Bling assina (X-Bling-Signature-256, HMAC-SHA256 com o client secret), a
 * assinatura é conferida e aviso com assinatura errada é recusado.
 */

const RECURSO: Record<string, "pedido_venda" | "produto" | "saldo"> = {
  order: "pedido_venda",
  product: "produto",
  stock: "saldo",
};

function assinaturaOk(corpo: string, cabecalho: string | null) {
  if (!cabecalho) return null; // sem assinatura: aceito, mas só como "releia o id"
  const segredo = process.env.BLING_CLIENT_SECRET;
  if (!segredo) return false;
  const esperado = createHmac("sha256", segredo).update(corpo).digest("hex");
  const recebido = cabecalho.replace(/^sha256=/, "");
  const a = Buffer.from(esperado), b = Buffer.from(recebido);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: NextRequest) {
  const corpo = await req.text();
  if (assinaturaOk(corpo, req.headers.get("x-bling-signature-256")) === false)
    return NextResponse.json({ ok: false }, { status: 401 });

  let ev: { event?: string; data?: { id?: number | string; produto?: { id?: number | string } } };
  try {
    ev = JSON.parse(corpo);
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const [recurso, acao] = String(ev.event ?? "").split(".");
  const entidade = RECURSO[recurso ?? ""];
  const id = String((entidade === "saldo" ? ev.data?.produto?.id : undefined) ?? ev.data?.id ?? "");

  // Responde já (o Bling espera resposta rápida) e relê o registro depois.
  after(async () => {
    let erro: string | null = null;
    try {
      if (entidade && id) await atualizarUm(entidade, id, acao === "deleted");
    } catch (e) {
      erro = e instanceof Error ? e.message.slice(0, 300) : "falha";
    }
    // Contador de avisos, para a tela do ERP mostrar que o ao vivo está chegando.
    await prisma.fonteBling
      .upsert({
        where: { entidade: "__webhook" },
        create: { entidade: "__webhook", registros: 1, erro: erro ?? `${ev.event} ${id}`, erroEm: new Date() },
        update: { registros: { increment: 1 }, erro: erro ? `ERRO ${ev.event} ${id}: ${erro}` : `${ev.event} ${id}`, erroEm: new Date() },
      })
      .catch(() => {});
  });
  return NextResponse.json({ ok: true });
}
