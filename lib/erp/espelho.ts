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
 * script `prisma/espelho.ts`, que não tem limite de tempo.
 */

type Item = Record<string, unknown> & { id?: number | string };

type Fonte = {
  entidade: string;
  rotulo: string;
  /** Caminho da listagem. `desde` vem preenchido nas leituras incrementais. */
  lista: (pagina: number, desde: Date | null) => string;
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
    lista: (p, desde) =>
      `/produtos?${pag(p)}&criterio=5${desde ? `&dataAlteracaoInicial=${dia(desde)}` : ""}`,
    codigo: (x) => str(x.codigo),
    detalhe: (id) => `/produtos/${id}`,
    // Estrutura (bomba → caneca → componentes, kit e combo) só vem no detalhe.
    precisaDetalhe: (x) => x.formato === "E",
    intervaloMin: 60,
  },
  {
    entidade: "pedido_venda",
    rotulo: "Pedidos de venda",
    lista: (p, desde) =>
      desde
        ? `/pedidos/vendas?${pag(p)}&dataAlteracaoInicial=${dia(desde)}`
        : `/pedidos/vendas?${pag(p)}&dataInicial=${INICIO_HISTORICO}`,
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
    lista: (p) => `/contas/pagar?${pag(p)}`,
    codigo: (x) => str(x.numeroDocumento ?? x.id),
    intervaloMin: 6 * 60,
  },
  {
    entidade: "conta_receber",
    rotulo: "Contas a receber",
    lista: (p) => `/contas/receber?${pag(p)}`,
    codigo: (x) => str(x.numeroDocumento ?? x.id),
    intervaloMin: 6 * 60,
  },
];

/** Saldo não tem listagem: sai dos produtos, em lotes, pela API de estoques. */
export const SALDO = { entidade: "saldo", rotulo: "Saldos por depósito", lote: 50, intervaloMin: 15 };

const hash = (x: unknown) => createHash("sha1").update(JSON.stringify(x)).digest("hex");

/** Grava uma página da listagem. Devolve quantos mudaram de fato. */
async function gravar(f: Fonte, itens: Item[]) {
  const ids = itens.map((x) => String(x.id));
  const existentes = await prisma.espelhoBling.findMany({
    where: { entidade: f.entidade, blingId: { in: ids } },
    select: { blingId: true, hash: true },
  });
  const antes = new Map(existentes.map((e) => [e.blingId, e.hash]));
  const agora = new Date();
  let mudaram = 0;

  await prisma.$transaction(
    itens.map((x) => {
      const blingId = String(x.id);
      const h = hash(x);
      const mudou = antes.get(blingId) !== h;
      if (mudou) mudaram++;
      const pendente = mudou && Boolean(f.detalhe && f.precisaDetalhe?.(x));
      const resumo = x as Prisma.InputJsonValue;
      return prisma.espelhoBling.upsert({
        where: { entidade_blingId: { entidade: f.entidade, blingId } },
        create: { entidade: f.entidade, blingId, codigo: f.codigo?.(x) ?? null, resumo, hash: h, pendente },
        update: mudou
          ? { codigo: f.codigo?.(x) ?? null, resumo, hash: h, lidoEm: agora, mudouEm: agora, ...(pendente ? { pendente } : {}) }
          : { lidoEm: agora },
      });
    }),
  );
  return mudaram;
}

type Relatorio = { entidade: string; paginas: number; mudaram: number; detalhes: number; completa: boolean; erro?: string };

/** Uma tanda de leitura de uma fonte, até o prazo. */
async function lerFonte(f: Fonte, prazo: number): Promise<Relatorio> {
  const r: Relatorio = { entidade: f.entidade, paginas: 0, mudaram: 0, detalhes: 0, completa: false };
  let estado = await prisma.fonteBling.upsert({
    where: { entidade: f.entidade },
    create: { entidade: f.entidade },
    update: {},
  });

  const emCurso = estado.varreduraDe !== null;
  const vencida =
    !estado.completaEm || Date.now() - estado.completaEm.getTime() >= f.intervaloMin * 60_000;

  try {
    if (emCurso || vencida) {
      if (!emCurso) {
        estado = await prisma.fonteBling.update({
          where: { entidade: f.entidade },
          data: { varreduraDe: new Date(), pagina: 1 },
        });
      }
      // Um dia de folga no incremental: o filtro do Bling é por data, não por hora.
      const desde = estado.desde ? new Date(estado.desde.getTime() - 24 * 3600_000) : null;

      while (Date.now() < prazo) {
        const d = await chamar<{ data?: Item[] }>(f.lista(estado.pagina, desde));
        const itens = (d.data ?? []).filter((x) => x.id !== undefined);
        r.paginas++;
        r.mudaram += itens.length ? await gravar(f, itens) : 0;

        if (itens.length < LIMITE) {
          const total = await prisma.espelhoBling.count({ where: { entidade: f.entidade } });
          await prisma.fonteBling.update({
            where: { entidade: f.entidade },
            data: { completaEm: new Date(), desde: estado.varreduraDe, varreduraDe: null, pagina: 1, registros: total, erro: null },
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
    if (f.detalhe) {
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
    for (const f of FONTES) {
      if (Date.now() >= prazo) break;
      if (entidades && !entidades.includes(f.entidade)) continue;
      relatorio.push(await lerFonte(f, prazo));
      if (f.entidade === "produto" && (!entidades || entidades.includes(SALDO.entidade))) {
        relatorio.push(await lerSaldos(prazo));
      }
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
