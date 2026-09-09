import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";

/**
 * Pixel, GTM e API de Conversões.
 *
 * As chaves vivem no banco e não no ambiente. Quem cuida do tráfego troca um
 * pixel numa terça de manhã e precisa que valha na hora · e no Vercel uma
 * variável NEXT_PUBLIC marcada como sensível nem chega ao build, deixando a
 * tela sem o id sem nenhum erro que explique.
 */

export type Config = {
  pixelMeta: string | null;
  gtmId: string | null;
  temToken: boolean;
  ativo: boolean;
};

/** O que pode aparecer no HTML. O token nunca entra aqui. */
export async function configPublica(): Promise<Config> {
  try {
    const m = await prisma.marketing.findUnique({ where: { id: "unico" } });
    if (!m || !m.ativo) return { pixelMeta: null, gtmId: null, temToken: false, ativo: false };
    return {
      pixelMeta: m.pixelMeta || null,
      gtmId: m.gtmId || null,
      temToken: Boolean(m.tokenCapi),
      ativo: m.ativo,
    };
  } catch {
    // Sem banco a loja continua vendendo · rastreio não é essencial.
    return { pixelMeta: null, gtmId: null, temToken: false, ativo: false };
  }
}

const sha = (v: string) => createHash("sha256").update(v.trim().toLowerCase()).digest("hex");
const so = (v: string) => v.replace(/\D/g, "");

/**
 * Manda a compra pela API de Conversões, do servidor.
 *
 * O pixel do navegador perde venda: iPhone, bloqueador, aba fechada antes da
 * hora. Este é o sinal confiável, e é o que a campanha usa para aprender.
 *
 * O `event_id` é o número do pedido, o MESMO que o navegador manda. Sem isso a
 * mesma venda conta duas vezes e a campanha otimiza com um número inventado.
 *
 * Os dados da pessoa vão em SHA-256 · nunca em texto claro. É exigência do
 * Meta e é o mínimo decente.
 *
 * Nunca estoura. Quem chama é o webhook do pagamento, e um erro aqui faria o
 * Mercado Pago reenviar o aviso por horas por causa de uma métrica.
 */
export async function compraNoMeta(p: {
  pedidoNumero: number;
  valor: number;
  itens: { sku: string; quantidade: number; precoUnitario: number }[];
  email?: string | null;
  telefone?: string | null;
  nome?: string | null;
  cidade?: string | null;
  uf?: string | null;
  cep?: string | null;
  ip?: string | null;
  navegador?: string | null;
}) {
  let m;
  try {
    m = await prisma.marketing.findUnique({ where: { id: "unico" } });
  } catch {
    return { ok: false as const, motivo: "sem-banco" as const };
  }
  if (!m?.ativo || !m.pixelMeta || !m.tokenCapi) {
    return { ok: false as const, motivo: "sem-config" as const };
  }

  const [primeiro, ...resto] = (p.nome ?? "").trim().split(/\s+/);
  const pessoa: Record<string, string[] | string> = {};
  if (p.email) pessoa.em = [sha(p.email)];
  if (p.telefone) pessoa.ph = [sha(`55${so(p.telefone)}`)];
  if (primeiro) pessoa.fn = [sha(primeiro)];
  if (resto.length) pessoa.ln = [sha(resto.join(" "))];
  if (p.cidade) pessoa.ct = [sha(p.cidade.replace(/\s/g, ""))];
  if (p.uf) pessoa.st = [sha(p.uf)];
  if (p.cep) pessoa.zp = [sha(so(p.cep))];
  pessoa.country = [sha("br")];
  if (p.ip) pessoa.client_ip_address = p.ip;
  if (p.navegador) pessoa.client_user_agent = p.navegador;

  const corpo = {
    data: [
      {
        event_name: "Purchase",
        event_time: Math.floor(Date.now() / 1000),
        // O mesmo id do navegador · é isto que evita contar a venda em dobro.
        event_id: String(p.pedidoNumero),
        action_source: "website",
        event_source_url: `${process.env.NEXT_PUBLIC_URL ?? ""}/pedido/${p.pedidoNumero}`,
        user_data: pessoa,
        custom_data: {
          currency: "BRL",
          value: Number(p.valor.toFixed(2)),
          content_type: "product",
          contents: p.itens.map((i) => ({
            id: i.sku,
            quantity: i.quantidade,
            item_price: Number(i.precoUnitario.toFixed(2)),
          })),
          content_ids: p.itens.map((i) => i.sku),
          num_items: p.itens.reduce((s, i) => s + i.quantidade, 0),
        },
      },
    ],
    ...(m.testeCapi ? { test_event_code: m.testeCapi } : {}),
  };

  try {
    const r = await fetch(
      `https://graph.facebook.com/v21.0/${m.pixelMeta}/events?access_token=${m.tokenCapi}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(corpo),
        cache: "no-store",
      },
    );
    const d = await r.json().catch(() => ({}));
    if (!r.ok) {
      console.error("[capi] recusado:", JSON.stringify(d).slice(0, 300));
      return { ok: false as const, motivo: "recusado" as const };
    }
    return { ok: true as const, recebidos: d.events_received ?? 0 };
  } catch (e) {
    console.error("[capi] falhou:", e instanceof Error ? e.message : e);
    return { ok: false as const, motivo: "falha" as const };
  }
}
