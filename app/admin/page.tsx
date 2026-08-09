import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { brl } from "@/lib/formato";
import { configurado } from "@/lib/mercadopago";
import { CONTROLA_ESTOQUE } from "@/lib/loja";
import { configurado as emailOk } from "@/lib/email";
import { configurado as freteOk } from "@/lib/correios";
import { Selo } from "@/components/selo-pedido";
import { GraficoVendas } from "@/components/grafico-vendas";
import type { PedidoStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const trintaDiasAtras = () => new Date(Date.now() - 30 * 864e5);

export default async function Painel() {
  const desde = trintaDiasAtras();
  const pagos = { status: { in: ["PAGO", "SEPARANDO", "ENVIADO", "ENTREGUE"] as PedidoStatus[] } };

  const [agg, qtdPedidos, porMetodo, recentes, baixo, semGarantia, semCurva] = await Promise.all([
    prisma.pedido.aggregate({ where: { ...pagos, criadoEm: { gte: desde } }, _sum: { total: true }, _avg: { total: true } }),
    prisma.pedido.count({ where: { ...pagos, criadoEm: { gte: desde } } }),
    prisma.pedido.groupBy({ by: ["metodo"], where: { ...pagos, criadoEm: { gte: desde } }, _count: true }),
    prisma.pedido.findMany({ orderBy: { criadoEm: "desc" }, take: 8, include: { cliente: { select: { nome: true } } } }),
    prisma.estoque.findMany({ where: { quantidade: { lte: 5 } }, take: 5, include: { produto: { select: { nome: true, sku: true } } } }),
    prisma.produto.count({ where: { ativo: true, especificacoes: { none: { nome: "Garantia" } } } }),
    prisma.produto.count({ where: { ativo: true, curvaVazao: { isEmpty: true } } }),
  ]);

  const fat = Number(agg._sum.total ?? 0);

  // Série diária montada em memória: com 30 pontos, agrupar no banco custaria
  // mais linha de SQL do que economiza.
  const pagosDoPeriodo = await prisma.pedido.findMany({
    where: { ...pagos, criadoEm: { gte: desde } },
    select: { criadoEm: true, total: true },
  });
  const porDia = new Map<string, number>();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 864e5);
    porDia.set(d.toISOString().slice(0, 10), 0);
  }
  for (const p of pagosDoPeriodo) {
    const k = p.criadoEm.toISOString().slice(0, 10);
    if (porDia.has(k)) porDia.set(k, porDia.get(k)! + Number(p.total));
  }
  const serie = [...porDia.entries()].map(([k, v]) => ({
    dia: `${k.slice(8, 10)}/${k.slice(5, 7)}`,
    total: v,
  }));

  return (
    <div className="p-6">
      <h1 className="text-xl font-extrabold tracking-tight">Visão geral</h1>
      <p className="mt-0.5 text-[13px] text-mudo">Últimos 30 dias</p>

      <dl className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi r="Faturamento" v={brl(fat)} />
        <Kpi r="Pedidos" v={String(qtdPedidos)} />
        <Kpi r="Ticket médio" v={qtdPedidos ? brl(Number(agg._avg.total ?? 0)) : "—"} />
        <Kpi r="Meio mais usado" v={porMetodo.sort((a, b) => b._count - a._count)[0]?.metodo.replace("_", " ") ?? "—"} />
      </dl>

      {/* O painel avisa o que está impedindo a loja de vender, em vez de deixar
          isso escondido no código ou na cabeça de quem programou. */}
      <section className="mt-6 rounded-caixa border border-atencao/30 bg-atencao/5 p-4">
        <h2 className="text-[13px] font-extrabold text-atencao">Pendências que travam a operação</h2>
        <ul className="mt-2 space-y-1.5 text-[13px] text-atencao">
          {!configurado && <li>· Mercado Pago sem credencial — nenhum pedido pode ser cobrado.</li>}
          {!emailOk && <li>· E-mail não configurado — o comprador não recebe confirmação nem rastreio.</li>}
          {!freteOk && <li>· Correios sem contrato — o frete usa valor fixo em vez de calcular por CEP.</li>}
          {!CONTROLA_ESTOQUE && <li>· Controle de estoque desligado — a loja vende sem verificar quantidade.</li>}
          {semGarantia > 0 && <li>· {semGarantia} produto(s) sem prazo de garantia publicado.</li>}
          {semCurva > 0 && <li>· {semCurva} produto(s) sem curva de vazão — ficam fora da calculadora.</li>}
          {configurado && emailOk && freteOk && CONTROLA_ESTOQUE && semGarantia === 0 && semCurva === 0 && <li>· Nenhuma. ✓</li>}
        </ul>
      </section>

      <section className="mt-6 rounded-caixa border border-linha bg-superficie">
        <h2 className="flex items-baseline gap-2 border-b border-linha px-4 py-3 text-[13.5px] font-extrabold">
          Faturamento por dia
          <span className="text-[11px] font-semibold text-mudo">últimos 30 dias · R$</span>
        </h2>
        <div className="p-3">
          <GraficoVendas dias={serie} />
        </div>
      </section>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <section className="rounded-caixa border border-linha bg-superficie">
          <h2 className="border-b border-linha px-4 py-3 text-[13.5px] font-extrabold">Pedidos recentes</h2>
          {recentes.length === 0 ? (
            <p className="p-4 text-[13px] text-mudo">Nenhum pedido ainda.</p>
          ) : (
            <table className="w-full text-[13px]">
              <tbody>
                {recentes.map((p) => (
                  <tr key={p.id} className="border-b border-linha last:border-0">
                    <td className="num px-4 py-2.5 font-bold">#{p.numero}</td>
                    <td className="px-2 py-2.5">{p.cliente.nome}</td>
                    <td className="px-2 py-2.5 text-mudo">{p.metodo.replace("_", " ")}</td>
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
                    {e.produto.nome.slice(0, 44)}
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

function Kpi({ r, v }: { r: string; v: string }) {
  return (
    <div className="rounded-caixa border border-linha bg-superficie p-4">
      <dt className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-mudo">{r}</dt>
      <dd className="num mt-1.5 text-2xl font-extrabold tracking-tight">{v}</dd>
    </div>
  );
}

