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

/**
 * Qual checkout está no ar.
 *
 * `transparente` cobra dentro da loja, pela API Orders · é para onde estamos
 * indo. `pro` manda o comprador para uma página do Mercado Pago e traz de
 * volta, e é o que sustenta a loja enquanto a conta não é liberada para
 * produção. A variável existe para a troca ser um deploy, e a volta também:
 * se o transparente der problema numa sexta à noite, ninguém precisa mexer em
 * código para voltar a vender.
 */
export const MODO = (process.env.MP_MODO ?? "pro").toLowerCase();
/** Paga dentro da loja · o cartão nunca sai da nossa página. */
export const transparente = MODO === "transparente" || MODO === "orders";

const API = "https://api.mercadopago.com";

type Comprador = {
  nome: string;
  email: string;
  cpf: string;
  telefone?: string;
  /** Vai para o Mercado Pago junto com a cobrança: pesa na análise antifraude
   *  e conta na régua de qualidade que libera a conta. */
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
  pagamentoId?: string;
  status?: string;
  /** Checkout Pro: a URL para onde mandar o comprador. */
  redirecionar?: string;
  /** PIX: o código copia-e-cola e o QR em base64. */
  pixCopiaECola?: string;
  pixQrBase64?: string;
  /** Boleto: a URL do documento. */
  boletoUrl?: string;
  erro?: string;
};

async function chamar(
  caminho: string,
  corpo: unknown,
  idempotencia: string,
  cabecalhos?: Record<string, string>,
) {
  const r = await fetch(`${API}${caminho}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
      // Sem esta chave, um clique duplo no botão de pagar vira duas cobranças.
      "X-Idempotency-Key": idempotencia,
      ...(cabecalhos ?? {}),
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
  bandeiraCartao,
  dispositivo,
}: {
  metodo: MetodoPagamento;
  valor: number;
  parcelas: number;
  comprador: Comprador;
  itens: Item[];
  pedidoNumero: number;
  /** Gerado no navegador pelo SDK do MP: o número do cartão nunca chega ao nosso servidor. */
  tokenCartao?: string;
  /** A bandeira, lida no navegador a partir dos seis primeiros dígitos. */
  bandeiraCartao?: string;
  /**
   * Impressão do dispositivo, colhida pelo script do Mercado Pago.
   *
   * Não é rastreamento de marketing · é o que a análise antifraude usa para
   * distinguir um comprador de verdade de um cartão testado em massa. Sem
   * ela, a taxa de aprovação cai, e compra recusada é venda perdida que já
   * estava ganha.
   */
  dispositivo?: string;
}): Promise<Cobranca> {
  if (!configurado) {
    return { ok: false, erro: "sem-credencial" };
  }

  // Três caminhos, uma variável.
  //
  // `pro`          · o comprador paga numa página do Mercado Pago e volta.
  // `transparente` · paga dentro da loja, por /v1/payments. É o Checkout API,
  //                  que é o produto em que a aplicação foi homologada.
  // `orders`       · a API Orders, mais nova. Fica escrita e testada para o dia
  //                  em que migrarmos · hoje não é o produto da aplicação.
  //
  // A volta é tão barata quanto a ida: se o transparente der problema numa
  // sexta à noite, `pro` traz a loja de volta sem tocar em código.
  if (MODO === "orders") {
    const { cobrar: viaOrders } = await import("@/lib/mercadopago-orders");
    const r = await viaOrders({ metodo, valor, parcelas, comprador, itens, pedidoNumero, tokenCartao });
    return {
      ok: r.ok,
      pagamentoId: r.pagamentoId,
      status: r.status,
      pixCopiaECola: r.pixCopiaECola,
      pixQrBase64: r.pixQrBase64,
      boletoUrl: r.boletoUrl,
      erro: r.erro,
    };
  }

  if (MODO === "pro") {
    return await cobrarPorPreferencia({ valor, parcelas, comprador, itens, pedidoNumero, metodo });
  }

  if (metodo === "CARTAO_CREDITO" && !tokenCartao) {
    return { ok: false, erro: "Os dados do cartão não chegaram. Recarregue a página e tente de novo." };
  }

  const meio = metodo === "PIX" ? "pix" : metodo === "BOLETO" ? "bolbradesco" : undefined;
  const fone = (comprador.telefone ?? "").replace(/\D/g, "");

  try {
    const d = await chamar(
      "/v1/payments",
      {
        transaction_amount: Number(valor.toFixed(2)),
        description: `Pedido ${pedidoNumero} · Loja Oficial Vibra Vert`,
        // No cartão quem manda a bandeira é o navegador, que leu os seis
        // primeiros dígitos · adivinhar pelo prefixo aqui erra em bandeira
        // menos comum, e o Mercado Pago recusa sem dizer por quê.
        payment_method_id: meio ?? bandeiraCartao,
        token: tokenCartao,
        installments: metodo === "CARTAO_CREDITO" ? parcelas : 1,
        // O webhook é a fonte da verdade do pagamento — nunca o retorno do navegador,
        // que o comprador pode fechar antes de voltar.
        notification_url: `${process.env.NEXT_PUBLIC_URL}/api/webhooks/mercadopago`,
        external_reference: String(pedidoNumero),
        // Aparece na fatura do cartão. Sem isto a pessoa não reconhece a
        // compra e abre contestação · estorno que se perde sem ter errado.
        statement_descriptor: "VIBRAVERT",
        payer: {
          email: comprador.email,
          first_name: comprador.nome.split(" ")[0],
          last_name: comprador.nome.split(" ").slice(1).join(" ") || undefined,
          identification: { type: comprador.cpf.length > 11 ? "CNPJ" : "CPF", number: comprador.cpf },
          ...(fone.length >= 10
            ? { phone: { area_code: fone.slice(0, 2), number: fone.slice(2) } }
            : {}),
          ...(comprador.endereco
            ? {
                address: {
                  street_name: comprador.endereco.rua,
                  street_number: comprador.endereco.numero,
                  neighborhood: comprador.endereco.bairro,
                  city: comprador.endereco.cidade,
                  federal_unit: comprador.endereco.uf,
                  zip_code: comprador.endereco.cep,
                },
              }
            : {}),
        },
        additional_info: {
          items: itens.map((i) => ({
            id: i.sku,
            title: i.titulo,
            description: i.titulo.slice(0, 250),
            category_id: "home_appliances",
            quantity: i.quantidade,
            unit_price: Number(i.precoUnitario.toFixed(2)),
          })),
          payer: {
            first_name: comprador.nome.split(" ")[0],
            last_name: comprador.nome.split(" ").slice(1).join(" ") || undefined,
            ...(fone.length >= 10
              ? { phone: { area_code: fone.slice(0, 2), number: fone.slice(2) } }
              : {}),
          },
          ...(comprador.endereco
            ? {
                shipments: {
                  receiver_address: {
                    street_name: comprador.endereco.rua,
                    street_number: comprador.endereco.numero,
                    zip_code: comprador.endereco.cep,
                    city_name: comprador.endereco.cidade,
                    state_name: comprador.endereco.uf,
                  },
                },
              }
            : {}),
        },
      },
      `pedido-${pedidoNumero}`,
      dispositivo ? { "X-meli-session-id": dispositivo } : undefined,
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

/**
 * Cria a preferência e devolve o link do checkout.
 *
 * Quem manda no ambiente é a credencial, não a URL: com o token de teste da
 * aplicação, o `init_point` já abre um checkout de teste · nenhum centavo sai
 * de lugar nenhum. Trocar para produção é trocar o MP_ACCESS_TOKEN, e mais
 * nada aqui muda.
 *
 * O `sandbox_init_point` (MP_SANDBOX=1) fica como saída de emergência. O
 * Mercado Pago o mantém no ar mas parou de recomendá-lo, e ele exige estar
 * logado como comprador de teste · pelo caminho normal a pessoa paga como
 * visitante, com cartão de teste, que é o que valida a integração.
 */
async function cobrarPorPreferencia({
  valor,
  parcelas,
  comprador,
  itens,
  pedidoNumero,
  metodo,
}: {
  valor: number;
  parcelas: number;
  comprador: Comprador;
  itens: Item[];
  pedidoNumero: number;
  metodo: string;
}): Promise<Cobranca> {
  const base = process.env.NEXT_PUBLIC_URL || "https://vibravert-loja.vercel.app";

  try {
    const d = await chamar(
      "/checkout/preferences",
      {
        // Categoria e telefone não são obrigatórios, mas entram na nota de
        // qualidade da integração que o Mercado Pago usa para liberar a conta
        // para cobrar de verdade · e são dados que já temos na mão.
        items: itens.map((i) => ({
          id: i.sku,
          title: i.titulo.slice(0, 120),
          description: i.titulo.slice(0, 250),
          category_id: "home_appliances",
          quantity: i.quantidade,
          unit_price: Number(i.precoUnitario.toFixed(2)),
          currency_id: "BRL",
        })),
        payer: {
          name: comprador.nome.split(" ")[0],
          surname: comprador.nome.split(" ").slice(1).join(" ") || undefined,
          email: comprador.email,
          identification: {
            type: comprador.cpf.length > 11 ? "CNPJ" : "CPF",
            number: comprador.cpf,
          },
          ...(comprador.telefone
            ? {
                phone: {
                  area_code: comprador.telefone.replace(/\D/g, "").slice(0, 2),
                  number: comprador.telefone.replace(/\D/g, "").slice(2),
                },
              }
            : {}),
        },
        // O total já traz o frete e o desconto do PIX. Somar de novo aqui
        // cobraria a diferença duas vezes.
        ...(Math.abs(itens.reduce((s, i) => s + i.precoUnitario * i.quantidade, 0) - valor) > 0.01
          ? { marketplace_fee: 0 }
          : {}),
        payment_methods: {
          installments: parcelas,
          // O meio escolhido na loja é o que abre selecionado lá.
          ...(metodo === "PIX"
            ? { excluded_payment_types: [{ id: "credit_card" }, { id: "ticket" }] }
            : metodo === "BOLETO"
              ? { excluded_payment_types: [{ id: "credit_card" }] }
              : {}),
        },
        back_urls: {
          success: `${base}/pedido/${pedidoNumero}`,
          pending: `${base}/pedido/${pedidoNumero}`,
          failure: `${base}/pedido/${pedidoNumero}`,
        },
        auto_return: "approved",
        // O webhook continua sendo a fonte da verdade: o comprador pode
        // fechar a aba antes de voltar, e o pedido não pode ficar no limbo.
        notification_url: `${base}/api/webhooks/mercadopago`,
        external_reference: String(pedidoNumero),
        statement_descriptor: "VIBRAVERT",
      },
      `pref-${pedidoNumero}`,
    );

    const sandbox = process.env.MP_SANDBOX === "1";
    const link = sandbox ? d.sandbox_init_point : d.init_point;
    if (!link) throw new Error("o Mercado Pago não devolveu o link do checkout");

    return { ok: true, pagamentoId: String(d.id), status: "pending", redirecionar: link };
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : "falha ao criar o checkout" };
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
