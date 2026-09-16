import Link from "next/link";
import type { PedidoStatus } from "@prisma/client";
import { AlertTriangle, ArrowDownRight, ArrowUpRight, ChevronRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { usuarioAtual } from "@/lib/admin-auth";
import { Saudacao } from "@/components/saudacao";
import { RelogioPainel } from "@/components/relogio-painel";
import { VibrinhaPainel } from "@/components/vibrinha-painel";
import { brl } from "@/lib/formato";
import { configurado } from "@/lib/mercadopago";
import { configurado as emailOk } from "@/lib/email";
import { configurado as freteConfigurado, nomeDoProvedor } from "@/lib/frete";
import { CONTROLA_ESTOQUE } from "@/lib/loja";
import { Selo } from "@/components/selo-pedido";
import { GraficoVendas, type Ponto } from "@/components/grafico-vendas";
import { Caixa, Funil, PorCanal, PorEstado, PorPagamento, nomeCanal } from "@/components/painel-comercial";

export const dynamic = "force-dynamic";

const PAGOS: PedidoStatus[] = ["PAGO", "SEPARANDO", "ENVIADO", "ENTREGUE"];
const FUSO = "America/Sao_Paulo";
const PERIODOS = [
  { d: 1, r: "Hoje" },
  { d: 7, r: "7 dias" },
  { d: 30, r: "30 dias" },
  { d: 90, r: "90 dias" },
];

/**
 * Dia e hora em Brasília.
 *
 * O servidor roda em UTC: sem isto, uma venda às dez da noite caía no gráfico
 * do dia seguinte, e o "hoje" do painel começava às nove da noite de ontem.
 */
const chaveDia = (d: Date) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: FUSO, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
const horaDe = (d: Date) =>
  Number(new Intl.DateTimeFormat("en-GB", { timeZone: FUSO, hour: "2-digit", hourCycle: "h23" }).format(d));

/**
 * Visitantes distintos por etapa, e por canal.
 *
 * O painel contava eventos: quem abria cinco produtos virava cinco. Aqui cada
 * pessoa conta uma vez por etapa · a origem é gravada na primeira visita e não
 * muda, então basta a primeira linha de cada uma.
 */
function resumir(linhas: { sessao: string; etapa: string; origem: string | null }[]) {
  const porSessao = new Map<string, { origem: string | null; etapas: Set<string> }>();
  for (const l of linhas) {
    const s = porSessao.get(l.sessao) ?? { origem: l.origem, etapas: new Set<string>() };
    s.etapas.add(l.etapa);
    porSessao.set(l.sessao, s);
  }
  const todas = [...porSessao.values()];
  const porOrigem = new Map<string, number>();
  for (const s of todas) porOrigem.set(s.origem ?? "direto", (porOrigem.get(s.origem ?? "direto") ?? 0) + 1);
  return {
    total: todas.length,
    com: (etapa: string) => todas.filter((s) => s.etapas.has(etapa)).length,
    porOrigem,
  };
}

export default async function Painel({ searchParams }: { searchParams: Promise<{ d?: string }> }) {
  const eu = (await usuarioAtual())!;
  const pedidoPeriodo = Number((await searchParams).d);
  const dias = PERIODOS.some((p) => p.d === pedidoPeriodo) ? pedidoPeriodo : 30;

  // "Hoje" começa à meia-noite de Brasília. O período anterior tem a mesma
  // duração · hoje até agora contra ontem até esta mesma hora, e não contra o
  // dia inteiro de ontem, que sempre ganharia.
  const agora = new Date();
  const desde = dias === 1 ? new Date(`${chaveDia(agora)}T00:00:00-03:00`) : new Date(agora.getTime() - dias * 864e5);
  const antesDesde = new Date(desde.getTime() - (agora.getTime() - desde.getTime()));
  const pagos = { status: { in: PAGOS }, criadoEm: { gte: desde } };
  const pagosAntes = { status: { in: PAGOS }, criadoEm: { gte: antesDesde, lt: desde } };
  const eventos = (de: Date, ate?: Date) =>
    prisma.evento.findMany({
      where: { criadoEm: ate ? { gte: de, lt: ate } : { gte: de } },
      distinct: ["sessao", "etapa"],
      select: { sessao: true, etapa: true, origem: true },
    });

  const [
    agg, qtd, aggAntes, qtdAntes, recentes, baixo, semGarantia, semCurva,
    ev, evAntes, pedidosPeriodo, sessoesQueCompraram, abandonados,
  ] = await Promise.all([
    prisma.pedido.aggregate({ where: pagos, _sum: { total: true } }),
    prisma.pedido.count({ where: pagos }),
    prisma.pedido.aggregate({ where: pagosAntes, _sum: { total: true } }),
    prisma.pedido.count({ where: pagosAntes }),
    prisma.pedido.findMany({ orderBy: { criadoEm: "desc" }, take: 6, include: { cliente: { select: { nome: true } } } }),
    prisma.estoque.findMany({
      where: { quantidade: { lte: 5 } },
      orderBy: { quantidade: "asc" },
      take: 5,
      include: { produto: { select: { nome: true, sku: true } } },
    }),
    // Só bomba: peça de reposição não tem prazo de garantia.
    prisma.produto.findMany({
      where: { ativo: true, tipo: "BOMBA", especificacoes: { none: { nome: "Garantia" } } },
      select: { sku: true },
    }),
    prisma.produto.findMany({
      where: { ativo: true, tipo: "BOMBA", curvaVazao: { isEmpty: true } },
      select: { sku: true },
      orderBy: { sku: "asc" },
    }),
    eventos(desde),
    eventos(antesDesde, desde),
    prisma.pedido.findMany({
      where: pagos,
      select: { total: true, metodo: true, parcelas: true, origem: true, criadoEm: true, endereco: { select: { uf: true } } },
    }),
    prisma.evento.findMany({ where: { etapa: "PEDIDO", criadoEm: { gte: desde } }, select: { sessao: true }, distinct: ["sessao"] }),
    // Carrinho montado que não virou pedido: a venda que estava a um passo.
    prisma.evento.findMany({
      where: { etapa: "CARRINHO", criadoEm: { gte: desde } },
      select: { sessao: true, origem: true },
      distinct: ["sessao"],
    }),
  ]);

  const s = resumir(ev);
  const sa = resumir(evAntes);

  const fat = Number(agg._sum.total ?? 0);
  const fatAntes = Number(aggAntes._sum.total ?? 0);
  const ticket = qtd ? fat / qtd : 0;
  const ticketAntes = qtdAntes ? fatAntes / qtdAntes : 0;
  const conv = s.total ? s.com("PEDIDO") / s.total : 0;
  const convAntes = sa.total ? sa.com("PEDIDO") / sa.total : 0;
  const comparacao = dias === 1 ? "vs. ontem até esta hora" : `vs. ${dias} dias anteriores`;

  const comPedido = new Set(sessoesQueCompraram.map((x) => x.sessao));
  const perdidos = abandonados.filter((a) => !comPedido.has(a.sessao));

  // ── série do gráfico: por hora no "Hoje", por dia nos outros ─────────
  let pontos: Ponto[];
  if (dias === 1) {
    pontos = Array.from({ length: 24 }, (_, h) => ({
      chave: `h${h}`,
      rotulo: `${h}h`,
      detalhe: `das ${h}h às ${h + 1}h`,
      total: 0,
      pedidos: 0,
    }));
    for (const p of pedidosPeriodo) {
      const pt = pontos[horaDe(p.criadoEm)];
      if (pt) { pt.total += Number(p.total); pt.pedidos++; }
    }
  } else {
    const mapa = new Map<string, Ponto>();
    for (let i = dias - 1; i >= 0; i--) {
      const d = new Date(agora.getTime() - i * 864e5);
      const k = chaveDia(d);
      if (mapa.has(k)) continue;
      mapa.set(k, {
        chave: k,
        rotulo: `${k.slice(8, 10)}/${k.slice(5, 7)}`,
        detalhe: new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO, weekday: "short", day: "numeric", month: "short" })
          .format(d)
          .replace(/\./g, ""),
        total: 0,
        pedidos: 0,
      });
    }
    for (const p of pedidosPeriodo) {
      const pt = mapa.get(chaveDia(p.criadoEm));
      if (pt) { pt.total += Number(p.total); pt.pedidos++; }
    }
    pontos = [...mapa.values()];
  }
  const melhor = pontos.reduce<Ponto | null>((a, b) => (b.total > (a?.total ?? 0) ? b : a), null);

  /** Lista os SKUs no próprio aviso: "8 produtos" não diz quais são. */
  const quais = (l: { sku: string }[]) =>
    l.length <= 8 ? l.map((x) => x.sku).join(", ") : `${l.slice(0, 8).map((x) => x.sku).join(", ")} e mais ${l.length - 8}`;

  const pendencias = [
    !configurado && "Mercado Pago sem credencial · nenhum pedido pode ser cobrado.",
    !emailOk && "E-mail não configurado · o comprador não recebe confirmação nem rastreio.",
    !freteConfigurado() && `${nomeDoProvedor()} sem credencial · o frete usa valor fixo em vez de calcular por CEP.`,
    semGarantia.length > 0 && `${semGarantia.length} bomba(s) sem prazo de garantia: ${quais(semGarantia)}.`,
    semCurva.length > 0 &&
      `${semCurva.length} bomba(s) sem curva de vazão · ficam fora da calculadora: ${quais(semCurva)}.`,
  ].filter(Boolean) as string[];

  const dataHora = new Intl.DateTimeFormat("pt-BR", {
    timeZone: FUSO,
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="mx-auto w-full max-w-[1320px] px-5 py-6 lg:px-8 lg:py-8">
      <header className="flex flex-wrap items-center gap-x-6 gap-y-4">
        <Saudacao nome={eu.nome} />
        <div className="ml-auto flex flex-wrap items-center gap-2.5">
          <nav aria-label="Período" className="flex rounded-lg border border-linha bg-superficie p-0.5">
            {PERIODOS.map((p) => (
              <Link
                key={p.d}
                href={`/admin?d=${p.d}`}
                aria-current={dias === p.d ? "page" : undefined}
                className={`rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors ${
                  dias === p.d ? "bg-marca text-white shadow-sm" : "text-tinta-2 hover:bg-fundo hover:text-tinta"
                }`}
              >
                {p.r}
              </Link>
            ))}
          </nav>
          <RelogioPainel />
        </div>
      </header>

      <div className="mt-5">
        <VibrinhaPainel nome={eu.nome} />
      </div>

      {pendencias.length > 0 && (
        <section className="mt-5 flex gap-3 rounded-xl border border-atencao/25 bg-atencao/[0.06] px-4 py-3.5">
          <AlertTriangle aria-hidden className="mt-0.5 h-[18px] w-[18px] shrink-0 text-atencao" />
          <div className="min-w-0">
            <h2 className="text-[13.5px] font-semibold text-atencao">Pendências que travam a operação</h2>
            <ul className="mt-1 space-y-1 text-[13px] text-tinta-2">
              {pendencias.map((p) => <li key={p}>{p}</li>)}
            </ul>
          </div>
        </section>
      )}

      <section
        aria-label="Indicadores do período"
        className="mt-5 grid gap-px overflow-hidden rounded-xl border border-linha bg-linha sm:grid-cols-2 lg:grid-cols-4"
      >
        <Kpi r="Faturamento" v={brl(fat)} atual={fat} anterior={fatAntes} comparacao={comparacao} />
        <Kpi r="Pedidos pagos" v={qtd.toLocaleString("pt-BR")} atual={qtd} anterior={qtdAntes} comparacao={comparacao} />
        <Kpi r="Ticket médio" v={qtd ? brl(ticket) : "R$ 0,00"} atual={ticket} anterior={ticketAntes} comparacao={comparacao} />
        <Kpi
          r="Conversão"
          v={`${(conv * 100).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 2 })}%`}
          atual={conv}
          anterior={convAntes}
          comparacao={`${s.total.toLocaleString("pt-BR")} visitantes`}
        />
      </section>

      <Caixa
        className="mt-5"
        titulo="Faturamento"
        nota={dias === 1 ? "hoje, por hora · horário de Brasília" : `últimos ${dias} dias, por dia`}
        extra={
          <dl className="flex flex-wrap gap-x-8 gap-y-2">
            <Resumo r="Total" v={brl(fat)} />
            <Resumo r="Pedidos" v={qtd.toLocaleString("pt-BR")} />
            <Resumo
              r={dias === 1 ? "Melhor hora" : "Melhor dia"}
              v={melhor ? `${melhor.rotulo} · ${brl(melhor.total)}` : "sem vendas"}
            />
          </dl>
        }
      >
        <GraficoVendas pontos={pontos} vazio="As colunas aparecem conforme os pagamentos são confirmados." />
      </Caixa>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Funil
          sessoes={s.total}
          produto={s.com("PRODUTO")}
          carrinho={s.com("CARRINHO")}
          checkout={s.com("CHECKOUT")}
          pedido={s.com("PEDIDO")}
        />
        <PorCanal
          canais={[...s.porOrigem.entries()].map(([nome, sessoes]) => ({ nome, sessoes }))}
          pedidos={pedidosPeriodo.map((p) => ({ origem: p.origem, total: Number(p.total) }))}
        />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <PorEstado pedidos={pedidosPeriodo.map((p) => ({ uf: p.endereco.uf, total: Number(p.total) }))} />
        <PorPagamento
          pedidos={pedidosPeriodo.map((p) => ({ metodo: p.metodo, parcelas: p.parcelas, total: Number(p.total) }))}
        />
      </div>

      <div className="mt-5 grid items-start gap-5 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <Caixa titulo="Pedidos recentes" semRecuo extra={<VerTodos href="/admin/pedidos" r="Ver todos" />}>
          {recentes.length === 0 ? (
            <p className="px-5 pb-4 text-[13px] text-mudo">Nenhum pedido ainda.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[13.5px]">
                <thead>
                  <tr className="text-left text-[11.5px] text-mudo">
                    <th className="px-5 pb-2 font-medium">Pedido</th>
                    <th className="px-2 pb-2 font-medium">Cliente</th>
                    <th className="hidden px-2 pb-2 font-medium sm:table-cell">Data</th>
                    <th className="px-2 pb-2 text-right font-medium">Total</th>
                    <th className="px-5 pb-2 text-right font-medium">Situação</th>
                  </tr>
                </thead>
                <tbody>
                  {recentes.map((p) => (
                    <tr key={p.id} className="border-t border-linha">
                      <td className="num px-5 py-3 font-semibold text-tinta">#{p.numero}</td>
                      <td className="max-w-[220px] truncate px-2 py-3 text-tinta-2">{p.cliente.nome}</td>
                      <td className="num hidden whitespace-nowrap px-2 py-3 text-mudo sm:table-cell">
                        {dataHora.format(p.criadoEm)}
                      </td>
                      <td className="num whitespace-nowrap px-2 py-3 text-right font-semibold text-tinta">
                        {brl(Number(p.total))}
                      </td>
                      <td className="px-5 py-3 text-right"><Selo s={p.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Caixa>

        <div className="grid gap-5">
          <Caixa
            titulo="Carrinhos perdidos"
            nota="montaram carrinho e não fecharam"
            extra={<VerTodos href="/admin/recuperar-vendas" r="Recuperar" />}
          >
            {perdidos.length === 0 ? (
              <p className="text-[13px] text-mudo">Nenhum no período.</p>
            ) : (
              <>
                <p className="text-[28px] font-semibold leading-none tracking-tight text-tinta">{perdidos.length}</p>
                <ul className="mt-3 flex flex-wrap gap-1.5">
                  {Object.entries(
                    perdidos.reduce<Record<string, number>>((a, p) => {
                      const k = p.origem ?? "direto";
                      a[k] = (a[k] ?? 0) + 1;
                      return a;
                    }, {}),
                  )
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 5)
                    .map(([canal, n]) => (
                      <li key={canal} className="rounded-md bg-superficie-2 px-2 py-1 text-[12px] text-tinta-2">
                        <span className="num font-semibold text-tinta">{n}</span> {nomeCanal(canal)}
                      </li>
                    ))}
                </ul>
              </>
            )}
          </Caixa>

          <Caixa
            titulo={CONTROLA_ESTOQUE ? "Estoque baixo" : "Estoque"}
            nota={CONTROLA_ESTOQUE ? "cinco unidades ou menos" : undefined}
            semRecuo
            extra={<VerTodos href="/admin/estoque" r="Ver estoque" />}
          >
            {!CONTROLA_ESTOQUE ? (
              <p className="px-5 pb-4 text-[13px] leading-relaxed text-mudo">
                A quantidade não é controlada por SKU: a fábrica produz sob demanda e a loja vende sem travar por estoque.
              </p>
            ) : baixo.length === 0 ? (
              <p className="px-5 pb-4 text-[13px] text-mudo">Nada abaixo do mínimo.</p>
            ) : (
              <ul>
                {baixo.map((e) => (
                  <li key={e.produtoId} className="flex items-center gap-3 border-t border-linha px-5 py-2.5">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] text-tinta">{e.produto.nome}</span>
                      <span className="num block text-[11.5px] text-mudo">{e.produto.sku}</span>
                    </span>
                    <span
                      className={`num rounded-md px-2 py-0.5 text-[12.5px] font-semibold ${
                        e.quantidade === 0 ? "bg-critico/10 text-critico" : "bg-atencao/10 text-atencao"
                      }`}
                    >
                      {e.quantidade === 0 ? "esgotado" : `${e.quantidade} un.`}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Caixa>
        </div>
      </div>
    </div>
  );
}

/**
 * Um indicador com a variação contra o período anterior.
 *
 * Número sozinho não diz se é bom. R$ 2 mil pode ser o melhor mês ou metade
 * do anterior · a seta ao lado é o que transforma o número em resposta.
 */
function Kpi({
  r,
  v,
  atual,
  anterior,
  comparacao,
}: {
  r: string;
  v: string;
  atual: number;
  anterior: number;
  comparacao: string;
}) {
  return (
    <div className="bg-superficie px-5 py-4">
      <p className="text-[12.5px] font-medium text-mudo">{r}</p>
      <p className="mt-1.5 text-[28px] font-semibold leading-none tracking-tight text-tinta">{v}</p>
      <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1">
        <Variacao atual={atual} anterior={anterior} />
        <span className="text-[12px] text-tenue">{comparacao}</span>
      </div>
    </div>
  );
}

function Variacao({ atual, anterior }: { atual: number; anterior: number }) {
  if (atual === 0 && anterior === 0) {
    return <span className="rounded-md bg-superficie-2 px-1.5 py-0.5 text-[11.5px] font-medium text-mudo">sem movimento</span>;
  }
  if (anterior === 0) {
    return <span className="rounded-md bg-marca-suave px-1.5 py-0.5 text-[11.5px] font-semibold text-marca">novo</span>;
  }
  const v = (atual - anterior) / anterior;
  const sobe = v >= 0;
  const Seta = sobe ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={`num inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11.5px] font-semibold ${
        sobe ? "bg-bom-suave text-bom" : "bg-critico/10 text-critico"
      }`}
    >
      <Seta aria-hidden className="h-3.5 w-3.5" />
      <span className="sr-only">{sobe ? "subiu" : "caiu"}</span>
      {Math.abs(v * 100).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}%
    </span>
  );
}

function Resumo({ r, v }: { r: string; v: string }) {
  return (
    <div>
      <dt className="text-[11.5px] font-medium text-mudo">{r}</dt>
      <dd className="num mt-0.5 whitespace-nowrap text-[14.5px] font-semibold text-tinta">{v}</dd>
    </div>
  );
}

function VerTodos({ href, r }: { href: string; r: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-0.5 text-[12.5px] font-medium text-marca hover:underline">
      {r}
      <ChevronRight aria-hidden className="h-3.5 w-3.5" />
    </Link>
  );
}
