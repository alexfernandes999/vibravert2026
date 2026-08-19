import type { MetodoPagamento } from "@prisma/client";

/**
 * Checkout Transparente, pela API Orders.
 *
 * A diferença para o Checkout Pro não é técnica, é de lugar: aqui a pessoa
 * paga sem sair da loja. Some o pulo para o Mercado Pago e a volta, que é
 * onde se perde carrinho · quem sai da loja nem sempre volta.
 *
 * O número do cartão nunca chega ao nosso servidor. O SDK do Mercado Pago
 * tokeniza no navegador e o que sobe é um token de uso único. É por isso que
 * `tokenCartao` é obrigatório no cartão e não existe nos outros meios.
 */

const API = "https://api.mercadopago.com";

type Comprador = {
  nome: string;
  email: string;
  cpf: string;
  telefone?: string;
  endereco?: {
    rua: string;
    numero: string;
    bairro?: string;
    cidade: string;
    uf: string;
    cep: string;
  };
};

type Item = { titulo: string; quantidade: number; precoUnitario: number; sku: string };

export type Cobranca = {
  ok: boolean;
  orderId?: string;
  pagamentoId?: string;
  status?: string;
  detalhe?: string;
  /** PIX: o copia-e-cola e o QR, para mostrar dentro da loja. */
  pixCopiaECola?: string;
  pixQrBase64?: string;
  /** Boleto: a URL do documento. */
  boletoUrl?: string;
  erro?: string;
};

const so = (v: string) => v.replace(/\D/g, "");
/** O Mercado Pago quer os valores como string, com dois decimais. */
const dinheiro = (v: number) => v.toFixed(2);

function meioDePagamento(metodo: MetodoPagamento) {
  if (metodo === "PIX") return { id: "pix", type: "bank_transfer" as const };
  if (metodo === "BOLETO") return { id: "bolbradesco", type: "ticket" as const };
  return { id: undefined, type: "credit_card" as const };
}

/**
 * Monta o comprador do jeito que a régua de qualidade do Mercado Pago cobra.
 *
 * Nome, telefone e rua não são obrigatórios para a cobrança passar, mas contam
 * pontos na avaliação da integração · e a avaliação é o que libera a conta
 * para cobrar de verdade. São dados que já pedimos no checkout de qualquer
 * forma: não mandá-los seria jogar fora de graça.
 */
function montarPagador(c: Comprador) {
  const [primeiro, ...resto] = c.nome.trim().split(/\s+/);
  const fone = c.telefone ? so(c.telefone) : "";

  return {
    email: c.email,
    first_name: primeiro,
    last_name: resto.join(" ") || primeiro,
    identification: {
      type: so(c.cpf).length > 11 ? "CNPJ" : "CPF",
      number: so(c.cpf),
    },
    ...(fone.length >= 10
      ? { phone: { area_code: fone.slice(0, 2), number: fone.slice(2) } }
      : {}),
    ...(c.endereco
      ? {
          address: {
            street_name: c.endereco.rua,
            street_number: c.endereco.numero,
            ...(c.endereco.bairro ? { neighborhood: c.endereco.bairro } : {}),
            city: c.endereco.cidade,
            state: c.endereco.uf,
            zip_code: so(c.endereco.cep),
          },
        }
      : {}),
  };
}

export async function cobrar({
  metodo,
  valor,
  parcelas,
  comprador,
  itens,
  pedidoNumero,
  tokenCartao,
}: {
  metodo: MetodoPagamento;
  valor: number;
  parcelas: number;
  comprador: Comprador;
  itens: Item[];
  pedidoNumero: number;
  tokenCartao?: string;
}): Promise<Cobranca> {
  if (!process.env.MP_ACCESS_TOKEN) return { ok: false, erro: "sem-credencial" };

  const meio = meioDePagamento(metodo);
  const cartao = meio.type === "credit_card";
  if (cartao && !tokenCartao) return { ok: false, erro: "sem-token-do-cartao" };

  const base = process.env.NEXT_PUBLIC_URL || "https://vibravert-loja.vercel.app";

  const corpo = {
    type: "online",
    processing_mode: "automatic",
    total_amount: dinheiro(valor),
    external_reference: String(pedidoNumero),
    description: `Pedido ${pedidoNumero} · Loja Oficial Vibra Vert`,
    payer: montarPagador(comprador),
    transactions: {
      payments: [
        {
          amount: dinheiro(valor),
          payment_method: {
            ...(meio.id ? { id: meio.id } : {}),
            type: meio.type,
            ...(cartao
              ? {
                  token: tokenCartao,
                  installments: parcelas,
                  // Aparece na fatura do cartão. Sem isso a pessoa não
                  // reconhece a compra e abre contestação · estorno que a
                  // gente perde sem ter feito nada errado.
                  statement_descriptor: "VIBRAVERT",
                }
              : {}),
          },
        },
      ],
    },
    items: itens.map((i) => ({
      title: i.titulo.slice(0, 120),
      description: i.titulo.slice(0, 250),
      unit_price: dinheiro(i.precoUnitario),
      quantity: i.quantidade,
      external_code: i.sku,
      category_id: "home_appliances",
    })),
    config: { online: { success_url: `${base}/pedido/${pedidoNumero}` } },
  };

  try {
    const r = await fetch(`${API}/v1/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
        // Sem isto, um clique duplo no botão vira duas cobranças.
        "X-Idempotency-Key": `pedido-${pedidoNumero}-${metodo}`,
      },
      body: JSON.stringify(corpo),
      cache: "no-store",
    });

    const d = await r.json();

    if (!r.ok) {
      const detalhe =
        d?.errors?.[0]?.details?.[0] ?? d?.errors?.[0]?.message ?? d?.message ?? `HTTP ${r.status}`;
      return { ok: false, erro: String(detalhe).slice(0, 300) };
    }

    const pg = d?.transactions?.payments?.[0] ?? {};
    const pix = pg?.payment_method?.qr_code ?? pg?.point_of_interaction?.transaction_data?.qr_code;

    return {
      ok: true,
      orderId: d.id,
      pagamentoId: pg.id,
      status: d.status,
      detalhe: d.status_detail,
      pixCopiaECola: pix,
      pixQrBase64:
        pg?.payment_method?.qr_code_base64 ??
        pg?.point_of_interaction?.transaction_data?.qr_code_base64,
      boletoUrl: pg?.payment_method?.ticket_url ?? pg?.transaction_details?.external_resource_url,
    };
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : "falha ao cobrar" };
  }
}

/**
 * Estado da Order → estado do pedido.
 *
 * A Orders usa palavras próprias, diferentes das de `/v1/payments`: aqui
 * `processed` com `accredited` é o dinheiro na conta.
 */
export function statusParaPedido(status: string, detalhe?: string) {
  if (status === "processed") {
    return detalhe === "accredited" ? ("PAGO" as const) : ("AGUARDANDO_PAGAMENTO" as const);
  }
  if (status === "action_required" || status === "created" || status === "at_terminal") {
    return "AGUARDANDO_PAGAMENTO" as const;
  }
  if (status === "refunded") return "REEMBOLSADO" as const;
  return "CANCELADO" as const;
}

/** Consulta uma Order · usada pelo webhook, que só recebe o id. */
export async function consultarOrder(id: string) {
  if (!process.env.MP_ACCESS_TOKEN) return null;
  const r = await fetch(`${API}/v1/orders/${id}`, {
    headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` },
    cache: "no-store",
  });
  return r.ok ? r.json() : null;
}
