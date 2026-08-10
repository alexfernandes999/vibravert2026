import { brl } from "@/lib/formato";

const pct = (n: number, de: number) => (de ? `${((n / de) * 100).toFixed(1)}%` : " ");

function Caixa({ titulo, nota, children }: { titulo: string; nota?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-caixa border border-linha bg-superficie">
      <h2 className="flex flex-wrap items-baseline gap-2 border-b border-linha px-4 py-3 text-[13.5px] font-extrabold">
        {titulo}
        {nota && <span className="text-[11px] font-semibold text-mudo">{nota}</span>}
      </h2>
      <div className="p-4">{children}</div>
    </section>
  );
}

function Vazio({ texto }: { texto: string }) {
  return <p className="py-6 text-center text-[12.8px] text-mudo">{texto}</p>;
}

/**
 * Funil de vendas.
 *
 * A queda entre dois degraus é o número que importa — não o total de cada um.
 * Por isso a perda aparece ao lado de cada passo: é onde se decide o que
 * arrumar primeiro. Perder gente do carrinho para o checkout é problema de
 * frete ou de prazo; perder da visita para o produto é problema de vitrine.
 */
export function Funil({
  visita, produto, carrinho, checkout, pedido,
}: {
  visita: number; produto: number; carrinho: number; checkout: number; pedido: number;
}) {
  const passos = [
    { r: "Visitaram a loja", n: visita },
    { r: "Abriram um produto", n: produto },
    { r: "Puseram no carrinho", n: carrinho },
    { r: "Foram ao checkout", n: checkout },
    { r: "Compraram", n: pedido },
  ];
  const topo = Math.max(visita, 1);

  if (!visita && !carrinho) {
    return (
      <Caixa titulo="Funil de vendas">
        <Vazio texto="Ainda não há tráfego medido. O funil se desenha sozinho com as primeiras visitas." />
      </Caixa>
    );
  }

  return (
    <Caixa titulo="Funil de vendas" nota="sessões distintas">
      <ol className="space-y-2.5">
        {passos.map((p, i) => {
          const anterior = i ? passos[i - 1].n : null;
          const perda = anterior && anterior > p.n ? anterior - p.n : 0;
          return (
            <li key={p.r}>
              <div className="flex items-baseline gap-2 text-[12.8px]">
                <span className="font-semibold">{p.r}</span>
                <span className="num ml-auto font-extrabold">{p.n}</span>
                <span className="num w-14 text-right text-[11.5px] text-mudo">{pct(p.n, topo)}</span>
              </div>
              <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-superficie-2">
                <div
                  className="h-full rounded-full bg-marca"
                  style={{ width: `${Math.max((p.n / topo) * 100, p.n ? 2 : 0)}%` }}
                />
              </div>
              {perda > 0 && (
                <p className="num mt-1 text-[11px] text-critico">
                  −{perda} aqui ({pct(perda, anterior!)} de queda)
                </p>
              )}
            </li>
          );
        })}
      </ol>
    </Caixa>
  );
}

/**
 * De onde entra a gente, e quanto cada canal fatura.
 *
 * Sessão sozinha engana: um canal pode trazer muita visita e nenhuma venda.
 * Por isso as duas colunas ficam lado a lado — é a comparação que decide onde
 * investir.
 */
export function PorCanal({
  canais, pedidos,
}: {
  canais: { nome: string; sessoes: number }[];
  pedidos: { origem: string | null; total: number }[];
}) {
  const receita = new Map<string, { n: number; v: number }>();
  for (const p of pedidos) {
    const k = p.origem ?? "direto";
    const a = receita.get(k) ?? { n: 0, v: 0 };
    receita.set(k, { n: a.n + 1, v: a.v + p.total });
  }

  const linhas = canais
    .map((c) => ({ ...c, ...(receita.get(c.nome) ?? { n: 0, v: 0 }) }))
    .sort((a, b) => b.v - a.v || b.sessoes - a.sessoes)
    .slice(0, 7);

  if (!linhas.length) {
    return (
      <Caixa titulo="De onde estão entrando">
        <Vazio texto="Sem tráfego medido no período." />
      </Caixa>
    );
  }

  const maxS = Math.max(...linhas.map((l) => l.sessoes), 1);

  return (
    <Caixa titulo="De onde estão entrando" nota="sessões e receita por canal">
      <ul className="space-y-3">
        {linhas.map((l) => (
          <li key={l.nome}>
            <div className="flex items-baseline gap-2 text-[12.8px]">
              <span className="font-semibold">{l.nome}</span>
              <span className="num ml-auto text-mudo">{l.sessoes} sessões</span>
              <span className="num w-24 text-right font-extrabold">{l.v ? brl(l.v) : " "}</span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-superficie-2">
              <div className="h-full rounded-full bg-marca-claro" style={{ width: `${(l.sessoes / maxS) * 100}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </Caixa>
  );
}

/** Onde estão os compradores. Define onde o frete dói e onde vale anunciar. */
export function PorEstado({ pedidos }: { pedidos: { uf: string; total: number }[] }) {
  const porUf = new Map<string, { n: number; v: number }>();
  for (const p of pedidos) {
    const a = porUf.get(p.uf) ?? { n: 0, v: 0 };
    porUf.set(p.uf, { n: a.n + 1, v: a.v + p.total });
  }
  const linhas = [...porUf.entries()].map(([uf, d]) => ({ uf, ...d })).sort((a, b) => b.v - a.v).slice(0, 8);

  if (!linhas.length) {
    return (
      <Caixa titulo="Para onde vendemos">
        <Vazio texto="Nenhum pedido no período." />
      </Caixa>
    );
  }

  const max = Math.max(...linhas.map((l) => l.v));

  return (
    <Caixa titulo="Para onde vendemos" nota="por estado">
      <ul className="space-y-2.5">
        {linhas.map((l) => (
          <li key={l.uf} className="flex items-center gap-3">
            <span className="num w-7 shrink-0 text-[13px] font-extrabold text-marca">{l.uf}</span>
            <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-superficie-2">
              <span className="block h-full rounded-full bg-marca" style={{ width: `${(l.v / max) * 100}%` }} />
            </span>
            <span className="num w-10 shrink-0 text-right text-[11.5px] text-mudo">{l.n}</span>
            <span className="num w-24 shrink-0 text-right text-[12.5px] font-bold">{brl(l.v)}</span>
          </li>
        ))}
      </ul>
    </Caixa>
  );
}

const NOME_METODO: Record<string, string> = {
  PIX: "PIX",
  CARTAO_CREDITO: "Cartão de crédito",
  BOLETO: "Boleto",
};

/**
 * Meio de pagamento com o parcelamento médio junto.
 *
 * Cada parcela a mais tem custo de antecipação: saber que a média subiu de
 * três para seis muda a margem sem que o faturamento mude uma vírgula.
 */
export function PorPagamento({
  pedidos,
}: {
  pedidos: { metodo: string; parcelas: number; total: number }[];
}) {
  if (!pedidos.length) {
    return (
      <Caixa titulo="Como pagaram">
        <Vazio texto="Nenhum pedido no período." />
      </Caixa>
    );
  }

  const porMetodo = new Map<string, { n: number; v: number; parcelas: number }>();
  for (const p of pedidos) {
    const a = porMetodo.get(p.metodo) ?? { n: 0, v: 0, parcelas: 0 };
    porMetodo.set(p.metodo, { n: a.n + 1, v: a.v + p.total, parcelas: a.parcelas + p.parcelas });
  }

  const total = pedidos.reduce((s, p) => s + p.total, 0);
  const cores: Record<string, string> = {
    PIX: "bg-[#0E8CAB]",
    CARTAO_CREDITO: "bg-[#C9601A]",
    BOLETO: "bg-[#6A4CB8]",
  };

  return (
    <Caixa titulo="Como pagaram" nota="participação na receita">
      <ul className="space-y-3.5">
        {[...porMetodo.entries()].sort((a, b) => b[1].v - a[1].v).map(([m, d]) => (
          <li key={m}>
            <div className="flex items-baseline gap-2 text-[12.8px]">
              <span className={`h-2.5 w-2.5 shrink-0 rounded-sm ${cores[m] ?? "bg-marca"}`} />
              <span className="font-semibold">{NOME_METODO[m] ?? m}</span>
              <span className="num ml-auto text-mudo">{d.n} pedidos</span>
              <span className="num w-16 text-right font-extrabold">{pct(d.v, total)}</span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-superficie-2">
              <div className={`h-full rounded-full ${cores[m] ?? "bg-marca"}`} style={{ width: pct(d.v, total) }} />
            </div>
            {m === "CARTAO_CREDITO" && (
              <p className="num mt-1 text-[11px] text-mudo">
                parcelamento médio de {(d.parcelas / d.n).toFixed(1)}× · cada parcela a mais tem custo
              </p>
            )}
          </li>
        ))}
      </ul>
    </Caixa>
  );
}
