import { createHash } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { chamar } from "@/lib/bling";

/**
 * ERP · fase 1: espelho do Bling.
 *
 * Só lê. Nada aqui escreve no Bling, e é assim até a fase 2: o critério de
 * saída é o ERP bater com o Bling por duas semanas, e um espelho que também
 * escreve não prova nada.
 *
 * Cada fonte é varrida em páginas. A varredura guarda onde parou e continua na
 * chamada seguinte, então cabe no limite de tempo da Vercel e sobrevive a uma
 * queda no meio. A primeira carga (o ano inteiro) roda do computador, pelo
 * script `prisma/espelho.mts`, que não tem limite de tempo.
 */

type Item = Record<string, unknown> & { id?: number | string };

type Janela = [string, string];

type Fonte = {
  entidade: string;
  rotulo: string;
  /**
   * Caminho da listagem. `desde` vem preenchido nas leituras incrementais;
   * `janela` (início e fim, AAAA-MM-DD) na varredura completa por períodos.
   */
  lista: (pagina: number, desde: Date | null, janela: Janela | null) => string;
  /**
   * Períodos da varredura completa. O Bling só filtra data com início E fim,
   * e um período muito longo é recusado: lê-se mês a mês.
   */
  janelas?: () => Janela[];
  /** Aceita filtro por data de alteração: depois da 1ª carga, lê só o que mudou. */
  incremental?: boolean;
  codigo?: (x: Item) => string | null;
  /** Caminho do detalhe, para quem precisa (itens do pedido, estrutura). */
  detalhe?: (id: string) => string;
  precisaDetalhe?: (x: Item) => boolean;
  /** De quanto em quanto tempo vale começar uma varredura nova. */
  intervaloMin: number;
};

const LIMITE = 100;
/** Datas no formato que o Bling pede nos filtros. */
const dia = (d: Date) => d.toISOString().slice(0, 10);
/** Primeira carga de pedidos: o ano corrente, como o painel do Alex. */
const INICIO_HISTORICO = "2026-01-01";

const pag = (pagina: number) => `pagina=${pagina}&limite=${LIMITE}`;
/** Data e hora no formato dos filtros de alteração do Bling. */
const momento = (d: Date) => encodeURIComponent(d.toISOString().slice(0, 19).replace("T", " "));

/** Meses de `de` (AAAA-MM) até `mesesAFrente` depois do atual. */
function meses(de: string, mesesAFrente = 0): Janela[] {
  const r: Janela[] = [];
  const [a, m] = de.split("-").map(Number);
  const fim = new Date();
  fim.setUTCMonth(fim.getUTCMonth() + mesesAFrente);
  for (let d = new Date(Date.UTC(a!, m! - 1, 1)); d <= fim; d.setUTCMonth(d.getUTCMonth() + 1)) {
    const ultimo = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0));
    r.push([dia(d), dia(ultimo)]);
  }
  return r;
}
const str = (v: unknown) => (v === null || v === undefined || v === "" ? null : String(v));

export const FONTES: Fonte[] = [
  {
    entidade: "deposito",
    rotulo: "Depósitos",
    lista: (p) => `/depositos?${pag(p)}`,
    codigo: (x) => str(x.descricao),
    intervaloMin: 24 * 60,
  },
  {
    entidade: "canal_venda",
    rotulo: "Canais de venda",
    lista: (p) => `/canais-venda?${pag(p)}`,
    codigo: (x) => str(x.descricao),
    intervaloMin: 24 * 60,
  },
  {
    entidade: "produto",
    rotulo: "Produtos e estruturas",
    // criterio=5: todos, inclusive inativos · o histórico de venda cita produto
    // que hoje está desligado.
    // O filtro de alteração de produto não filtra de verdade (testado em 12/11): relê tudo, são poucas páginas.
    lista: (p) => `/produtos?${pag(p)}&criterio=5`,
    codigo: (x) => str(x.codigo),
    detalhe: (id) => `/produtos/${id}`,
    // Estrutura (bomba → caneca → componentes, kit e combo) só vem no detalhe.
    precisaDetalhe: (x) => x.formato === "E",
    intervaloMin: 60,
  },
  {
    entidade: "pedido_venda",
    rotulo: "Pedidos de venda",
    // Primeira carga mês a mês; depois, só o que mudou (alteração com início e fim).
    lista: (p, desde, j) =>
      desde
        ? `/pedidos/vendas?${pag(p)}&dataAlteracaoInicial=${momento(desde)}&dataAlteracaoFinal=${momento(new Date())}`
        : `/pedidos/vendas?${pag(p)}&dataInicial=${j![0]}&dataFinal=${j![1]}`,
    janelas: () => meses(INICIO_HISTORICO.slice(0, 7)),
    incremental: true,
    codigo: (x) => str(x.numero),
    detalhe: (id) => `/pedidos/vendas/${id}`,
    precisaDetalhe: () => true,
    intervaloMin: 0,
  },
  {
    entidade: "pedido_compra",
    rotulo: "Pedidos de compra",
    lista: (p) => `/pedidos/compras?${pag(p)}`,
    codigo: (x) => str(x.numero),
    detalhe: (id) => `/pedidos/compras/${id}`,
    precisaDetalhe: () => true,
    intervaloMin: 60,
  },
  {
    entidade: "ordem_producao",
    rotulo: "Ordens de produção e montagem",
    lista: (p) => `/ordens-producao?${pag(p)}`,
    codigo: (x) => str(x.numero),
    detalhe: (id) => `/ordens-producao/${id}`,
    precisaDetalhe: () => true,
    intervaloMin: 30,
  },
  {
    entidade: "conta_pagar",
    rotulo: "Contas a pagar",
    // Por mês de vencimento: do começo do ano até seis meses à frente.
    lista: (p, _d, j) => `/contas/pagar?${pag(p)}&tipoFiltroData=V&dataInicial=${j![0]}&dataFinal=${j![1]}`,
    janelas: () => meses(INICIO_HISTORICO.slice(0, 7), 6),
    codigo: (x) => str(x.numeroDocumento ?? x.id),
    intervaloMin: 6 * 60,
  },
  // Contas a receber ficam para a fase 3 (conciliação): são mais de 60 mil
  // títulos em aberto no Bling, a maioria repasse de marketplace nunca baixado.
];

/** Saldo não tem listagem: sai dos produtos, em lotes, pela API de estoques. */
export const SALDO = { entidade: "saldo", rotulo: "Saldos por depósito", lote: 50, intervaloMin: 15 };

const hash = (x: unknown) => createHash("sha1").update(JSON.stringify(x)).digest("hex");

/**
 * Grava uma página da listagem numa operação só (uma ida ao banco por página,
 * não uma por registro). Devolve quantos mudaram de fato.
 */
async function gravar(f: Fonte, itens: Item[]) {
  const linhas = itens.map((x) => ({
    blingId: String(x.id),
    codigo: f.codigo?.(x) ?? null,
    resumo: x,
    hash: hash(x),
    pendente: Boolean(f.detalhe && f.precisaDetalhe?.(x)),
  }));
  const r = await prisma.$queryRaw<{ mudaram: bigint }[]>`
    WITH v AS (
      SELECT * FROM jsonb_to_recordset(${JSON.stringify(linhas)}::jsonb)
        AS x("blingId" text, codigo text, resumo jsonb, hash text, pendente boolean)
    ), gravado AS (
      INSERT INTO "erp"."espelho_bling" ("id", "entidade", "blingId", "codigo", "resumo", "hash", "pendente", "lidoEm", "mudouEm")
      SELECT gen_random_uuid()::text, ${f.entidade}, "blingId", codigo, resumo, hash, pendente, now(), now() FROM v
      ON CONFLICT ("entidade", "blingId") DO UPDATE SET
        "codigo"   = CASE WHEN "espelho_bling"."hash" <> EXCLUDED."hash" THEN EXCLUDED."codigo" ELSE "espelho_bling"."codigo" END,
        "resumo"   = CASE WHEN "espelho_bling"."hash" <> EXCLUDED."hash" THEN EXCLUDED."resumo" ELSE "espelho_bling"."resumo" END,
        "pendente" = "espelho_bling"."pendente" OR ("espelho_bling"."hash" <> EXCLUDED."hash" AND EXCLUDED."pendente"),
        "mudouEm"  = CASE WHEN "espelho_bling"."hash" <> EXCLUDED."hash" THEN now() ELSE "espelho_bling"."mudouEm" END,
        "hash"     = EXCLUDED."hash",
        "lidoEm"   = now()
      RETURNING (xmax = 0) AS novo, "mudouEm" = now() AS mudou
    )
    SELECT count(*) FILTER (WHERE novo OR mudou) AS mudaram FROM gravado`;
  return Number(r[0]?.mudaram ?? 0);
}

type Relatorio = { entidade: string; paginas: number; mudaram: number; detalhes: number; completa: boolean; erro?: string };

/**
 * Uma tanda de leitura de uma fonte, até o prazo. Em duas etapas: primeiro a
 * listagem de todas as fontes, depois os detalhes · senão o atraso de detalhe
 * de uma fonte (40 mil pedidos na primeira carga) come a rodada inteira e as
 * fontes seguintes nunca chegam a ser lidas.
 */
async function lerFonte(f: Fonte, prazo: number, etapa: "lista" | "detalhe"): Promise<Relatorio> {
  const r: Relatorio = { entidade: f.entidade, paginas: 0, mudaram: 0, detalhes: 0, completa: false };
  if (etapa === "detalhe" && !f.detalhe) return r;
  let estado = await prisma.fonteBling.upsert({
    where: { entidade: f.entidade },
    create: { entidade: f.entidade },
    update: {},
  });

  const emCurso = estado.varreduraDe !== null;
  const vencida =
    !estado.completaEm || Date.now() - estado.completaEm.getTime() >= f.intervaloMin * 60_000;

  try {
    if (etapa === "lista" && (emCurso || vencida)) {
      if (!emCurso) {
        estado = await prisma.fonteBling.update({
          where: { entidade: f.entidade },
          data: { varreduraDe: new Date(), pagina: 1, janela: 0 },
        });
      }
      // Um dia de folga no incremental. Fonte sem filtro de alteração relê tudo.
      const desde = f.incremental && estado.desde ? new Date(estado.desde.getTime() - 24 * 3600_000) : null;
      const janelas = desde ? null : f.janelas?.() ?? null;

      while (Date.now() < prazo) {
        const janela = janelas ? janelas[Math.min(estado.janela, janelas.length - 1)]! : null;
        const d = await chamar<{ data?: Item[] }>(f.lista(estado.pagina, desde, janela));
        const itens = (d.data ?? []).filter((x) => x.id !== undefined);
        r.paginas++;
        r.mudaram += itens.length ? await gravar(f, itens) : 0;

        if (itens.length < LIMITE && janelas && estado.janela < janelas.length - 1) {
          estado = await prisma.fonteBling.update({
            where: { entidade: f.entidade },
            data: { janela: estado.janela + 1, pagina: 1 },
          });
          continue;
        }
        if (itens.length < LIMITE) {
          const total = await prisma.espelhoBling.count({ where: { entidade: f.entidade } });
          await prisma.fonteBling.update({
            where: { entidade: f.entidade },
            data: { completaEm: new Date(), desde: estado.varreduraDe, varreduraDe: null, pagina: 1, janela: 0, registros: total, erro: null },
          });
          r.completa = true;
          break;
        }
        estado = await prisma.fonteBling.update({
          where: { entidade: f.entidade },
          data: { pagina: estado.pagina + 1 },
        });
      }
    }

    // Detalhes: o mais recente primeiro · é o que o painel do dia precisa.
    if (etapa === "detalhe" && f.detalhe) {
      while (Date.now() < prazo) {
        const fila = await prisma.espelhoBling.findMany({
          where: { entidade: f.entidade, pendente: true },
          orderBy: { mudouEm: "desc" },
          take: 10,
          select: { id: true, blingId: true },
        });
        if (!fila.length) break;
        for (const e of fila) {
          if (Date.now() >= prazo) break;
          const d = await chamar<{ data?: unknown }>(f.detalhe(e.blingId));
          await prisma.espelhoBling.update({
            where: { id: e.id },
            data: { dados: (d.data ?? null) as Prisma.InputJsonValue, pendente: false },
          });
          r.detalhes++;
        }
      }
    }
  } catch (e) {
    r.erro = e instanceof Error ? e.message.slice(0, 500) : "falha na leitura";
    await prisma.fonteBling.update({
      where: { entidade: f.entidade },
      data: { erro: r.erro, erroEm: new Date() },
    });
  }
  return r;
}

/** Saldos de todos os produtos, em lotes, por depósito. */
async function lerSaldos(prazo: number): Promise<Relatorio> {
  const r: Relatorio = { entidade: SALDO.entidade, paginas: 0, mudaram: 0, detalhes: 0, completa: false };
  let estado = await prisma.fonteBling.upsert({
    where: { entidade: SALDO.entidade },
    create: { entidade: SALDO.entidade },
    update: {},
  });
  const vencida =
    !estado.completaEm || Date.now() - estado.completaEm.getTime() >= SALDO.intervaloMin * 60_000;
  if (estado.varreduraDe === null && !vencida) return r;

  try {
    if (estado.varreduraDe === null) {
      estado = await prisma.fonteBling.update({
        where: { entidade: SALDO.entidade },
        data: { varreduraDe: new Date(), pagina: 1 },
      });
    }
    const fonte: Fonte = { entidade: SALDO.entidade, rotulo: SALDO.rotulo, lista: () => "", intervaloMin: SALDO.intervaloMin };

    while (Date.now() < prazo) {
      const produtos = await prisma.espelhoBling.findMany({
        where: { entidade: "produto" },
        orderBy: { blingId: "asc" },
        skip: (estado.pagina - 1) * SALDO.lote,
        take: SALDO.lote,
        select: { blingId: true, codigo: true },
      });
      if (produtos.length) {
        const q = produtos.map((p) => `idsProdutos[]=${p.blingId}`).join("&");
        const d = await chamar<{ data?: (Item & { produto?: { id?: number } })[] }>(`/estoques/saldos?${q}`);
        const codigos = new Map(produtos.map((p) => [p.blingId, p.codigo]));
        const itens = (d.data ?? [])
          .filter((x) => x.produto?.id !== undefined)
          .map((x) => ({ ...x, id: x.produto!.id }));
        fonte.codigo = (x) => codigos.get(String(x.id)) ?? null;
        r.paginas++;
        r.mudaram += itens.length ? await gravar(fonte, itens) : 0;
      }
      if (produtos.length < SALDO.lote) {
        const total = await prisma.espelhoBling.count({ where: { entidade: SALDO.entidade } });
        await prisma.fonteBling.update({
          where: { entidade: SALDO.entidade },
          data: { completaEm: new Date(), desde: estado.varreduraDe, varreduraDe: null, pagina: 1, registros: total, erro: null },
        });
        r.completa = true;
        break;
      }
      estado = await prisma.fonteBling.update({
        where: { entidade: SALDO.entidade },
        data: { pagina: estado.pagina + 1 },
      });
    }
  } catch (e) {
    r.erro = e instanceof Error ? e.message.slice(0, 500) : "falha na leitura";
    await prisma.fonteBling.update({ where: { entidade: SALDO.entidade }, data: { erro: r.erro, erroEm: new Date() } });
  }
  return r;
}

/**
 * Trava simples no banco: duas leituras ao mesmo tempo dobrariam o consumo do
 * limite do Bling e brigariam pela mesma página. Expira em 10 minutos, para
 * uma queda no meio não travar o espelho para sempre.
 */
async function travar(): Promise<boolean> {
  const linhas = await prisma.$executeRaw`
    INSERT INTO "erp"."fontes_bling" ("entidade", "atualizadoEm") VALUES ('__trava', now())
    ON CONFLICT ("entidade") DO UPDATE SET "atualizadoEm" = now()
    WHERE "fontes_bling"."atualizadoEm" < now() - interval '10 minutes'`;
  return linhas > 0;
}
async function soltar() {
  await prisma.$executeRaw`
    UPDATE "erp"."fontes_bling" SET "atualizadoEm" = now() - interval '1 day' WHERE "entidade" = '__trava'`;
}

/**
 * Uma rodada do espelho: cada fonte que estiver na hora, até o prazo.
 * Os saldos vêm logo depois dos produtos, porque dependem da lista deles.
 */
export async function sincronizar({ orcamentoMs = 45_000, entidades }: { orcamentoMs?: number; entidades?: string[] } = {}) {
  const prazo = Date.now() + orcamentoMs;
  if (!(await travar())) return { ok: false as const, motivo: "outra leitura em andamento" };
  const relatorio: Relatorio[] = [];
  try {
    // Pedidos de venda primeiro: é o que o painel de vendas mostra ao vivo. A
    // releitura dos 52 mil produtos e dos saldos é longa e, na frente, deixava
    // os pedidos horas sem ler (13/11).
    const fontes = FONTES.filter((f) => !entidades || entidades.includes(f.entidade)).sort(
      (a, b) => Number(b.entidade === "pedido_venda") - Number(a.entidade === "pedido_venda"),
    );
    // Listagens: o que mantém o espelho em dia. Cada fonte tem a sua parte do
    // tempo (a varredura longa continua na rodada seguinte).
    const comSaldo = !entidades || entidades.includes(SALDO.entidade);
    const etapas = fontes.length + (comSaldo && fontes.some((f) => f.entidade === "produto") ? 1 : 0);
    let feitas = 0;
    const parte = () => Date.now() + (prazo - Date.now()) / Math.max(1, etapas - feitas++);
    for (const f of fontes) {
      if (Date.now() >= prazo) break;
      relatorio.push(await lerFonte(f, parte(), "lista"));
      if (f.entidade === "produto" && comSaldo) relatorio.push(await lerSaldos(parte()));
    }
    // Detalhes: o tempo que sobrou, dividido entre as fontes com detalhe, para
    // nenhuma ficar parada atrás de outra.
    const comDetalhe = fontes.filter((f) => f.detalhe);
    for (const [i, f] of comDetalhe.entries()) {
      const resta = prazo - Date.now();
      if (resta <= 0) break;
      const parte = Date.now() + resta / (comDetalhe.length - i);
      const d = await lerFonte(f, parte, "detalhe");
      const r = relatorio.find((x) => x.entidade === f.entidade);
      if (r) {
        r.detalhes += d.detalhes;
        r.erro ??= d.erro;
      } else relatorio.push(d);
    }
  } finally {
    await soltar();
  }
  return { ok: true as const, relatorio };
}

/** O que a tela do espelho mostra. */
export async function situacao() {
  const [fontes, pendentes] = await Promise.all([
    prisma.fonteBling.findMany({ where: { entidade: { not: "__trava" } } }),
    prisma.espelhoBling.groupBy({ by: ["entidade"], where: { pendente: true }, _count: true }),
  ]);
  const porEntidade = new Map(fontes.map((f) => [f.entidade, f]));
  const pend = new Map(pendentes.map((p) => [p.entidade, p._count]));
  const todas = [...FONTES.slice(0, 3), SALDO, ...FONTES.slice(3)];
  return todas.map((f) => ({
    entidade: f.entidade,
    rotulo: f.rotulo,
    intervaloMin: f.intervaloMin,
    estado: porEntidade.get(f.entidade) ?? null,
    pendentes: pend.get(f.entidade) ?? 0,
  }));
}

// ── ao vivo: avisos (webhooks) do Bling ──────────────────────────────────────

/** Campos do resumo de pedido de venda, como vêm na listagem. */
const CAMPOS_RESUMO_PEDIDO = ["id", "numero", "numeroLoja", "data", "dataSaida", "dataPrevista", "totalProdutos", "total", "contato", "situacao", "loja"];

/**
 * Atualiza um registro só, na hora em que o Bling avisa que ele mudou. O aviso
 * traz só o id: o registro é sempre relido da API (o conteúdo do aviso não é
 * usado para nada além disso). Apagado no Bling → sai do espelho.
 */
export async function atualizarUm(entidade: "pedido_venda" | "produto" | "saldo", blingId: string, apagado = false) {
  if (!/^\d+$/.test(blingId)) return { ok: false as const, motivo: "id inválido" };
  if (apagado) {
    await prisma.espelhoBling.deleteMany({ where: { entidade, blingId } });
    return { ok: true as const, apagado: true };
  }
  if (entidade === "saldo") {
    const d = await chamar<{ data?: (Item & { produto?: { id?: number } })[] }>(`/estoques/saldos?idsProdutos[]=${blingId}`);
    const itens = (d.data ?? []).filter((x) => x.produto?.id !== undefined).map((x) => ({ ...x, id: x.produto!.id }));
    const prod = await prisma.espelhoBling.findFirst({ where: { entidade: "produto", blingId }, select: { codigo: true } });
    const fonte: Fonte = { entidade: "saldo", rotulo: SALDO.rotulo, lista: () => "", intervaloMin: SALDO.intervaloMin, codigo: () => prod?.codigo ?? null };
    return { ok: true as const, mudaram: itens.length ? await gravar(fonte, itens) : 0 };
  }
  const f = FONTES.find((x) => x.entidade === entidade)!;
  const d = await chamar<{ data?: Item }>(f.detalhe!(blingId));
  const det = d.data;
  if (!det?.id) return { ok: false as const, motivo: "não encontrado no Bling" };
  // O resumo segue o formato da listagem; o detalhe inteiro vai em `dados`.
  const resumo: Item =
    entidade === "pedido_venda" ? Object.fromEntries(CAMPOS_RESUMO_PEDIDO.filter((k) => k in det).map((k) => [k, det[k]])) : det;
  const mudaram = await gravar(f, [resumo]);
  await prisma.espelhoBling.update({
    where: { entidade_blingId: { entidade, blingId: String(det.id) } },
    data: { dados: det as Prisma.InputJsonValue, pendente: false },
  });
  return { ok: true as const, mudaram };
}
