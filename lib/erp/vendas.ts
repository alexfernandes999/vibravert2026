import { prisma } from "@/lib/prisma";

/**
 * Painel de vendas · o "Dashboard Mensal" do Bling, refeito sobre o espelho
 * (erp.espelho_bling). Lê só o banco: abrir o painel não gasta chamada do Bling.
 *
 * Período pela data do pedido (`resumo.data`), situações escolhidas na tela
 * (padrão: em aberto, atendido e em andamento · cancelado fica de fora) e canal
 * agrupado por marketplace a partir do tipo do canal de venda no Bling.
 */

export const CANAIS_PAINEL = ["Mercado Livre", "Shopee", "Magalu", "Amazon", "Outros"] as const;
export type CanalPainel = (typeof CANAIS_PAINEL)[number];

const TIPO: Record<string, CanalPainel> = {
  MercadoLivre: "Mercado Livre",
  Shopee: "Shopee",
  IntegraCommerce: "Magalu",
  Amazon: "Amazon",
};

export const SITUACOES = [
  { id: 6, r: "Em aberto" },
  { id: 9, r: "Atendido" },
  { id: 15, r: "Em andamento" },
  { id: 12, r: "Cancelado" },
] as const;
export const SITUACOES_PADRAO = [6, 9, 15];

export type FiltroVendas = { de: string; ate: string; canal: CanalPainel | null; situacoes: number[] };

type Totais = { pedidos: number; valor: number; pecas: number; comDetalhe: number };

const diaISO = (d: Date) => d.toISOString().slice(0, 10);
const somarDias = (iso: string, n: number) => {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return diaISO(d);
};
const diasEntre = (a: string, b: string) => Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 86_400_000);

/** Lojas (canais do Bling) de cada marketplace. */
async function lojasPorCanal() {
  const c = await prisma.espelhoBling.findMany({ where: { entidade: "canal_venda" }, select: { blingId: true, codigo: true, resumo: true } });
  return c.map((x) => ({
    id: x.blingId,
    nome: x.codigo ?? x.blingId,
    canal: TIPO[(x.resumo as { tipo?: string } | null)?.tipo ?? ""] ?? ("Outros" as CanalPainel),
  }));
}

async function totais(de: string, ate: string, lojas: string[] | null, situacoes: number[]): Promise<Totais> {
  const [r] = await prisma.$queryRaw<{ pedidos: bigint; valor: number | null; pecas: number | null; com_detalhe: bigint }[]>`
    SELECT count(*) AS pedidos,
           sum((resumo->>'total')::numeric)::float AS valor,
           sum((SELECT sum((i->>'quantidade')::numeric) FROM jsonb_array_elements(dados->'itens') i))::float AS pecas,
           count(*) FILTER (WHERE dados IS NOT NULL) AS com_detalhe
      FROM "erp"."espelho_bling"
     WHERE entidade = 'pedido_venda'
       AND resumo->>'data' BETWEEN ${de} AND ${ate}
       AND (resumo->'situacao'->>'id')::int = ANY(${situacoes}::int[])
       AND (${lojas}::text[] IS NULL OR resumo->'loja'->>'id' = ANY(${lojas}::text[]))`;
  return { pedidos: Number(r?.pedidos ?? 0), valor: r?.valor ?? 0, pecas: r?.pecas ?? 0, comDetalhe: Number(r?.com_detalhe ?? 0) };
}

export async function painelVendas(f: FiltroVendas) {
  const lojas = await lojasPorCanal();
  const canalDe = new Map(lojas.map((l) => [l.id, l]));
  const filtroLojas = f.canal ? lojas.filter((l) => l.canal === f.canal).map((l) => l.id) : null;
  const situacoes = f.situacoes.length ? f.situacoes : SITUACOES_PADRAO;

  // Período anterior do mesmo tamanho, logo antes.
  const n = diasEntre(f.de, f.ate) + 1;
  const antAte = somarDias(f.de, -1);
  const antDe = somarDias(f.de, -n);

  const [atual, anterior, porDia, porLoja, produtos, fonte] = await Promise.all([
    totais(f.de, f.ate, filtroLojas, situacoes),
    totais(antDe, antAte, filtroLojas, situacoes),
    prisma.$queryRaw<{ dia: string; loja: string | null; pedidos: bigint; valor: number }[]>`
      SELECT resumo->>'data' AS dia, resumo->'loja'->>'id' AS loja, count(*) AS pedidos, sum((resumo->>'total')::numeric)::float AS valor
        FROM "erp"."espelho_bling"
       WHERE entidade = 'pedido_venda'
         AND resumo->>'data' BETWEEN ${f.de} AND ${f.ate}
         AND (resumo->'situacao'->>'id')::int = ANY(${situacoes}::int[])
         AND (${filtroLojas}::text[] IS NULL OR resumo->'loja'->>'id' = ANY(${filtroLojas}::text[]))
       GROUP BY 1, 2`,
    prisma.$queryRaw<{ loja: string | null; pedidos: bigint; valor: number }[]>`
      SELECT resumo->'loja'->>'id' AS loja, count(*) AS pedidos, sum((resumo->>'total')::numeric)::float AS valor
        FROM "erp"."espelho_bling"
       WHERE entidade = 'pedido_venda'
         AND resumo->>'data' BETWEEN ${f.de} AND ${f.ate}
         AND (resumo->'situacao'->>'id')::int = ANY(${situacoes}::int[])
         AND (${filtroLojas}::text[] IS NULL OR resumo->'loja'->>'id' = ANY(${filtroLojas}::text[]))
       GROUP BY 1
       ORDER BY 3 DESC`,
    prisma.$queryRaw<{ codigo: string | null; descricao: string | null; pecas: number; valor: number; pedidos: bigint }[]>`
      SELECT i->>'codigo' AS codigo, max(i->>'descricao') AS descricao,
             sum((i->>'quantidade')::numeric)::float AS pecas,
             sum((i->>'quantidade')::numeric * (i->>'valor')::numeric)::float AS valor,
             count(DISTINCT e.id) AS pedidos
        FROM "erp"."espelho_bling" e, jsonb_array_elements(e.dados->'itens') i
       WHERE e.entidade = 'pedido_venda'
         AND e.resumo->>'data' BETWEEN ${f.de} AND ${f.ate}
         AND (e.resumo->'situacao'->>'id')::int = ANY(${situacoes}::int[])
         AND (${filtroLojas}::text[] IS NULL OR e.resumo->'loja'->>'id' = ANY(${filtroLojas}::text[]))
       GROUP BY 1
       ORDER BY 3 DESC
       LIMIT 12`,
    // Último registro de pedido gravado (pelo cron ou por aviso ao vivo) e último aviso recebido.
    Promise.all([
      prisma.espelhoBling.aggregate({ where: { entidade: "pedido_venda" }, _max: { lidoEm: true } }),
      prisma.fonteBling.findUnique({ where: { entidade: "__webhook" }, select: { erroEm: true, registros: true } }),
    ]),
  ]);

  // Série diária, um ponto por dia do período (dia sem venda = zero), por canal.
  const dias: { dia: string; porCanal: Record<CanalPainel, { pedidos: number; valor: number }> }[] = [];
  for (let i = 0; i < n; i++) {
    const dia = somarDias(f.de, i);
    dias.push({ dia, porCanal: Object.fromEntries(CANAIS_PAINEL.map((c) => [c, { pedidos: 0, valor: 0 }])) as Record<CanalPainel, { pedidos: number; valor: number }> });
  }
  const indice = new Map(dias.map((d, i) => [d.dia, i]));
  for (const r of porDia) {
    const i = indice.get(r.dia);
    if (i === undefined) continue;
    const c = canalDe.get(r.loja ?? "")?.canal ?? "Outros";
    dias[i]!.porCanal[c].pedidos += Number(r.pedidos);
    dias[i]!.porCanal[c].valor += r.valor ?? 0;
  }

  return {
    periodo: { de: f.de, ate: f.ate, dias: n, anterior: { de: antDe, ate: antAte } },
    atual,
    anterior,
    dias,
    porLoja: porLoja.map((l) => {
      const info = canalDe.get(l.loja ?? "");
      return { nome: info?.nome ?? "Sem canal", canal: info?.canal ?? ("Outros" as CanalPainel), pedidos: Number(l.pedidos), valor: l.valor ?? 0 };
    }),
    produtos: produtos.map((p) => ({ codigo: p.codigo, descricao: p.descricao ?? p.codigo ?? "—", pecas: p.pecas, valor: p.valor, pedidos: Number(p.pedidos) })),
    lidoEm: fonte[0]._max.lidoEm ?? null,
    ultimoAviso: fonte[1]?.erroEm ?? null,
  };
}

export type PainelVendas = Awaited<ReturnType<typeof painelVendas>>;
