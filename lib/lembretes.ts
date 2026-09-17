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
      { numeroPedido: p.numero },
    ).catch(() => null);
    enviados++;
  }

  enviados += await lembrarCheckouts();
  return { enviados };
}

/**
 * Quem deixou o e-mail no checkout e não finalizou.
 *
 * Duas horas depois, um e-mail só, com um link que remonta o carrinho em
 * qualquer aparelho. Não vai para quem fez qualquer pedido depois de deixar o
 * contato · se o pedido ficou sem pagar, o lembrete dele já cuida disso.
 */
async function lembrarCheckouts() {
  const agora = Date.now();
  const contatos = await prisma.contatoCheckout.findMany({
    where: {
      pedidoId: null,
      lembreteEm: null,
      atualizadoEm: { lte: new Date(agora - 2 * HORA) },
      criadoEm: { gte: new Date(agora - 48 * HORA) },
    },
    take: 20,
  });

  let enviados = 0;
  for (const c of contatos) {
    const trava = await prisma.contatoCheckout.updateMany({
      where: { id: c.id, lembreteEm: null },
      data: { lembreteEm: new Date() },
    });
    if (trava.count === 0) continue;

    const comprou = await prisma.pedido.findFirst({
      where: { cliente: { email: { equals: c.email, mode: "insensitive" } }, criadoEm: { gte: c.criadoEm } },
      select: { id: true },
    });
    if (comprou) {
      await prisma.contatoCheckout.update({ where: { id: c.id }, data: { pedidoId: comprou.id } });
      continue;
    }

    const linhas = (Array.isArray(c.itens) ? c.itens : []) as { id: string; qtd: number }[];
    const produtos = await prisma.produto.findMany({
      where: { id: { in: linhas.map((l) => l.id) }, ativo: true },
      select: { id: true, nome: true, sku: true, preco: true },
    });
    if (!produtos.length) continue;

    const itens = produtos.map((p) => {
      const qtd = linhas.find((l) => l.id === p.id)?.qtd ?? 1;
      return { nome: p.nome, sku: p.sku, qtd, total: Number(p.preco) * qtd };
    });
    const base = process.env.NEXT_PUBLIC_URL || "https://www.vibravert.com.br";
    await carrinhoAbandonado(
      c.email,
      c.nome,
      itens,
      itens.reduce((s, i) => s + i.total, 0),
      { href: `${base}/api/carrinho/voltar/${c.id}` },
    ).catch(() => null);
    enviados++;
  }
  return enviados;
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
