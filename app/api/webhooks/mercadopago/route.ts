import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { consultarPagamento, statusParaPedido } from "@/lib/mercadopago";

/**
 * Webhook do Mercado Pago.
 *
 * É a fonte da verdade do pagamento — nunca o retorno do navegador, que o
 * comprador pode fechar antes de voltar para a loja. O aviso traz só o id;
 * o valor e o estado são consultados na API, para que ninguém possa marcar
 * um pedido como pago mandando um POST.
 *
 * Responde 200 mesmo quando não reconhece o evento: um erro aqui faz o
 * Mercado Pago reenviar o aviso por horas.
 */
export async function POST(req: NextRequest) {
  try {
    const corpo = await req.json();
    const id = corpo?.data?.id ?? corpo?.id;
    if (!id || (corpo.type && corpo.type !== "payment")) {
      return NextResponse.json({ ok: true, ignorado: true });
    }

    const pagamento = await consultarPagamento(String(id));
    if (!pagamento) return NextResponse.json({ ok: true, semCredencial: true });

    const numero = Number(pagamento.external_reference);
    if (!Number.isFinite(numero)) return NextResponse.json({ ok: true, semReferencia: true });

    const pedido = await prisma.pedido.findUnique({ where: { numero } });
    if (!pedido) return NextResponse.json({ ok: true, semPedido: true });

    const status = statusParaPedido(pagamento.status);

    await prisma.pedido.update({
      where: { id: pedido.id },
      data: {
        status,
        mpPagamentoId: String(pagamento.id),
        mpStatus: pagamento.status,
        mpDetalhe: pagamento.status_detail ?? null,
        pagoEm: status === "PAGO" ? new Date() : pedido.pagoEm,
      },
    });

    // Baixa de estoque só quando o dinheiro entrou. Reservar no clique
    // deixaria o estoque preso em carrinho abandonado.
    if (status === "PAGO" && pedido.status !== "PAGO") {
      const itens = await prisma.pedidoItem.findMany({ where: { pedidoId: pedido.id } });
      for (const i of itens) {
        await prisma.estoque.updateMany({
          where: { produtoId: i.produtoId },
          data: { quantidade: { decrement: i.quantidade } },
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true, erro: true });
  }
}
