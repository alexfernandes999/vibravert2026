"use client";

import { useState } from "react";

/**
 * Pedidos por dia, empilhados por marketplace. Uma escala só (pedidos); o
 * valor aparece no tooltip, nunca num segundo eixo.
 *
 * Cores validadas (scripts/validate_palette.js do dataviz, modo claro, ordem
 * adjacente): ML, Shopee, Magalu, Amazon, Outros = slots 1–5 da paleta de
 * referência. Três ficam abaixo de 3:1 no fundo claro, por isso a legenda tem
 * rótulo e a tabela por canal fica logo abaixo.
 */
export const COR_CANAL: Record<string, string> = {
  "Mercado Livre": "#2a78d6",
  Shopee: "#eb6834",
  Magalu: "#1baf7a",
  Amazon: "#eda100",
  Outros: "#e87ba4",
};

type Dia = { dia: string; porCanal: Record<string, { pedidos: number; valor: number }> };

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const curto = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

export function GraficoVendas({ dias, canais }: { dias: Dia[]; canais: readonly string[] }) {
  const [sel, setSel] = useState<number | null>(null);
  const L = 720, A = 220, esq = 34, dir = 8, topo = 10, base = 24;
  const largura = L - esq - dir, altura = A - topo - base;
  const totais = dias.map((d) => canais.reduce((s, c) => s + (d.porCanal[c]?.pedidos ?? 0), 0));
  const max = Math.max(1, ...totais);
  // Escala "redonda" com 4 linhas de grade.
  const passo = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500].find((p) => p * 4 >= max) ?? Math.ceil(max / 4);
  const topoEscala = passo * 4;
  const y = (v: number) => topo + altura - (v / topoEscala) * altura;
  const banda = largura / dias.length;
  const barra = Math.max(2, Math.min(28, banda - 2));
  const cada = Math.ceil(dias.length / 10); // rótulo de data a cada N dias
  const s = sel !== null ? dias[sel] : null;

  return (
    <div className="relative">
      <ul className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-tinta-2" aria-label="Legenda">
        {canais.map((c) => (
          <li key={c} className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: COR_CANAL[c] }} aria-hidden />
            {c}
          </li>
        ))}
      </ul>
      <svg viewBox={`0 0 ${L} ${A}`} className="h-auto w-full" role="img" aria-label="Pedidos por dia, por marketplace" onMouseLeave={() => setSel(null)}>
        {[0, 1, 2, 3, 4].map((k) => (
          <g key={k}>
            <line x1={esq} x2={L - dir} y1={y(passo * k)} y2={y(passo * k)} stroke="#e7e5df" strokeWidth={1} />
            <text x={esq - 6} y={y(passo * k) + 3.5} textAnchor="end" fontSize={10} fill="#77756e">{passo * k}</text>
          </g>
        ))}
        {dias.map((d, i) => {
          const x = esq + i * banda + (banda - barra) / 2;
          let acum = 0;
          const segs = canais
            .map((c) => ({ c, v: d.porCanal[c]?.pedidos ?? 0 }))
            .filter((g) => g.v > 0);
          return (
            <g key={d.dia} opacity={sel === null || sel === i ? 1 : 0.45}>
              {segs.map((g, k) => {
                const y0 = y(acum), y1 = y(acum + g.v);
                acum += g.v;
                const h = Math.max(0, y0 - y1 - (k < segs.length - 1 ? 2 : 0)); // 2px de respiro entre camadas
                // Só a ponta da barra é arredondada (4px), e só em cima: a base fica reta no eixo.
                if (k < segs.length - 1) return <rect key={g.c} x={x} y={y1} width={barra} height={h} fill={COR_CANAL[g.c]} />;
                const r = Math.min(4, barra / 2, h);
                const d = `M${x},${y1 + h} V${y1 + r} Q${x},${y1} ${x + r},${y1} H${x + barra - r} Q${x + barra},${y1} ${x + barra},${y1 + r} V${y1 + h} Z`;
                return <path key={g.c} d={d} fill={COR_CANAL[g.c]} />;
              })}
              {i % cada === 0 && (
                <text x={x + barra / 2} y={A - 8} textAnchor="middle" fontSize={10} fill="#77756e">{curto(d.dia)}</text>
              )}
              {/* Alvo de hover maior que a barra. */}
              <rect x={esq + i * banda} y={topo} width={banda} height={altura} fill="#000" fillOpacity={0} onMouseEnter={() => setSel(i)} onFocus={() => setSel(i)} tabIndex={0} aria-label={`${curto(d.dia)}: ${totais[i]} pedidos`} />
            </g>
          );
        })}
      </svg>
      {s && sel !== null && (
        <div
          className="pointer-events-none absolute top-8 z-10 w-52 rounded-lg border border-linha bg-superficie p-2.5 text-[12px] shadow-lg"
          style={{ left: `clamp(0px, calc(${((esq + sel * banda + banda / 2) / L) * 100}% - 104px), calc(100% - 208px))` }}
        >
          <p className="mb-1 font-bold">
            {curto(s.dia)} · {totais[sel]} pedidos
          </p>
          {canais.map((c) => {
            const v = s.porCanal[c];
            if (!v?.pedidos) return null;
            return (
              <p key={c} className="flex items-center gap-1.5 text-tinta-2">
                <span className="h-2 w-2 rounded-sm" style={{ background: COR_CANAL[c] }} aria-hidden />
                {c}
                <span className="num ml-auto font-semibold text-tinta">{v.pedidos}</span>
                <span className="num w-16 text-right text-mudo">{brl(v.valor)}</span>
              </p>
            );
          })}
        </div>
      )}
    </div>
  );
}
