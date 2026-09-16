import { brl } from "@/lib/formato";

const pct = (n: number, de: number) =>
  de ? `${((n / de) * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%` : "0%";

/** O canal como a pessoa entende · "direto" sozinho parece erro de cadastro. */
export const nomeCanal = (k: string) => (k === "direto" ? "Acesso direto" : k.replace(" / ", " · "));

/** Tráfego de teste · a própria máquina e as prévias da Vercel não são clientes. */
const interno = (k: string) => /localhost|127\.0\.0\.1|vercel\.app/.test(k);

/**
 * A caixa de cada bloco do painel.
 *
 * Título e nota no alto, e à direita o que resume o bloco · um total, um link.
 * Sem linha divisória embaixo do título: o espaço já separa, e a linha a mais
 * em cada bloco era o que deixava a tela com cara de formulário.
 */
export function Caixa({
  titulo,
  nota,
  extra,
  semRecuo,
  className = "",
  children,
}: {
  titulo: string;
  nota?: string;
  extra?: React.ReactNode;
  semRecuo?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`flex flex-col rounded-xl border border-linha bg-superficie ${className}`}>
      <header className="flex flex-wrap items-start gap-x-6 gap-y-3 px-5 pb-3 pt-4">
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold tracking-tight text-tinta">{titulo}</h2>
          {nota && <p className="mt-0.5 text-[12.5px] text-mudo">{nota}</p>}
        </div>
        {extra && <div className="ml-auto">{extra}</div>}
      </header>
      <div className={semRecuo ? "pb-2" : "px-5 pb-5"}>{children}</div>
    </section>
  );
}

function Vazio({ texto }: { texto: string }) {
  return <p className="py-10 text-center text-[13px] text-mudo">{texto}</p>;
}

/** Barra horizontal: ponta arredondada, base reta, sobre um trilho claro. */
function Barra({ fracao, cor = "var(--color-dado)" }: { fracao: number; cor?: string }) {
  return (
    <div className="h-2 w-full rounded-[3px] bg-superficie-2">
      <div
        className="h-full rounded-r-[4px]"
        style={{ width: `${fracao > 0 ? Math.max(fracao * 100, 1.2) : 0}%`, background: cor }}
      />
    </div>
  );
}

/**
 * Funil de vendas.
 *
 * Conta visitantes, não eventos. Antes quem abria cinco produtos contava cinco
 * vezes, e o funil mostrava mais gente abrindo produto do que entrando na loja.
 *
 * A perda aparece ao lado de cada etapa, porque é ela que decide o que arrumar:
 * perder gente do carrinho para o checkout é frete ou prazo; perder da visita
 * para o produto é vitrine.
 */
export function Funil({
  sessoes,
  produto,
  carrinho,
  checkout,
  pedido,
}: {
  sessoes: number;
  produto: number;
  carrinho: number;
  checkout: number;
  pedido: number;
}) {
  if (!sessoes) {
    return (
      <Caixa titulo="Funil de vendas">
        <Vazio texto="Ainda não há visitas medidas no período." />
      </Caixa>
    );
  }

  const passos = [
    { r: "Visitaram a loja", n: sessoes },
    { r: "Abriram um produto", n: produto },
    { r: "Puseram no carrinho", n: carrinho },
    { r: "Foram ao checkout", n: checkout },
    { r: "Compraram", n: pedido },
  ];

  return (
    <Caixa titulo="Funil de vendas" nota="visitantes distintos em cada etapa">
      <ol className="space-y-4">
        {passos.map((p, i) => {
          const anterior = i ? passos[i - 1].n : 0;
          const saiu = i && anterior > p.n ? anterior - p.n : 0;
          return (
            <li key={p.r}>
              <div className="mb-1.5 flex items-baseline gap-3 text-[13.5px]">
                <span className="text-tinta-2">{p.r}</span>
                {saiu > 0 && (
                  <span className="num text-[12px] text-critico">
                    −{saiu.toLocaleString("pt-BR")} ({pct(saiu, anterior)})
                  </span>
                )}
                <span className="num ml-auto font-semibold text-tinta">{p.n.toLocaleString("pt-BR")}</span>
                <span className="num w-14 text-right text-[12.5px] text-mudo">{pct(p.n, sessoes)}</span>
              </div>
              <Barra fracao={p.n / sessoes} />
            </li>
          );
        })}
      </ol>
    </Caixa>
  );
}

/**
 * De onde chegam os visitantes, e quanto cada canal fatura.
 *
 * Visita sozinha engana: um canal pode trazer muita gente e nenhuma venda.
 * As duas colunas lado a lado são a comparação que decide onde investir.
 */
export function PorCanal({
  canais,
  pedidos,
}: {
  canais: { nome: string; sessoes: number }[];
  pedidos: { origem: string | null; total: number }[];
}) {
  const receita = new Map<string, number>();
  for (const p of pedidos) {
    const k = p.origem ?? "direto";
    receita.set(k, (receita.get(k) ?? 0) + p.total);
  }

  const linhas = canais
    .filter((c) => !interno(c.nome))
    .map((c) => ({ ...c, v: receita.get(c.nome) ?? 0 }))
    .sort((a, b) => b.v - a.v || b.sessoes - a.sessoes)
    .slice(0, 6);

  if (!linhas.length) {
    return (
      <Caixa titulo="Canais de entrada">
        <Vazio texto="Sem visitas medidas no período." />
      </Caixa>
    );
  }

  const total = linhas.reduce((s, l) => s + l.sessoes, 0);
  const colunas = "grid grid-cols-[minmax(0,1fr)_4.75rem_6.75rem] gap-3";

  return (
    <Caixa titulo="Canais de entrada" nota="visitantes e receita por origem">
      <div className={`${colunas} mb-2 text-[11.5px] font-medium text-mudo`}>
        <span>Canal</span>
        <span className="text-right">Visitantes</span>
        <span className="text-right">Receita</span>
      </div>
      <ul className="space-y-3.5">
        {linhas.map((l) => (
          <li key={l.nome}>
            <div className={`${colunas} mb-1.5 items-baseline text-[13.5px]`}>
              <span className="truncate text-tinta-2">{nomeCanal(l.nome)}</span>
              <span className="num text-right text-tinta">{l.sessoes.toLocaleString("pt-BR")}</span>
              <span className={`num text-right ${l.v ? "font-semibold text-tinta" : "text-tenue"}`}>
                {l.v ? brl(l.v) : "sem venda"}
              </span>
            </div>
            <Barra fracao={l.sessoes / total} />
          </li>
        ))}
      </ul>
    </Caixa>
  );
}

/** Onde estão os compradores. Diz onde o frete pesa e onde vale anunciar. */
export function PorEstado({ pedidos }: { pedidos: { uf: string; total: number }[] }) {
  const porUf = new Map<string, { n: number; v: number }>();
  for (const p of pedidos) {
    const a = porUf.get(p.uf) ?? { n: 0, v: 0 };
    porUf.set(p.uf, { n: a.n + 1, v: a.v + p.total });
  }
  const linhas = [...porUf.entries()]
    .map(([uf, d]) => ({ uf, ...d }))
    .sort((a, b) => b.v - a.v)
    .slice(0, 8);

  if (!linhas.length) {
    return (
      <Caixa titulo="Vendas por estado">
        <Vazio texto="Nenhuma venda paga no período." />
      </Caixa>
    );
  }

  const max = Math.max(...linhas.map((l) => l.v));

  return (
    <Caixa titulo="Vendas por estado" nota="onde estão os compradores">
      <ul className="space-y-3">
        {linhas.map((l) => (
          <li
            key={l.uf}
            className="grid grid-cols-[2.25rem_minmax(0,1fr)_5rem_6.75rem] items-center gap-3 text-[13.5px]"
          >
            <span className="grid h-6 place-items-center rounded-md bg-superficie-2 text-[12px] font-semibold text-tinta-2">
              {l.uf}
            </span>
            <Barra fracao={l.v / max} />
            <span className="num text-right text-[12.5px] text-mudo">
              {l.n} {l.n === 1 ? "pedido" : "pedidos"}
            </span>
            <span className="num text-right font-semibold text-tinta">{brl(l.v)}</span>
          </li>
        ))}
      </ul>
    </Caixa>
  );
}

/**
 * As cores seguem o meio de pagamento, não a posição na lista: PIX é sempre o
 * verde-azulado da marca PIX, esteja em primeiro ou em último. Validadas para
 * daltonismo · e cada uma vai com o nome ao lado, nunca sozinha.
 */
const METODOS: Record<string, { nome: string; cor: string }> = {
  PIX: { nome: "PIX", cor: "var(--color-dado-2)" },
  CARTAO_CREDITO: { nome: "Cartão de crédito", cor: "var(--color-dado)" },
  BOLETO: { nome: "Boleto", cor: "var(--color-dado-3)" },
};

/**
 * Meio de pagamento, com o parcelamento médio junto.
 *
 * Cada parcela a mais tem custo de antecipação: a média subir de três para
 * seis muda a margem sem mexer uma vírgula no faturamento.
 */
export function PorPagamento({
  pedidos,
}: {
  pedidos: { metodo: string; parcelas: number; total: number }[];
}) {
  if (!pedidos.length) {
    return (
      <Caixa titulo="Formas de pagamento">
        <Vazio texto="Nenhuma venda paga no período." />
      </Caixa>
    );
  }

  const porMetodo = new Map<string, { n: number; v: number; parcelas: number }>();
  for (const p of pedidos) {
    const a = porMetodo.get(p.metodo) ?? { n: 0, v: 0, parcelas: 0 };
    porMetodo.set(p.metodo, { n: a.n + 1, v: a.v + p.total, parcelas: a.parcelas + p.parcelas });
  }
  const total = pedidos.reduce((s, p) => s + p.total, 0);
  const linhas = [...porMetodo.entries()].sort((a, b) => b[1].v - a[1].v);
  const de = (m: string) => METODOS[m] ?? { nome: m, cor: "var(--color-dado)" };

  return (
    <Caixa titulo="Formas de pagamento" nota="participação na receita">
      <div
        className="flex h-2.5 gap-[2px] overflow-hidden rounded-[4px]"
        role="img"
        aria-label={linhas.map(([m, d]) => `${de(m).nome} ${pct(d.v, total)}`).join(", ")}
      >
        {linhas.map(([m, d]) => (
          <div key={m} style={{ width: `${(d.v / total) * 100}%`, background: de(m).cor }} />
        ))}
      </div>
      <ul className="mt-4 divide-y divide-linha">
        {linhas.map(([m, d]) => (
          <li key={m} className="flex items-center gap-3 py-3 text-[13.5px] first:pt-0 last:pb-0">
            <span className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ background: de(m).cor }} />
            <div className="min-w-0">
              <p className="text-tinta">{de(m).nome}</p>
              {m === "CARTAO_CREDITO" && (
                <p className="num text-[12px] text-mudo">
                  parcelamento médio de{" "}
                  {(d.parcelas / d.n).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}×
                </p>
              )}
            </div>
            <span className="num ml-auto text-[12.5px] text-mudo">
              {d.n} {d.n === 1 ? "pedido" : "pedidos"}
            </span>
            <span className="num w-24 text-right font-semibold text-tinta">{brl(d.v)}</span>
            <span className="num w-12 text-right text-[12.5px] text-mudo">{pct(d.v, total)}</span>
          </li>
        ))}
      </ul>
    </Caixa>
  );
}
