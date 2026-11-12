import Link from "next/link";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { CANAIS_PAINEL, painelVendas, SITUACOES, SITUACOES_PADRAO, type CanalPainel } from "@/lib/erp/vendas";
import { COR_CANAL, GraficoVendas } from "@/components/admin/grafico-vendas";
import { brl } from "@/lib/formato";
import { AtualizarSozinho } from "@/components/admin/atualizar-sozinho";

export const dynamic = "force-dynamic";
export const metadata = { title: "Painel de vendas" };

/**
 * Painel de vendas de todos os canais (o "Dashboard Mensal" do Bling), lido do
 * espelho. Filtros pela URL: de, ate (AAAA-MM-DD), canal, sit (ids separados por vírgula).
 */
type Params = { de?: string; ate?: string; canal?: string; sit?: string };

const RE_DIA = /^\d{4}-\d{2}-\d{2}$/;
const hojeSP = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
const somar = (iso: string, n: number) => {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const br = (iso: string) => iso.split("-").reverse().join("/");
const num = (v: number) => v.toLocaleString("pt-BR", { maximumFractionDigits: 0 });

function presets(hoje: string) {
  const mes = hoje.slice(0, 8) + "01";
  const fimMesPassado = somar(mes, -1);
  return [
    { r: "Hoje", de: hoje, ate: hoje },
    { r: "7 dias", de: somar(hoje, -6), ate: hoje },
    { r: "30 dias", de: somar(hoje, -29), ate: hoje },
    { r: "Este mês", de: mes, ate: hoje },
    { r: "Mês passado", de: fimMesPassado.slice(0, 8) + "01", ate: fimMesPassado },
  ];
}

function Variacao({ atual, anterior }: { atual: number; anterior: number }) {
  if (!anterior) return <span className="text-[12px] text-mudo">sem base no período anterior</span>;
  const p = ((atual - anterior) / anterior) * 100;
  const sobe = p >= 0;
  const Icone = sobe ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[12.5px] font-bold ${sobe ? "text-bom" : "text-critico"}`}>
      <Icone aria-hidden className="h-3.5 w-3.5" />
      {sobe ? "+" : ""}
      {p.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}%
    </span>
  );
}

export default async function Vendas({ searchParams }: { searchParams: Promise<Params> }) {
  const sp = await searchParams;
  const hoje = hojeSP();
  const mes = hoje.slice(0, 8) + "01";
  let de = RE_DIA.test(sp.de ?? "") ? sp.de! : mes;
  let ate = RE_DIA.test(sp.ate ?? "") ? sp.ate! : hoje;
  if (de > ate) [de, ate] = [ate, de];
  if (Date.parse(ate) - Date.parse(de) > 366 * 86_400_000) de = somar(ate, -365); // no máximo um ano
  const canal = (CANAIS_PAINEL as readonly string[]).includes(sp.canal ?? "") ? (sp.canal as CanalPainel) : null;
  const sit = sp.sit ? sp.sit.split(",").map(Number).filter((n) => SITUACOES.some((s) => s.id === n)) : SITUACOES_PADRAO;

  const p = await painelVendas({ de, ate, canal, situacoes: sit });
  const ticket = p.atual.pedidos ? p.atual.valor / p.atual.pedidos : 0;
  const ticketAnt = p.anterior.pedidos ? p.anterior.valor / p.anterior.pedidos : 0;
  const cobertura = p.atual.pedidos ? p.atual.comDetalhe / p.atual.pedidos : 1;
  const totalValor = p.porLoja.reduce((s, l) => s + l.valor, 0) || 1;
  const mediaDia = p.atual.pedidos / p.periodo.dias;

  const url = (m: Partial<Params>) => {
    const v = { de, ate, canal: canal ?? "", sit: sit.join(","), ...m };
    const q = new URLSearchParams();
    if (v.de) q.set("de", v.de);
    if (v.ate) q.set("ate", v.ate);
    if (v.canal) q.set("canal", v.canal);
    if (v.sit && v.sit !== SITUACOES_PADRAO.join(",")) q.set("sit", v.sit);
    return `/admin/vendas?${q}`;
  };
  const alternarSit = (id: number) => {
    const n = sit.includes(id) ? sit.filter((x) => x !== id) : [...sit, id];
    return url({ sit: (n.length ? n : SITUACOES_PADRAO).join(",") });
  };
  const chip = (on: boolean) =>
    `rounded-full border px-2.5 py-1 text-[12px] font-semibold ${on ? "border-marca bg-marca text-white" : "border-linha-2 text-tinta-2 hover:border-marca"}`;

  const kpis = [
    { r: "Valor total", v: brl(p.atual.valor), a: p.atual.valor, b: p.anterior.valor, ant: brl(p.anterior.valor) },
    { r: "Pedidos", v: num(p.atual.pedidos), a: p.atual.pedidos, b: p.anterior.pedidos, ant: `${num(p.anterior.pedidos)} pedidos` },
    { r: "Peças vendidas", v: num(p.atual.pecas), a: p.atual.pecas, b: p.anterior.pecas, ant: `${num(p.anterior.pecas)} peças` },
    { r: "Ticket médio", v: brl(ticket), a: ticket, b: ticketAnt, ant: brl(ticketAnt) },
  ];

  return (
    <div className="p-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight">Painel de vendas</h1>
          <p className="mt-1 text-[13px] text-tinta-2">
            Todos os canais do Bling · {br(de)} a {br(ate)} · comparado com {br(p.periodo.anterior.de)} a {br(p.periodo.anterior.ate)}
          </p>
        </div>
        <div className="text-right text-[12px] text-mudo">
          {p.ultimoAviso && Date.now() - p.ultimoAviso.getTime() < 3 * 3600_000 ? (
            <p className="font-bold text-bom">
              <span className="mr-1 inline-block h-2 w-2 animate-pulse rounded-full bg-bom align-middle" aria-hidden />
              Ao vivo com o Bling
            </p>
          ) : null}
          <p>
            {p.lidoEm ? `Último pedido lido às ${p.lidoEm.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}` : "Bling ainda não lido"}
            {" · "}atualiza sozinho a cada minuto
          </p>
          <AtualizarSozinho segundos={60} />
        </div>
      </div>

      {/* ── filtros, numa linha só ─────────────────────────────── */}
      <div className="mt-4 flex flex-wrap items-center gap-1.5">
        {presets(hoje).map((x) => (
          <Link key={x.r} href={url({ de: x.de, ate: x.ate })} className={chip(x.de === de && x.ate === ate)}>{x.r}</Link>
        ))}
        <form className="flex items-center gap-1.5">
          {canal && <input type="hidden" name="canal" value={canal} />}
          {sp.sit && <input type="hidden" name="sit" value={sp.sit} />}
          <input type="date" name="de" defaultValue={de} aria-label="De" className="rounded-lg border border-linha-2 bg-superficie px-2 py-1 text-[12px]" />
          <span className="text-[12px] text-mudo">a</span>
          <input type="date" name="ate" defaultValue={ate} aria-label="Até" className="rounded-lg border border-linha-2 bg-superficie px-2 py-1 text-[12px]" />
          <button className="rounded-lg bg-marca px-2.5 py-1 text-[12px] font-bold text-white">Aplicar</button>
        </form>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <Link href={url({ canal: "" })} className={chip(!canal)}>Todos os canais</Link>
        {CANAIS_PAINEL.map((c) => (
          <Link key={c} href={url({ canal: c })} className={chip(canal === c)}>
            <span className="mr-1 inline-block h-2 w-2 rounded-sm align-middle" style={{ background: COR_CANAL[c] }} aria-hidden />
            {c}
          </Link>
        ))}
        <span className="mx-1 h-4 w-px bg-linha-2" aria-hidden />
        {SITUACOES.map((s) => (
          <Link key={s.id} href={alternarSit(s.id)} className={chip(sit.includes(s.id))}>{s.r}</Link>
        ))}
      </div>

      {/* ── números do período ─────────────────────────────────── */}
      <dl className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.r} className="rounded-caixa border border-linha bg-superficie p-4">
            <dt className="text-[12px] font-semibold text-mudo">{k.r}</dt>
            <dd className="num mt-1 text-[26px] font-extrabold leading-tight tracking-tight">{k.v}</dd>
            <dd className="mt-1 flex items-center gap-2">
              <Variacao atual={k.a} anterior={k.b} />
              <span className="num text-[12px] text-mudo">antes {k.ant}</span>
            </dd>
          </div>
        ))}
      </dl>
      {cobertura < 0.98 && (
        <p className="mt-2 text-[12px] text-mudo">
          Peças vendidas e produtos contam {Math.round(cobertura * 100)}% dos pedidos do período: os itens dos pedidos mais antigos ainda estão sendo lidos do Bling.
        </p>
      )}

      {/* ── pedidos por dia ────────────────────────────────────── */}
      <section className="mt-5 rounded-caixa border border-linha bg-superficie p-5">
        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-[15px] font-extrabold">Pedidos por dia</h2>
          <p className="num text-[12.5px] text-tinta-2">média de {mediaDia.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} pedidos/dia</p>
        </div>
        <GraficoVendas dias={p.dias} canais={canal ? [canal] : CANAIS_PAINEL} />
      </section>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        {/* ── por canal (também é a tabela do gráfico) ─────────── */}
        <section className="rounded-caixa border border-linha bg-superficie p-5">
          <h2 className="text-[15px] font-extrabold">De onde vêm as vendas</h2>
          <table className="mt-3 w-full text-[13px]">
            <thead>
              <tr className="text-left text-[11.5px] uppercase tracking-wide text-mudo">
                <th className="pb-2 font-semibold">Canal</th>
                <th className="pb-2 text-right font-semibold">Pedidos</th>
                <th className="pb-2 text-right font-semibold">Valor</th>
                <th className="pb-2 text-right font-semibold">Ticket</th>
                <th className="w-[28%] pb-2 pl-3 font-semibold">% do valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-linha">
              {p.porLoja.map((l) => {
                const pct = (l.valor / totalValor) * 100;
                return (
                  <tr key={l.nome}>
                    <td className="py-2">
                      <span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm align-middle" style={{ background: COR_CANAL[l.canal] }} aria-hidden />
                      {l.nome}
                    </td>
                    <td className="num py-2 text-right">{num(l.pedidos)}</td>
                    <td className="num py-2 text-right font-semibold">{brl(l.valor)}</td>
                    <td className="num py-2 text-right text-tinta-2">{brl(l.pedidos ? l.valor / l.pedidos : 0)}</td>
                    <td className="py-2 pl-3">
                      <span className="flex items-center gap-2">
                        <span className="h-2 flex-1 rounded-full bg-superficie-2">
                          <span className="block h-2 rounded-full" style={{ width: `${Math.max(1, pct)}%`, background: COR_CANAL[l.canal] }} />
                        </span>
                        <span className="num w-10 text-right text-[12px] text-tinta-2">{pct.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%</span>
                      </span>
                    </td>
                  </tr>
                );
              })}
              {p.porLoja.length === 0 && (
                <tr><td colSpan={5} className="py-4 text-center text-mudo">Nenhum pedido no período.</td></tr>
              )}
            </tbody>
          </table>
        </section>

        {/* ── produtos ─────────────────────────────────────────── */}
        <section className="rounded-caixa border border-linha bg-superficie p-5">
          <h2 className="text-[15px] font-extrabold">Produtos mais vendidos</h2>
          <table className="mt-3 w-full text-[13px]">
            <thead>
              <tr className="text-left text-[11.5px] uppercase tracking-wide text-mudo">
                <th className="pb-2 font-semibold">Produto</th>
                <th className="pb-2 text-right font-semibold">Peças</th>
                <th className="pb-2 text-right font-semibold">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-linha">
              {p.produtos.map((x) => (
                <tr key={x.codigo ?? x.descricao}>
                  <td className="py-2 pr-2">
                    <span className="line-clamp-1">{x.descricao}</span>
                    {x.codigo && <span className="num font-mono text-[11px] text-mudo">{x.codigo}</span>}
                  </td>
                  <td className="num py-2 text-right font-semibold">{num(x.pecas)}</td>
                  <td className="num py-2 text-right text-tinta-2">{brl(x.valor)}</td>
                </tr>
              ))}
              {p.produtos.length === 0 && (
                <tr><td colSpan={3} className="py-4 text-center text-mudo">Sem itens lidos para o período.</td></tr>
              )}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}
