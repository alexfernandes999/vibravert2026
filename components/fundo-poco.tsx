/**
 * Fundo da seção de matérias: um poço em corte, sobre o mapa do Brasil.
 *
 * A seção fala de água subterrânea, e o assunto é literalmente o que existe
 * embaixo do chão. Em vez de uma textura decorativa qualquer, o fundo desenha
 * o que o texto conta: o terreno, o lençol, o poço tubular e a bomba lá no
 * fundo, sobre a silhueta do país.
 *
 * Fica em opacidade baixa e marcado como decorativo. É atmosfera, não
 * informação: quem usa leitor de tela não perde nada, e quem lê não briga com
 * o texto por cima.
 *
 * O mapa é uma silhueta estilizada, não cartografia. Serve como forma
 * reconhecível ao fundo, e é por isso que fica bem apagado.
 */
export function FundoPoco({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 800 460"
      aria-hidden
      focusable="false"
      className={className}
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        {/* O lençol some para baixo, senão vira uma faixa dura no meio. */}
        <linearGradient id="lencol" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-marca)" stopOpacity="0.16" />
          <stop offset="100%" stopColor="var(--color-marca)" stopOpacity="0" />
        </linearGradient>
        <pattern id="solo" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
          <line x1="0" y1="0" x2="0" y2="14" stroke="var(--color-marca)" strokeWidth="1" strokeOpacity="0.13" />
        </pattern>
      </defs>

      {/* ── silhueta do Brasil ────────────────────────────────────── */}
      <g opacity="0.09" transform="translate(505 40) scale(1.02)">
        <path
          fill="var(--color-marca)"
          d="M96 18c8 2 12 9 20 10 7 1 14-3 20 1 5 4 4 12 9 16 6 5 15 3 20 9 4 5 2 13 6 18 5 6 15 5 19 12 4 6 0 14 2 21 2 8 10 12 10 20 0 9-9 14-12 22-3 7 0 16-4 22-5 7-16 6-22 12-6 5-6 15-12 20-7 6-18 3-25 8-7 4-9 14-17 17-8 3-16-3-24-2-9 1-15 9-24 8-9-1-13-10-20-14-8-4-18-1-24-7-6-5-4-15-8-21-5-8-16-9-19-18-3-8 4-16 3-24-1-9-10-16-8-25 2-8 12-11 17-18 5-6 4-16 10-21 6-6 16-4 23-8 7-4 10-14 18-17 7-3 15 2 22 0 7-2 11-11 20-11Z"
        />
      </g>

      {/* ── corte do terreno ──────────────────────────────────────── */}
      <path d="M0 150 Q120 132 240 148 T500 142 T800 156 L800 460 L0 460Z" fill="url(#solo)" />
      <path
        d="M0 150 Q120 132 240 148 T500 142 T800 156"
        fill="none"
        stroke="var(--color-marca)"
        strokeOpacity="0.3"
        strokeWidth="2"
      />

      {/* lençol freático */}
      <rect x="0" y="250" width="800" height="210" fill="url(#lencol)" />
      <path
        d="M0 250 q40 -7 80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0"
        fill="none"
        stroke="var(--color-marca)"
        strokeOpacity="0.28"
        strokeWidth="1.6"
      />

      {/* ── o poço ───────────────────────────────────────────────── */}
      <g stroke="var(--color-marca)" strokeOpacity="0.42" fill="none" strokeWidth="2.2">
        <line x1="150" y1="144" x2="150" y2="420" />
        <line x1="196" y1="146" x2="196" y2="420" />
        {/* boca do poço */}
        <path d="M138 144h70" strokeWidth="4" strokeLinecap="round" />
      </g>

      {/* a bomba, no fundo e submersa */}
      <g transform="translate(158 330)">
        <rect width="30" height="52" rx="6" fill="var(--color-marca)" fillOpacity="0.3" />
        <rect x="7" y="-11" width="16" height="11" rx="2.5" fill="var(--color-marca)" fillOpacity="0.24" />
        <g stroke="var(--color-marca)" strokeOpacity="0.4" strokeWidth="1.6">
          <line x1="6" y1="14" x2="24" y2="14" />
          <line x1="6" y1="24" x2="24" y2="24" />
          <line x1="6" y1="34" x2="24" y2="34" />
        </g>
      </g>

      {/* mangueira subindo até a caixa d'água */}
      <path
        d="M173 319 V196 Q173 172 200 168 H300"
        fill="none"
        stroke="var(--color-marca)"
        strokeOpacity="0.34"
        strokeWidth="3.4"
        strokeLinecap="round"
      />
      <g transform="translate(300 138)" fill="var(--color-marca)" fillOpacity="0.22">
        <path d="M0 30 L0 8 Q0 0 8 0 H56 Q64 0 64 8 V30Z" />
      </g>
    </svg>
  );
}
