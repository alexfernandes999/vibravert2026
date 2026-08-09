"use client";

import { useEffect } from "react";

/**
 * Revela os blocos conforme entram na tela.
 *
 * Um observador só, delegado por classe, em vez de um componente por bloco:
 * envolver cada cartão num wrapper de cliente arrastaria a árvore inteira para
 * o navegador e jogaria fora a renderização no servidor — caro demais para uma
 * animação.
 *
 * Quem pediu menos movimento no sistema não recebe nenhum: o conteúdo aparece
 * direto, sem esperar o observador.
 */
export function Revelar() {
  useEffect(() => {
    const alvos = document.querySelectorAll<HTMLElement>(".revelar:not(.revelado)");
    const menos = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (menos) {
      alvos.forEach((e) => e.classList.add("revelado"));
      return;
    }

    const obs = new IntersectionObserver(
      (entradas) => {
        entradas.forEach((e, i) => {
          if (!e.isIntersecting) return;
          const el = e.target as HTMLElement;
          // escalonamento curto: a grade entra em cascata, não de uma vez
          el.style.transitionDelay = `${Math.min(i, 6) * 55}ms`;
          el.classList.add("revelado");
          obs.unobserve(el);
        });
      },
      { rootMargin: "0px 0px -60px 0px", threshold: 0.08 },
    );

    alvos.forEach((e) => obs.observe(e));
    return () => obs.disconnect();
  });

  return null;
}
