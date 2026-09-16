"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";

/**
 * Faturamento no tempo, em colunas.
 *
 * Coluna e não linha: venda é um valor por dia, não uma grandeza contínua. A
 * linha ligava dois dias com venda por uma rampa que atravessava dias vazios,
 * e com poucas vendas no mês desenhava um movimento que não aconteceu.
 *
 * O desenho é feito na largura real da caixa, medida no navegador. Antes o SVG
 * tinha 900 de largura fixa e era esticado até a tela: os números dos eixos
 * saíam deformados e o ponto de máximo virava um óvalo.
 *
 * Uma série só, então não há legenda · o título diz o que é. O valor de cada
 * coluna aparece ao passar o mouse ou com as setas do teclado, e fica também
 * numa tabela para leitor de tela.
 */
export type Ponto = { chave: string; rotulo: string; detalhe: string; total: number; pedidos: number };

const ALTURA = 264;
const M = { esq: 72, dir: 16, topo: 14, base: 32 };

const moeda = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** Rótulo do eixo: R$ 0, R$ 250, R$ 1,5 mil. */
function curto(v: number) {
  if (v >= 1000) return `R$ ${(v / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil`;
  return `R$ ${Math.round(v).toLocaleString("pt-BR")}`;
}

/** Degrau redondo do eixo · 1, 2, 2,5 ou 5 vezes uma potência de dez. */
function degrau(max: number, partes: number) {
  if (max <= 0) return 100;
  const bruto = max / partes;
  const mag = 10 ** Math.floor(Math.log10(bruto));
  const n = bruto / mag;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * mag;
}

/** Coluna com o topo arredondado e a base reta, apoiada na linha do zero. */
function coluna(x: number, y: number, w: number, h: number) {
  const r = Math.min(4, w / 2, h);
  return `M${x} ${y + h}V${y + r}Q${x} ${y} ${x + r} ${y}H${x + w - r}Q${x + w} ${y} ${x + w} ${y + r}V${y + h}Z`;
}

export function GraficoVendas({ pontos, vazio }: { pontos: Ponto[]; vazio: string }) {
  const caixa = useRef<HTMLDivElement>(null);
  const [largura, setLargura] = useState(0);
  const [foco, setFoco] = useState<number | null>(null);
  const idTabela = useId();

  useEffect(() => {
    const el = caixa.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setLargura(Math.round(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const n = pontos.length;
  const max = Math.max(0, ...pontos.map((p) => p.total));
  const passo = degrau(max, 4);
  const teto = passo * 4;
  const temDado = max > 0;

  const iw = Math.max(largura - M.esq - M.dir, 0);
  const ih = ALTURA - M.topo - M.base;
  const faixa = n ? iw / n : 0;
  const larguraColuna = Math.max(2, Math.min(24, faixa * 0.62));
  const y = (v: number) => M.topo + ih - (v / teto) * ih;
  const xFaixa = (i: number) => M.esq + i * faixa;

  // Rótulos do eixo sem encavalar: no máximo um a cada 64 px, e o último sempre.
  const cada = Math.max(1, Math.ceil(n / Math.max(1, Math.floor(iw / 64))));
  const ultimoRegular = Math.floor((n - 1) / cada) * cada;
  const mostrar = (i: number) =>
    i === n - 1 || (i % cada === 0 && !(i === ultimoRegular && n - 1 - i < cada * 0.6));

  const mover = (e: KeyboardEvent) => {
    if (!n) return;
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      const d = e.key === "ArrowRight" ? 1 : -1;
      setFoco((f) => Math.min(n - 1, Math.max(0, (f ?? (d > 0 ? -1 : n)) + d)));
    } else if (e.key === "Escape") {
      setFoco(null);
    }
  };

  const p = foco !== null ? pontos[foco] : null;
  const topoColuna = p ? Math.max(y(p.total), M.topo) : 0;
  const acima = topoColuna > 72;

  return (
    <div ref={caixa} className="relative" style={{ height: ALTURA }}>
      {largura > 0 && (
        <svg
          width={largura}
          height={ALTURA}
          role="img"
          aria-label={
            temDado
              ? `Faturamento no período. Maior valor: ${moeda(max)}. Use as setas para percorrer.`
              : "Nenhuma venda paga no período."
          }
          aria-describedby={idTabela}
          tabIndex={0}
          onKeyDown={mover}
          onBlur={() => setFoco(null)}
          onPointerLeave={() => setFoco(null)}
          className="block rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ciano/50"
        >
          {[0, 1, 2, 3, 4].map((k) => {
            const v = passo * k;
            return (
              <g key={k}>
                {k > 0 && (
                  <line
                    x1={M.esq}
                    x2={largura - M.dir}
                    y1={y(v)}
                    y2={y(v)}
                    stroke="var(--color-linha)"
                    strokeWidth={1}
                    shapeRendering="crispEdges"
                  />
                )}
                <text
                  x={M.esq - 12}
                  y={y(v)}
                  dy="0.32em"
                  textAnchor="end"
                  fontSize={11.5}
                  fill="var(--color-mudo)"
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  {curto(v)}
                </text>
              </g>
            );
          })}

          {foco !== null && (
            <rect x={xFaixa(foco)} y={M.topo} width={faixa} height={ih} fill="var(--color-superficie-2)" />
          )}

          {pontos.map((pt, i) => {
            if (pt.total <= 0) return null;
            const h = Math.max(1.5, y(0) - y(pt.total));
            const x = xFaixa(i) + (faixa - larguraColuna) / 2;
            return (
              <path
                key={pt.chave}
                d={coluna(x, y(0) - h, larguraColuna, h)}
                fill={foco === i ? "var(--color-marca)" : "var(--color-dado)"}
              />
            );
          })}

          {/* A linha do zero vem por cima das colunas, mais firme que a grade. */}
          <line
            x1={M.esq}
            x2={largura - M.dir}
            y1={y(0)}
            y2={y(0)}
            stroke="var(--color-linha-2)"
            strokeWidth={1}
            shapeRendering="crispEdges"
          />

          {pontos.map((pt, i) => {
            if (!mostrar(i)) return null;
            const fim = i === n - 1 && faixa < 44;
            return (
              <text
                key={`r${pt.chave}`}
                x={fim ? largura - M.dir : xFaixa(i) + faixa / 2}
                y={ALTURA - 10}
                textAnchor={fim ? "end" : "middle"}
                fontSize={11.5}
                fill={foco === i ? "var(--color-tinta)" : "var(--color-mudo)"}
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {pt.rotulo}
              </text>
            );
          })}

          {/* Alvo do mouse: a faixa inteira, não só a coluna pintada. */}
          {pontos.map((pt, i) => (
            <rect
              key={`h${pt.chave}`}
              x={xFaixa(i)}
              y={M.topo}
              width={faixa}
              height={ih + M.base}
              fill="transparent"
              onPointerEnter={() => setFoco(i)}
            />
          ))}
        </svg>
      )}

      {largura > 0 && !temDado && (
        <div className="pointer-events-none absolute inset-x-0 top-[42%] -translate-y-1/2 px-6 text-center">
          <p className="text-[14px] font-semibold text-tinta-2">Nenhuma venda paga no período</p>
          <p className="mt-1 text-[13px] text-mudo">{vazio}</p>
        </div>
      )}

      {p && largura > 0 && (
        <div
          role="status"
          className={`pointer-events-none absolute z-10 min-w-[140px] -translate-x-1/2 rounded-lg border border-linha bg-superficie px-3 py-2 shadow-lg shadow-tinta/10 ${acima ? "-translate-y-full" : ""}`}
          style={{
            left: Math.min(Math.max(xFaixa(foco!) + faixa / 2, 80), largura - 80),
            top: acima ? topoColuna - 10 : topoColuna + 14,
          }}
        >
          <p className="text-[15px] font-semibold tracking-tight text-tinta">{moeda(p.total)}</p>
          <p className="mt-0.5 whitespace-nowrap text-[12px] text-mudo">
            {p.pedidos === 0 ? "nenhum pedido" : p.pedidos === 1 ? "1 pedido" : `${p.pedidos} pedidos`}
            {" · "}
            {p.detalhe}
          </p>
        </div>
      )}

      <table id={idTabela} className="sr-only">
        <caption>Faturamento por período</caption>
        <thead>
          <tr>
            <th scope="col">Período</th>
            <th scope="col">Faturamento</th>
            <th scope="col">Pedidos</th>
          </tr>
        </thead>
        <tbody>
          {pontos.map((pt) => (
            <tr key={`t${pt.chave}`}>
              <td>{pt.detalhe}</td>
              <td>{moeda(pt.total)}</td>
              <td>{pt.pedidos}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
