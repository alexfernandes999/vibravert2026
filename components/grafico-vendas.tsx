/**
 * Faturamento por dia, últimos 30 dias.
 *
 * Uma série só, então não há legenda: o título já diz o que é. Marca fina,
 * grade recuada, e rótulo apenas nas pontas e no pico — número em cima de cada
 * ponto vira ruído e ninguém lê.
 *
 * Sem venda ainda, o gráfico não desenha uma linha reta em zero fingindo que
 * há dado: diz que não há.
 */
export function GraficoVendas({ dias }: { dias: { dia: string; total: number }[] }) {
  const temDado = dias.some((d) => d.total > 0);

  if (!temDado) {
    return (
      <div className="flex h-[190px] flex-col items-center justify-center gap-1 px-6 text-center">
        <p className="text-[13.5px] font-bold text-tinta-2">Ainda não há vendas</p>
        <p className="text-[12.5px] text-mudo">
          O gráfico começa a desenhar no primeiro pedido pago.
        </p>
      </div>
    );
  }

  const W = 620, H = 190, L = 46, R = 10, T = 14, B = 26;
  const iw = W - L - R, ih = H - T - B;
  const max = Math.max(...dias.map((d) => d.total));
  const teto = Math.ceil(max / 100) * 100 || 100;

  const px = (i: number) => L + (i / Math.max(dias.length - 1, 1)) * iw;
  const py = (v: number) => T + (1 - v / teto) * ih;

  const linha = dias.map((d, i) => `${i ? "L" : "M"}${px(i).toFixed(1)} ${py(d.total).toFixed(1)}`).join(" ");
  const area = `${linha} L${px(dias.length - 1).toFixed(1)} ${py(0)} L${L} ${py(0)} Z`;
  const pico = dias.reduce((a, b, i) => (b.total > dias[a].total ? i : a), 0);

  const brl = (n: number) =>
    n >= 1000 ? `${(n / 1000).toFixed(1).replace(".", ",")}k` : String(Math.round(n));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img"
      aria-label={`Faturamento diário dos últimos ${dias.length} dias. Máximo de R$ ${max.toFixed(2)}.`}>
      {[0, 1, 2, 3].map((k) => {
        const v = (teto / 3) * k;
        return (
          <g key={k}>
            <line x1={L} y1={py(v)} x2={W - R} y2={py(v)} stroke="var(--color-linha)" strokeWidth={1} />
            <text x={L - 8} y={py(v) + 3.5} textAnchor="end" fontSize="9.5" fill="var(--color-tenue)" fontWeight="600">
              {brl(v)}
            </text>
          </g>
        );
      })}

      <path d={area} fill="var(--color-marca)" opacity={0.1} />
      <path d={linha} fill="none" stroke="var(--color-marca)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={px(pico)} cy={py(dias[pico].total)} r={4} fill="var(--color-marca)" stroke="var(--color-superficie)" strokeWidth={2} />

      {[0, Math.floor(dias.length / 2), dias.length - 1].map((i) => (
        <text key={i} x={px(i)} y={H - 7} textAnchor={i === 0 ? "start" : i === dias.length - 1 ? "end" : "middle"}
          fontSize="9.5" fill="var(--color-tenue)" fontWeight="600">
          {dias[i].dia}
        </text>
      ))}
    </svg>
  );
}
