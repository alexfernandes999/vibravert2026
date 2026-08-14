/**
 * Faixa de avisos em movimento.
 *
 * Um texto parado nessa altura da página vira parte do cenário e ninguém lê.
 * Em movimento contínuo, os três argumentos que mais pesam nesta categoria —
 * telefone que atende, entrega no país inteiro e fábrica própria — passam
 * pelos olhos de quem está decidindo.
 *
 * A lista é duplicada no HTML porque o laço precisa de duas cópias para
 * emendar sem salto. A segunda fica escondida dos leitores de tela, senão o
 * conteúdo é anunciado duas vezes.
 */

import { TELEFONE } from "@/lib/contato";
const AVISOS = [
  {
    icone: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-[18px] w-[18px]">
        <path d="M1.5 6.5h13v11h-13z" />
        <path d="M14.5 10h4l3.5 3.5v4h-7.5z" />
        <circle cx="6" cy="18.5" r="2" />
        <circle cx="18" cy="18.5" r="2" />
      </svg>
    ),
    texto: "Frete grátis em todas as bombas · sem valor mínimo",
  },
  {
    icone: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-[18px] w-[18px]">
        <path d="M4 4h4l2 5-2.5 1.5a12 12 0 006 6L15 14l5 2v4a1 1 0 01-1.1 1A17 17 0 013 5.1 1 1 0 014 4z" />
      </svg>
    ),
    texto: `Vibra Phone ${TELEFONE} · falamos de bomba, não é SAC`,
  },
  {
    icone: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-[18px] w-[18px]">
        <path d="M3 21V9l6-4 6 4v12" />
        <path d="M15 21V11h6v10M1 21h22M7 13h2M7 17h2" />
      </svg>
    ),
    texto: "Fábrica e assistência técnica própria em São Paulo · entrega nos 27 estados",
  },
  {
    icone: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-[18px] w-[18px]">
        <path d="M12 3l8 3v6c0 5-3.4 8.1-8 9-4.6-.9-8-4-8-9V6z" />
        <path d="M9 12l2 2 4-4" />
      </svg>
    ),
    texto: "10% de desconto no PIX · cartão em até 10× sem juros",
  },
];

export function FaixaAvisos() {
  const fita = (oculto = false) => (
    <ul className="flex shrink-0 items-center" aria-hidden={oculto || undefined}>
      {AVISOS.map((a, i) => (
        <li key={i} className="flex items-center gap-3 whitespace-nowrap px-8 text-[13.5px] font-bold">
          <span className="text-ouro">{a.icone}</span>
          {a.texto}
          <span aria-hidden className="ml-5 h-1 w-1 rounded-full bg-ouro/50" />
        </li>
      ))}
    </ul>
  );

  return (
    <div className="overflow-hidden border-b border-white/10 bg-marca py-2.5 text-white">
      <div className="fita flex w-max">
        {fita()}
        {fita(true)}
      </div>
    </div>
  );
}
