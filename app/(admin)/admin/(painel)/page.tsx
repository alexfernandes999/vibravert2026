import Link from "next/link";
import type { PedidoStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { brl } from "@/lib/formato";
import { configurado } from "@/lib/mercadopago";
import { configurado as emailOk } from "@/lib/email";
import { configurado as freteOk } from "@/lib/correios";
import { CONTROLA_ESTOQUE } from "@/lib/loja";
import { Selo } from "@/components/selo-pedido";
import { GraficoVendas } from "@/components/grafico-vendas";
import { Funil, PorCanal, PorEstado, PorPagamento } from "@/components/painel-comercial";

export const dynamic = "force-dynamic";

const PAGOS: PedidoStatus[] = ["PAGO", "SEPARANDO", "ENVIADO", "ENTREGUE"];

export default async function Painel({ searchParams }: { searchParams: Promise<{ d?: string }> }) {
  const dias = Math.min(Math.max(Number((await searchParams).d) || 30, 7), 90);
  const desde = new Date(Date.now() - dias * 864e5);
  const pagos = { status: { in: PAGOS }, criadoEm: { gte: desde } };

  const [
    agg, qtd, recentes, baixo, semGarantia, semCurva,
    etapas, porOrigem, pedidosPeriodo, abandonados,
  ] = await Promise.all([
    prisma.pedido.aggregate({ where: pagos, _sum: { total: true }, _avg: { total: true } }),
    prisma.pedido.count({ where: pagos }),
    prisma.pedido.findMany({ orderBy: { criadoEm: "desc" }, take: 6, include: { cliente: { select: { nome: true } } } }),
    prisma.estoque.findMany({ where: { quantidade: { lte: 5 } }, take: 4, include: { produto: { select: { nome: true, sku: true } } } }),
    prisma.produto.count({ where: { ativo: true, especificacoes: { none: { nome: "Garantia" } } } }),
    prisma.produto.count({ where: { ativo: true, curvaVazao: { isEmpty: true } } }),
    // funil: sessões distintas por etapa, não eventos — quem volta ao carrinho
    // três vezes não é três pessoas
    prisma.evento.groupBy({ by: ["etapa"], where: { criadoEm: { gte: desde } }, _count: { sessao: true } }),
    prisma.evento.groupBy({ by: ["origem"], where: { criadoEm: { gte: desde } }, _count: { sessao: true } }),
    prisma.pedido.findMany({
      where: pagos,
      select: { total: true, metodo: true, parcelas: true, origem: true, criadoEm: true, endereco: { select: { uf: true } } },
    }),
    // carrinho montado que não virou pedido: é a venda que estava a um passo
    prisma.evento.findMany({
      where: { etapa: "CARRINHO", criadoEm: { gte: desde } },
      select: { sessao: true, origem: true },
      distinct: ["sessao"],
    }),
  ]);

  const fat = Number(agg._sum.total ?? 0);
  const passo = (e: string) => etapas.find((x) => x.etapa === e)?._count.sessao ?? 0;
  const comPedido = new Set(
    (await prisma.evento.findMany({ where: { etapa: "PEDIDO", criadoEm: { gte: desde } }, select: { sessao: true } })).map((x) => x.sessao),
  );
  const perdidos = abandonados.filter((a) => !comPedido.has(a.sessao));

  const porDia = new Map<string, number>();
  for (let i = dias - 1; i >= 0; i--) porDia.set(new Date(Date.now() - i * 864e5).toISOString().slice(0, 10), 0);
  for (const p of pedidosPeriodo) {
    const k = p.criadoEm.toISOString().slice(0, 10);
    if (porDia.has(k)) porDia.set(k, porDia.get(k)! + Number(p.total));
  }
  const serie = [...porDia.entries()].map(([k, v]) => ({ dia: `${k.slice(8, 10)}/${k.slice(5, 7)}`, total: v }));

  const pendencias = [
    !configurado && "Mercado Pago sem credencial — nenhum pedido pode ser cobrado.",
    !emailOk && "E-mail não configurado — o comprador não recebe confirmação nem rastreio.",
    !freteOk && "Correios sem contrato — o frete usa valor fixo em vez de calcular por CEP.",
    !CONTROLA_ESTOQUE && "Controle de estoque desligado — a loja vende sem verificar quantidade.",
    semGarantia > 0 && `${semGarantia} produto(s) sem prazo de garantia publicado.`,
    semCurva > 0 && `${semCurva} produto(s) sem curva de vazão — ficam fora da calculadora.`,
  ].filter(Boolean) as string[];

  return (
    <div className="p-6">
      <div className="flex flex-wrap items-baseline gap-3">
        <h1 className="text-xl font-extrabold tracking-tight">Visão comercial</h1>
        <nav className="ml-auto flex gap-1.5">
          {[7, 30, 90].map((d) => (
            <Link
              key={d}
              href={`/admin?d=${d}`}
              className={`num rounded-lg px-3 py-1.5 text-[12.5px] font-bold ${
                dias === d ? "bg-marca text-white" : "border border-linha bg-superficie text-tinta-2"
              }`}
            >
              {d} dias
            </Link>
          ))}
        </nav>
      </div>

      <dl className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi r="Faturamento" v={brl(fat)} />
        <Kpi r="Pedidos pagos" v={String(qtd)} />
        <Kpi r="Ticket médio" v={qtd ? brl(Number(agg._avg.total ?? 0)) : "—"} />
        <Kpi
          r="Conversão"
          v={passo("VISITA") ? `${((passo("PEDIDO") / passo("VISITA")) * 100).toFixed(2)}%` : "—"}
          nota={passo("VISITA") ? `${passo("VISITA")} sessões` : "sem tráfego medido"}
        />
      </dl>

      {pendencias.length > 0 && (
        <section className="mt-5 rounded-caixa border border-atencao/30 bg-atencao/5 p-4">
          <h2 className="text-[13px] font-extrabold text-atencao">Pendências que travam a operação</h2>
          <ul className="mt-2 space-y-1.5 text-[13px] text-atencao">
            {pendencias.map((p) => <li key={p}>· {p}</li>)}
          </ul>
        </section>
      )}

      <section className="mt-5 rounded-caixa border border-linha bg-superficie">
        <h2 className="flex items-baseline gap-2 border-b border-linha px-4 py-3 text-[13.5px] font-extrabold">
          Faturamento por dia
          <span className="num text-[11px] font-semibold text-mudo">últimos {dias} dias · R$</span>
        </h2>
        <div className="p-3"><GraficoVendas dias={serie} /></div>
      </section>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Funil
          visita={passo("VISITA")}
          produto={passo("PRODUTO")}
          carrinho={passo("CARRINHO")}
          checkout={passo("CHECKOUT")}
          pedido={passo("PEDIDO")}
        />
        <PorCanal
          canais={porOrigem.map((o) => ({ nome: o.origem ?? "direto", sessoes: o._count.sessao }))}
          pedidos={pedidosPeriodo.map((p) => ({ origem: p.origem, total: Number(p.total) }))}
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <PorEstado pedidos={pedidosPeriodo.map((p) => ({ uf: p.endereco.uf, total: Number(p.total) }))} />
        <PorPagamento
          pedidos={pedidosPeriodo.map((p) => ({ metodo: p.metodo, parcelas: p.parcelas, total: Number(p.total) }))}
        />
      </div>

      <section className="mt-4 rounded-caixa border border-linha bg-superficie p-4">
        <h2 className="text-[13.5px] font-extrabold">Carrinhos perdidos</h2>
        <p className="mt-0.5 text-[12.5px] text-mudo">
          Sessões que montaram carrinho e não fecharam. É a venda que estava a um passo.
        </p>
        {perdidos.length === 0 ? (
          <p className="mt-3 text-[13px] text-mudo">Nenhum no período.</p>
        ) : (
          <>
            <p className="num mt-3 text-3xl font-extrabold tracking-tight text-critico">{perdidos.length}</p>
            <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-[12.5px]">
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
                  <li key={canal} className="text-tinta-2">
                    <span className="num font-extrabold">{n}</span> {canal}
                  </li>
                ))}
            </ul>
          </>
        )}
      </section>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <section className="rounded-caixa border border-linha bg-superficie">
          <h2 className="flex items-baseline border-b border-linha px-4 py-3 text-[13.5px] font-extrabold">
            Pedidos recentes
            <Link href="/admin/pedidos" className="ml-auto text-[12px] font-bold text-marca">Ver todos</Link>
          </h2>
          {recentes.length === 0 ? (
            <p className="p-4 text-[13px] text-mudo">Nenhum pedido ainda.</p>
          ) : (
            <table className="w-full text-[13px]">
              <tbody>
                {recentes.map((p) => (
                  <tr key={p.id} className="border-b border-linha last:border-0">
                    <td className="num px-4 py-2.5 font-bold">#{p.numero}</td>
                    <td className="px-2 py-2.5">{p.cliente.nome}</td>
                    <td className="num px-2 py-2.5 text-right font-bold">{brl(Number(p.total))}</td>
                    <td className="px-4 py-2.5"><Selo s={p.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="rounded-caixa border border-linha bg-superficie">
          <h2 className="flex items-baseline border-b border-linha px-4 py-3 text-[13.5px] font-extrabold">
            Estoque baixo
            <Link href="/admin/estoque" className="ml-auto text-[12px] font-bold text-marca">Ver todos</Link>
          </h2>
          {baixo.length === 0 ? (
            <p className="p-4 text-[13px] text-mudo">Nada abaixo do mínimo.</p>
          ) : (
            <ul className="divide-y divide-linha">
              {baixo.map((e) => (
                <li key={e.produtoId} className="flex items-center gap-3 px-4 py-2.5 text-[12.5px]">
                  <span className="min-w-0 flex-1 font-semibold leading-snug">
                    {e.produto.nome.slice(0, 40)}
                    <span className="num block text-[10.5px] font-normal text-mudo">{e.produto.sku}</span>
                  </span>
                  <span className={`num font-extrabold ${e.quantidade === 0 ? "text-critico" : "text-atencao"}`}>
                    {e.quantidade}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function Kpi({ r, v, nota }: { r: string; v: string; nota?: string }) {
  return (
    <div className="rounded-caixa border border-linha bg-superficie p-4">
      <dt className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-mudo">{r}</dt>
      <dd className="num mt-1.5 text-2xl font-extrabold tracking-tight">{v}</dd>
      {nota && <dd className="mt-0.5 text-[11px] text-mudo">{nota}</dd>}
    </div>
  );
}
