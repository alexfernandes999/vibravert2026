import { prisma } from "@/lib/prisma";
import { carrinhoAbandonado, configurado as emailLigado } from "@/lib/email";
import { consultarPagamento } from "@/lib/mercadopago";

/**
 * Lembrete automático para pedido que ficou sem pagar.
 *
 * Antes o lembrete dependia de alguém abrir "Recuperar vendas" e clicar. Numa
 * loja com poucos pedidos por semana ninguém abre essa tela todo dia, e o
 * lembrete que chega no dia seguinte chega para quem já comprou em outro lugar.
 *
 * Um só por pedido, e só uma vez: a tela de recuperação continua sendo o lugar
 * da ligação e do WhatsApp, que é o que reverte quem passou de um dia.
 *
 * A espera segue a mesma regra da tela: PIX e cartão a partir de duas horas,
 * boleto só depois de quatro dias, porque compensa em até três dias úteis e
 * cobrar antes é cobrar quem já pagou.
 */
const HORA = 36e5;
const JANELAS: Record<string, { de: number; ate: number }> = {
  PIX: { de: 2 * HORA, ate: 48 * HORA },
  CARTAO_CREDITO: { de: 2 * HORA, ate: 48 * HORA },
  BOLETO: { de: 96 * HORA, ate: 144 * HORA },
};

export async function lembretesAutomaticos() {
  if (!emailLigado) return { enviados: 0, motivo: "sem-email" as const };

  const agora = Date.now();
  const candidatos = await prisma.pedido.findMany({
    where: {
      status: "AGUARDANDO_PAGAMENTO",
      lembretes: 0,
      criadoEm: { gte: new Date(agora - 144 * HORA), lte: new Date(agora - 2 * HORA) },
    },
    include: { itens: true, cliente: true },
    take: 20,
  });

  let enviados = 0;
  for (const p of candidatos) {
    const j = JANELAS[p.metodo];
    const idade = agora - p.criadoEm.getTime();
    if (!j || idade < j.de || idade > j.ate) continue;

    // Marca antes de enviar: duas execuções ao mesmo tempo não mandam dois
    // e-mails. Se o envio falhar, o pedido fica sem lembrete · melhor que dois.
    const trava = await prisma.pedido.updateMany({
      where: { id: p.id, lembretes: 0 },
      data: { lembretes: 1, lembreteEm: new Date() },
    });
    if (trava.count === 0) continue;

    // O webhook pode ter se perdido. Cobrar quem já pagou é o pior e-mail
    // que a loja pode mandar, então pergunta ao Mercado Pago antes.
    if (p.mpPagamentoId) {
      const mp = await consultarPagamento(p.mpPagamentoId).catch(() => null);
      if (mp?.status === "approved" || mp?.status === "authorized") continue;
    }

    await carrinhoAbandonado(
      p.cliente.email,
      p.cliente.nome,
      p.itens.map((i) => ({
        nome: i.nomeProduto,
        sku: i.skuProduto,
        qtd: i.quantidade,
        total: Number(i.precoUnitario) * i.quantidade,
      })),
      Number(p.total),
      p.numero,
    ).catch(() => null);
    enviados++;
  }
  return { enviados };
}

/**
 * Roda a varredura de carona nas visitas, no máximo a cada quinze minutos.
 *
 * O plano da Vercel só permite agendamento uma vez por dia, e um lembrete
 * com até 24 horas de atraso perde a hora certa. Com a loja recebendo
 * visitas, a varredura acontece sozinha várias vezes ao dia; o agendamento
 * diário fica como garantia.
 */
let ultima = 0;
export function talvezLembrar() {
  if (Date.now() - ultima < 15 * 60_000) return null;
  ultima = Date.now();
  return lembretesAutomaticos().catch(() => null);
}
