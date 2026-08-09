import type { MetodoPagamento } from "@prisma/client";

/**
 * Camada de pagamento do Mercado Pago.
 *
 * Está escrita inteira, mas não há credencial ainda. Em vez de falhar com um
 * erro de biblioteca no meio do checkout, o módulo declara isso: `configurado`
 * diz se dá para cobrar, e o checkout mostra o pedido registrado com uma
 * mensagem honesta em vez de fingir que processou.
 *
 * Quando a credencial chegar, é só preencher MP_ACCESS_TOKEN — nada aqui muda.
 */

export const configurado = Boolean(process.env.MP_ACCESS_TOKEN);

const API = "https://api.mercadopago.com";

type Comprador = { nome: string; email: string; cpf: string; telefone?: string };
type Item = { titulo: string; quantidade: number; precoUnitario: number; sku: string };

export type Cobranca = {
  ok: boolean;
  pagamentoId?: string;
  status?: string;
  /** PIX: o código copia-e-cola e o QR em base64. */
  pixCopiaECola?: string;
  pixQrBase64?: string;
  /** Boleto: a URL do documento. */
  boletoUrl?: string;
  erro?: string;
};

async function chamar(caminho: string, corpo: unknown, idempotencia: string) {
  const r = await fetch(`${API}${caminho}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
      // Sem esta chave, um clique duplo no botão de pagar vira duas cobranças.
      "X-Idempotency-Key": idempotencia,
    },
    body: JSON.stringify(corpo),
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d.message ?? `Mercado Pago respondeu ${r.status}`);
  return d;
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
  /** Gerado no navegador pelo SDK do MP: o número do cartão nunca chega ao nosso servidor. */
  tokenCartao?: string;
}): Promise<Cobranca> {
  if (!configurado) {
    return { ok: false, erro: "sem-credencial" };
  }

  const meio = metodo === "PIX" ? "pix" : metodo === "BOLETO" ? "bolbradesco" : undefined;

  try {
    const d = await chamar(
      "/v1/payments",
      {
        transaction_amount: Number(valor.toFixed(2)),
        description: `Pedido ${pedidoNumero} · Loja Oficial Vibra Vert`,
        payment_method_id: meio,
        token: tokenCartao,
        installments: metodo === "CARTAO_CREDITO" ? parcelas : 1,
        // O webhook é a fonte da verdade do pagamento — nunca o retorno do navegador,
        // que o comprador pode fechar antes de voltar.
        notification_url: `${process.env.NEXT_PUBLIC_URL}/api/webhooks/mercadopago`,
        external_reference: String(pedidoNumero),
        payer: {
          email: comprador.email,
          first_name: comprador.nome.split(" ")[0],
          last_name: comprador.nome.split(" ").slice(1).join(" ") || undefined,
          identification: { type: comprador.cpf.length > 11 ? "CNPJ" : "CPF", number: comprador.cpf },
        },
        additional_info: {
          items: itens.map((i) => ({
            id: i.sku,
            title: i.titulo,
            quantity: i.quantidade,
            unit_price: Number(i.precoUnitario.toFixed(2)),
          })),
        },
      },
      `pedido-${pedidoNumero}`,
    );

    const tx = d.point_of_interaction?.transaction_data;
    return {
      ok: true,
      pagamentoId: String(d.id),
      status: d.status,
      pixCopiaECola: tx?.qr_code,
      pixQrBase64: tx?.qr_code_base64,
      boletoUrl: d.transaction_details?.external_resource_url,
    };
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : "falha ao cobrar" };
  }
}

/** Estado do pagamento no Mercado Pago → estado do pedido na loja. */
export function statusParaPedido(status: string) {
  switch (status) {
    case "approved":
      return "PAGO" as const;
    case "in_process":
    case "pending":
    case "authorized":
      return "AGUARDANDO_PAGAMENTO" as const;
    case "refunded":
    case "charged_back":
      return "REEMBOLSADO" as const;
    default:
      return "CANCELADO" as const;
  }
}

/** Consulta um pagamento — usada pelo webhook, que só recebe o id. */
export async function consultarPagamento(id: string) {
  if (!configurado) return null;
  const r = await fetch(`${API}/v1/payments/${id}`, {
    headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` },
    cache: "no-store",
  });
  return r.ok ? r.json() : null;
}
