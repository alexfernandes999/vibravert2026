"use server";

import { prisma } from "@/lib/prisma";
import { cobrar } from "@/lib/mercadopago";

/**
 * Gera de novo o link de pagamento de um pedido parado.
 *
 * O link do Mercado Pago envelhece, e o comprador que abandonou o checkout
 * volta horas ou dias depois. Sem isto, o lembrete levaria a uma página de
 * pagamento vencida — que é pior que não mandar lembrete nenhum.
 *
 * Vale só para pedido aguardando pagamento. Pedido já pago não pode ganhar um
 * link novo: seria abrir a porta para cobrar duas vezes.
 */
export async function retomarPagamento(numero: number) {
  const p = await prisma.pedido.findUnique({
    where: { numero },
    include: { itens: true, cliente: true },
  });

  if (!p) return { ok: false as const, erro: "Pedido não encontrado." };
  if (p.status !== "AGUARDANDO_PAGAMENTO") {
    return { ok: false as const, erro: "Este pedido não está aguardando pagamento." };
  }

  const r = await cobrar({
    metodo: p.metodo,
    valor: Number(p.total),
    parcelas: p.parcelas,
    comprador: {
      nome: p.cliente.nome,
      email: p.cliente.email,
      cpf: p.cliente.cpfCnpj ?? "",
      telefone: p.cliente.telefone ?? undefined,
    },
    itens: p.itens.map((i) => ({
      titulo: i.nomeProduto,
      quantidade: i.quantidade,
      precoUnitario: Number(i.precoUnitario),
      sku: i.skuProduto,
    })),
    pedidoNumero: p.numero,
  });

  if (!r.ok || !r.redirecionar) {
    return { ok: false as const, erro: r.erro ?? "Não foi possível gerar o pagamento." };
  }

  await prisma.pedido.update({
    where: { id: p.id },
    data: { mpPagamentoId: r.pagamentoId, mpStatus: r.status },
  });

  return { ok: true as const, link: r.redirecionar };
}
