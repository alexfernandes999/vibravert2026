/**
 * Fundo da seção de matérias: o mapa do Brasil com um poço em corte dentro.
 *
 * A seção fala de água subterrânea, e o assunto é literalmente o que existe
 * embaixo do chão do país. O mapa dá o lugar; o poço, o assunto.
 *
 * A primeira versão espalhava hachura de solo e ondinhas de lençol por toda a
 * largura, e virava ruído atrás do texto. Aqui o desenho é um só objeto, à
 * direita, longe da coluna de leitura.
 *
 * É decorativo: fica marcado como tal, e nada do que ele mostra é informação
 * que só exista aqui.
 */
export function FundoPoco({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 420 460"
      aria-hidden
      focusable="false"
      className={className}
      preserveAspectRatio="xMaxYMid meet"
    >
      <defs>
        {/* O poço só aparece dentro do mapa: o recorte é o que amarra os dois
            desenhos num só, em vez de um por cima do outro. */}
        <clipPath id="mapa-br">
          <path d="M186 12c14 6 21 22 36 25 13 3 27-4 38 4 9 7 8 21 16 29 10 10 27 7 34 19 6 11 0 25 4 37 5 15 21 22 21 38 0 17-18 26-24 42-6 14-1 31-9 44-9 14-31 12-43 23-11 10-11 28-23 37-13 11-33 5-46 15-13 9-16 27-32 32-15 5-30-7-45-5-16 2-27 17-42 14-16-3-22-20-34-30-13-10-32-4-42-16-10-11-6-28-13-41-9-15-29-18-33-35-4-16 9-30 7-46-2-16-19-30-14-46 5-15 24-19 33-33 9-13 6-31 18-41 11-10 30-6 43-14 12-8 17-26 32-31 13-5 27 5 41 1 13-3 20-21 35-21Z" />
        </clipPath>
      </defs>

      {/* silhueta do país */}
      <path
        d="M186 12c14 6 21 22 36 25 13 3 27-4 38 4 9 7 8 21 16 29 10 10 27 7 34 19 6 11 0 25 4 37 5 15 21 22 21 38 0 17-18 26-24 42-6 14-1 31-9 44-9 14-31 12-43 23-11 10-11 28-23 37-13 11-33 5-46 15-13 9-16 27-32 32-15 5-30-7-45-5-16 2-27 17-42 14-16-3-22-20-34-30-13-10-32-4-42-16-10-11-6-28-13-41-9-15-29-18-33-35-4-16 9-30 7-46-2-16-19-30-14-46 5-15 24-19 33-33 9-13 6-31 18-41 11-10 30-6 43-14 12-8 17-26 32-31 13-5 27 5 41 1 13-3 20-21 35-21Z"
        fill="var(--color-marca)"
        fillOpacity="0.07"
        stroke="var(--color-marca)"
        strokeOpacity="0.2"
        strokeWidth="2"
      />

      {/* ── o poço, recortado pelo mapa ───────────────────────────── */}
      <g clipPath="url(#mapa-br)">
        {/* linha do terreno */}
        <path
          d="M0 168 Q90 156 180 168 T420 166"
          fill="none"
          stroke="var(--color-marca)"
          strokeOpacity="0.28"
          strokeWidth="2.4"
        />
        {/* lençol freático, em bloco sólido e discreto */}
        <rect x="0" y="268" width="420" height="240" fill="var(--color-marca)" fillOpacity="0.07" />
        <path
          d="M0 268 q35 -6 70 0 t70 0 t70 0 t70 0 t70 0 t70 0"
          fill="none"
          stroke="var(--color-marca)"
          strokeOpacity="0.24"
          strokeWidth="1.8"
        />

        {/* a perfuração */}
        <g stroke="var(--color-marca)" strokeOpacity="0.34" strokeWidth="2.4" fill="none">
          <line x1="176" y1="162" x2="176" y2="404" />
          <line x1="216" y1="162" x2="216" y2="404" />
          <path d="M164 162h64" strokeWidth="4.5" strokeLinecap="round" />
        </g>

        {/* a bomba, submersa */}
        <g transform="translate(182 322)">
          <rect width="28" height="50" rx="6" fill="var(--color-marca)" fillOpacity="0.26" />
          <rect x="6" y="-10" width="16" height="10" rx="2.5" fill="var(--color-marca)" fillOpacity="0.2" />
          <g stroke="var(--color-marca)" strokeOpacity="0.32" strokeWidth="1.6">
            <line x1="6" y1="14" x2="22" y2="14" />
            <line x1="6" y1="24" x2="22" y2="24" />
            <line x1="6" y1="34" x2="22" y2="34" />
          </g>
        </g>

        {/* a mangueira sobe até a caixa d'água */}
        <path
          d="M196 312 V214 Q196 190 222 186 H278"
          fill="none"
          stroke="var(--color-marca)"
          strokeOpacity="0.3"
          strokeWidth="3.4"
          strokeLinecap="round"
        />
        <path
          d="M272 186 v-22 q0-8 8-8 h40 q8 0 8 8 v22Z"
          fill="var(--color-marca)"
          fillOpacity="0.18"
        />
      </g>
    </svg>
  );
}
