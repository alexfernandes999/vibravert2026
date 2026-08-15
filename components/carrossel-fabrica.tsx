"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";

/**
 * Carrossel em profundidade das fotos da fábrica.
 *
 * A foto do meio fica de frente e as vizinhas recuam, giradas e menores · o
 * olho entende na hora que há mais coisa para ver dos dois lados, sem precisar
 * de seta explicando.
 *
 * Anda sozinho porque a seção é prova, não catálogo: quem está rolando a
 * página não vai clicar para ver a fábrica, mas repara se ela se mover. Para
 * quando o mouse encosta, quando a aba sai de foco e quando alguém usa o
 * teclado · movimento que atrapalha quem está interagindo é movimento errado.
 *
 * O passo entre fotos usa transform e opacity, que o navegador anima na placa
 * de vídeo. Nada de reflow a cada quadro.
 */
export type FotoFabrica = {
  src: string;
  alt: string;
  titulo: string;
  texto: string;
  /** A placa da fachada fica no alto: cortar pelo centro comeria o nome. */
  posicao?: string;
};

const INTERVALO = 4200;

export function CarrosselFabrica({ fotos }: { fotos: FotoFabrica[] }) {
  const [atual, setAtual] = useState(0);
  const [parado, setParado] = useState(false);
  const total = fotos.length;
  const toque = useRef<number | null>(null);

  const ir = useCallback((n: number) => setAtual(((n % total) + total) % total), [total]);

  useEffect(() => {
    if (parado || total < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const t = setInterval(() => setAtual((a) => (a + 1) % total), INTERVALO);
    return () => clearInterval(t);
  }, [parado, total]);

  // A aba escondida continuaria trocando de foto e gastando bateria à toa.
  useEffect(() => {
    const v = () => setParado(document.hidden);
    document.addEventListener("visibilitychange", v);
    return () => document.removeEventListener("visibilitychange", v);
  }, []);

  /** Distância até o centro, pelo caminho mais curto do círculo. */
  const desvio = (i: number) => {
    const d = i - atual;
    if (d > total / 2) return d - total;
    if (d < -total / 2) return d + total;
    return d;
  };

  return (
    <div
      className="mt-8"
      onMouseEnter={() => setParado(true)}
      onMouseLeave={() => setParado(false)}
      onFocusCapture={() => setParado(true)}
      onBlurCapture={() => setParado(false)}
    >
      <div
        className="relative h-[290px] select-none sm:h-[360px] lg:h-[420px]"
        style={{ perspective: "1400px" }}
        onTouchStart={(e) => (toque.current = e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (toque.current === null) return;
          const d = e.changedTouches[0].clientX - toque.current;
          if (Math.abs(d) > 45) ir(atual + (d < 0 ? 1 : -1));
          toque.current = null;
        }}
        role="group"
        aria-roledescription="carrossel"
        aria-label="Fotos da fábrica"
      >
        {fotos.map((f, i) => {
          const d = desvio(i);
          const longe = Math.abs(d) > 2;
          return (
            <button
              key={f.src}
              type="button"
              aria-label={f.titulo}
              aria-current={d === 0}
              tabIndex={longe ? -1 : 0}
              onClick={() => (d === 0 ? null : ir(i))}
              onKeyDown={(e) => {
                if (e.key === "ArrowRight") ir(atual + 1);
                if (e.key === "ArrowLeft") ir(atual - 1);
              }}
              className="absolute left-1/2 top-0 h-full w-[74%] sm:w-[56%] lg:w-[46%]"
              style={{
                transform: `translateX(-50%) translateX(${d * 38}%) translateZ(${-Math.abs(d) * 190}px) rotateY(${d * -26}deg) scale(${d === 0 ? 1 : 0.94})`,
                opacity: longe ? 0 : d === 0 ? 1 : 0.55,
                zIndex: 10 - Math.abs(d),
                pointerEvents: longe ? "none" : "auto",
                transition: "transform 700ms cubic-bezier(.22,.9,.25,1), opacity 500ms ease",
                cursor: d === 0 ? "default" : "pointer",
              }}
            >
              <figure className="relative h-full overflow-hidden rounded-caixa border border-linha bg-superficie shadow-2xl shadow-black/25">
                <Image
                  src={f.src}
                  alt={f.alt}
                  fill
                  sizes="(min-width:1024px) 46vw, 74vw"
                  className={`object-cover ${f.posicao ?? "object-center"}`}
                  priority={i === 0}
                />

                {/* O texto só no cartão da frente: legenda em foto recuada e
                    girada não se lê, e ainda suja a composição. */}
                <figcaption
                  className="absolute inset-x-0 bottom-0 p-4 text-left transition-opacity duration-500 sm:p-5"
                  style={{
                    opacity: d === 0 ? 1 : 0,
                    background: "linear-gradient(to top, rgba(10,27,77,.92), rgba(10,27,77,.55) 55%, transparent)",
                  }}
                >
                  <span className="num text-[11px] font-extrabold tracking-[0.14em] text-white/70">
                    {String(i + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
                  </span>
                  <span className="mt-1 block text-[16px] font-extrabold leading-tight text-white sm:text-[18px]">
                    {f.titulo}
                  </span>
                  <span className="mt-1 block max-w-md text-[12.5px] leading-snug text-white/80 sm:text-[13.5px]">
                    {f.texto}
                  </span>
                </figcaption>
              </figure>
            </button>
          );
        })}
      </div>

      <div className="mt-5 flex items-center justify-center gap-3">
        <button
          onClick={() => ir(atual - 1)}
          aria-label="Foto anterior"
          className="grid h-9 w-9 place-items-center rounded-full border border-linha bg-superficie text-marca transition hover:border-marca hover:bg-marca-suave active:scale-95"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="h-4 w-4">
            <path d="M15 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <ul className="flex items-center gap-1.5">
          {fotos.map((f, i) => (
            <li key={f.src}>
              <button
                onClick={() => ir(i)}
                aria-label={`Ir para ${f.titulo}`}
                className={`block h-1.5 rounded-full transition-all duration-500 ${
                  i === atual ? "w-7 bg-marca" : "w-1.5 bg-linha-2 hover:bg-marca/50"
                }`}
              />
            </li>
          ))}
        </ul>

        <button
          onClick={() => ir(atual + 1)}
          aria-label="Próxima foto"
          className="grid h-9 w-9 place-items-center rounded-full border border-linha bg-superficie text-marca transition hover:border-marca hover:bg-marca-suave active:scale-95"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="h-4 w-4">
            <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}
