import type { Pedido, PedidoItem, Endereco, Cliente } from "@prisma/client";
import { montar, brl, type Peca } from "@/lib/email-molde";

/**
 * E-mails da loja.
 *
 * Como o pagamento e o frete, esta camada declara quando não está configurada
 * em vez de estourar. Sem chave, o envio vai para o log e a compra segue: um
 * erro de e-mail nunca pode derrubar um pedido já pago.
 *
 * O remetente precisa de SPF e DKIM no domínio. Atenção: o e-mail da Vibra
 * Vert está na Locaweb, então os registros novos entram AO LADO dos que já
 * existem. Trocar o SPF em vez de acrescentar derruba o e-mail da empresa.
 */
export const configurado = Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_REMETENTE);

type PedidoCompleto = Pedido & { itens: PedidoItem[]; endereco: Endereco; cliente: Cliente };

const base = () => process.env.NEXT_PUBLIC_URL ?? "https://www.vibravert.com.br";

const pecas = (p: PedidoCompleto): Peca[] =>
  p.itens.map((i) => ({
    nome: i.nomeProduto,
    sku: i.skuProduto,
    qtd: i.quantidade,
    total: Number(i.precoUnitario) * i.quantidade,
  }));

const resumo = (p: PedidoCompleto) => [
  { rotulo: "Subtotal", valor: brl(p.subtotal) },
  { rotulo: "Frete", valor: Number(p.frete) === 0 ? "Grátis" : brl(p.frete) },
  ...(Number(p.desconto) > 0 ? [{ rotulo: "Desconto", valor: `− ${brl(p.desconto)}` }] : []),
  { rotulo: "Total", valor: brl(p.total), forte: true },
];

const entrega = (p: PedidoCompleto) => [
  p.cliente.nome,
  `${p.endereco.logradouro}, ${p.endereco.numero}${p.endereco.complemento ? ` · ${p.endereco.complemento}` : ""}`,
  `${p.endereco.bairro} · ${p.endereco.cidade}/${p.endereco.uf} · CEP ${p.endereco.cep}`,
];

async function enviar(para: string, assunto: string, html: string) {
  if (!configurado) {
    console.info(`[email] não enviado, sem RESEND_API_KEY → ${para}: ${assunto}`);
    return { ok: false, motivo: "sem-credencial" as const };
  }
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: process.env.EMAIL_REMETENTE, to: para, subject: assunto, html }),
    });
    if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
    return { ok: true as const };
  } catch (e) {
    console.error("[email] falhou:", e);
    return { ok: false, motivo: "falha" as const };
  }
}

/** 1. Pedido recebido, antes do pagamento cair. */
export function pedidoRecebido(p: PedidoCompleto) {
  const comoPagar =
    p.metodo === "PIX"
      ? {
          titulo: "Pague com PIX para liberar na hora",
          corpo: "Assim que o PIX for confirmado, o que costuma levar segundos, o pedido entra em separação.",
          tom: "azul" as const,
        }
      : p.metodo === "BOLETO"
        ? {
            titulo: "Aguardando o boleto",
            corpo: "O pedido entra em separação assim que o boleto for compensado, o que leva até dois dias úteis.",
            tom: "azul" as const,
          }
        : {
            titulo: "Confirmando com a operadora",
            corpo: "Estamos aguardando a aprovação do cartão. Avisamos assim que sair.",
            tom: "azul" as const,
          };

  return enviar(
    p.cliente.email,
    `Recebemos o seu pedido nº ${p.numero}`,
    montar({
      etiqueta: `Pedido ${p.numero}`,
      titulo: `Obrigada, ${p.cliente.nome.split(" ")[0]}!`,
      texto: ["Seu pedido chegou aqui na fábrica e já está registrado."],
      aviso: comoPagar,
      itens: pecas(p),
      resumo: resumo(p),
      botao: { rotulo: "Acompanhar meu pedido", href: `${base()}/pedido/${p.numero}` },
      entrega: entrega(p),
      assinatura: true,
    }),
  );
}

/** 2. Pagamento confirmado. */
export function pagamentoConfirmado(p: PedidoCompleto) {
  return enviar(
    p.cliente.email,
    `Pagamento confirmado, pedido nº ${p.numero}`,
    montar({
      etiqueta: "Pagamento aprovado",
      titulo: "Pagamento confirmado",
      texto: [
        `Tudo certo, ${p.cliente.nome.split(" ")[0]}. Seu pedido entrou em separação.`,
        "Sai da nossa fábrica em até 24 horas úteis, e avisamos com o código de rastreio assim que despachar.",
      ],
      aviso: {
        titulo: "Guarde a caixa fechada até conferir",
        corpo: "A nota fiscal e o certificado de garantia vêm dentro. São eles que valem na hora de acionar a garantia.",
        tom: "bom",
      },
      itens: pecas(p),
      resumo: resumo(p),
      botao: { rotulo: "Ver o pedido", href: `${base()}/pedido/${p.numero}` },
      entrega: entrega(p),
      assinatura: true,
    }),
  );
}

/** 3. Despachado. */
export function pedidoEnviado(p: PedidoCompleto) {
  return enviar(
    p.cliente.email,
    `Seu pedido nº ${p.numero} saiu para entrega`,
    montar({
      etiqueta: "A caminho",
      titulo: "Sua bomba saiu da fábrica",
      texto: [
        p.rastreio
          ? `O código de rastreio é <strong>${p.rastreio}</strong>.`
          : "O pedido foi despachado e está a caminho do seu endereço.",
      ],
      aviso: {
        titulo: "Antes de instalar",
        corpo: "Confira a bitola do cabo para a distância do poço. Cabo fino demais derruba a tensão e a bomba não parte, e isso não é defeito.",
        tom: "azul",
      },
      itens: pecas(p),
      botao: { rotulo: "Acompanhar a entrega", href: `${base()}/pedido/${p.numero}` },
      entrega: entrega(p),
      assinatura: true,
    }),
  );
}

/**
 * 4. Carrinho abandonado.
 *
 * Um só, e sem desconto. Mandar cupom para quem abandonou ensina o cliente a
 * abandonar o carrinho para ganhar desconto, e o segundo lembrete é o que
 * transforma a loja em remetente de spam.
 */
export function carrinhoAbandonado(
  email: string,
  nome: string | null,
  itens: Peca[],
  total: number,
) {
  return enviar(
    email,
    "Você deixou uma bomba no carrinho",
    montar({
      etiqueta: "Seu carrinho",
      titulo: nome ? `${nome.split(" ")[0]}, ficou algo para trás` : "Ficou algo para trás",
      texto: [
        "Guardamos o seu carrinho. Se ainda faz sentido, é só continuar de onde parou.",
        "Se ficou alguma dúvida sobre qual modelo serve no seu poço, me chama: eu respondo.",
      ],
      aviso: {
        titulo: "Ainda em dúvida sobre o modelo?",
        corpo: "A calculadora mostra quanto cada bomba entrega na altura da sua instalação, e não só a vazão máxima do catálogo.",
        tom: "azul",
      },
      itens,
      resumo: [{ rotulo: "Total", valor: brl(total), forte: true }],
      botao: { rotulo: "Voltar ao meu carrinho", href: `${base()}/carrinho` },
      assinatura: true,
    }),
  );
}
