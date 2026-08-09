"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Revela os blocos conforme entram na tela.
 *
 * Duas travas de segurança, porque conteúdo escondido atrás de animação é o
 * pior defeito possível numa loja — a página fica com um vão branco enorme e
 * ninguém entende por quê:
 *
 * 1. O efeito depende do caminho. Na versão anterior ele rodava a cada
 *    renderização e a limpeza desconectava o observador antes de ele disparar,
 *    deixando meia página invisível.
 * 2. Um tempo limite revela tudo de qualquer jeito. Se o observador falhar,
 *    se a hidratação demorar ou se o navegador for antigo, o conteúdo aparece.
 */
export function Revelar() {
  const caminho = usePathname();

  useEffect(() => {
    const alvos = () => document.querySelectorAll<HTMLElement>(".revelar:not(.revelado)");
    const mostrar = (e: Element) => e.classList.add("revelado");

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      alvos().forEach(mostrar);
      return;
    }

    const obs = new IntersectionObserver(
      (entradas) => {
        entradas.forEach((e, i) => {
          if (!e.isIntersecting) return;
          const el = e.target as HTMLElement;
          el.style.transitionDelay = `${Math.min(i, 6) * 55}ms`;
          mostrar(el);
          obs.unobserve(el);
        });
      },
      { rootMargin: "0px 0px -40px 0px", threshold: 0.05 },
    );

    alvos().forEach((e) => obs.observe(e));

    // rede de segurança: nada fica invisível por mais de 1,2 s
    const t = setTimeout(() => alvos().forEach(mostrar), 1200);

    return () => {
      clearTimeout(t);
      obs.disconnect();
    };
  }, [caminho]);

  return null;
}
