/**
 * Corte de um poço, com a bomba submersa trabalhando.
 *
 * A seção fala de água subterrânea, e o desenho mostra exatamente o que o
 * texto conta: as camadas do terreno, o lençol freático, a perfuração descendo
 * e a bomba lá no fundo, empurrando água até a caixa.
 *
 * A silhueta do Brasil fica atrás, bem apagada, dando o lugar sem competir com
 * o corte. As primeiras versões espalhavam hachura por toda a largura e
 * viravam sujeira atrás do texto · aqui é um objeto só, à direita da coluna de
 * leitura.
 *
 * Tudo em tokens da marca, então acompanha o tema claro e o escuro sozinho.
 */
export function FundoPoco({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 460 520"
      aria-hidden
      focusable="false"
      className={className}
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <linearGradient id="ceu" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-marca)" stopOpacity="0.05" />
          <stop offset="100%" stopColor="var(--color-marca)" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="agua" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-marca)" stopOpacity="0.2" />
          <stop offset="100%" stopColor="var(--color-marca)" stopOpacity="0.06" />
        </linearGradient>
        {/* Areia e cascalho: pontinhos, do jeito que geologia se desenha. */}
        <pattern id="areia" width="16" height="16" patternUnits="userSpaceOnUse">
          <circle cx="4" cy="4" r="1.3" fill="var(--color-marca)" fillOpacity="0.16" />
          <circle cx="12" cy="10" r="1" fill="var(--color-marca)" fillOpacity="0.12" />
        </pattern>
        <pattern id="rocha" width="22" height="14" patternUnits="userSpaceOnUse">
          <path d="M0 7h22M11 0v7M0 14h22M5 7v7" stroke="var(--color-marca)" strokeOpacity="0.13" strokeWidth="1.2" fill="none" />
        </pattern>
      </defs>

      {/* silhueta do país, ao fundo */}
      <path
        d="M243 40c16 7 24 25 41 28 15 4 30-4 43 5 10 8 9 24 18 33 11 11 30 8 39 21 7 13 0 28 5 42 6 17 24 25 24 43 0 19-20 30-27 48-7 16-1 35-10 50-10 16-35 14-49 26-13 12-13 32-26 42-15 13-38 6-52 17-15 11-18 31-36 37-17 6-34-8-51-6-18 2-31 19-48 16-18-3-25-23-39-34-15-12-36-5-48-18-11-13-7-32-15-47-10-17-33-20-37-40-5-18 10-34 8-52-2-18-22-34-16-52 6-17 27-22 38-38 10-15 7-35 20-47 13-11 34-7 49-16 14-9 19-30 36-35 15-6 31 6 47 1 15-4 23-24 40-24Z"
        fill="var(--color-marca)"
        fillOpacity="0.05"
        stroke="var(--color-marca)"
        strokeOpacity="0.14"
        strokeWidth="2"
      />

      {/* ── acima do solo ─────────────────────────────────────────── */}
      <rect x="40" y="30" width="380" height="140" fill="url(#ceu)" />

      {/* caixa d'água sobre a laje, que é o destino da água */}
      <g transform="translate(300 66)">
        <path d="M6 14 Q6 4 18 4 h44 q12 0 12 10 v44 q0 8-10 8 H16 q-10 0-10-8Z"
          fill="var(--color-marca)" fillOpacity="0.14"
          stroke="var(--color-marca)" strokeOpacity="0.34" strokeWidth="2.2" />
        <path d="M10 30 q8-4 16 0 t16 0 t16 0 t16 0" fill="none"
          stroke="var(--color-marca)" strokeOpacity="0.3" strokeWidth="1.8" />
        <path d="M34 4 h12 v-8 h-12Z" fill="var(--color-marca)" fillOpacity="0.2" />
      </g>

      {/* ── camadas do terreno ───────────────────────────────────── */}
      {/* solo superficial */}
      <path d="M40 170 Q140 158 240 170 T420 168 V214 H40Z" fill="var(--color-marca)" fillOpacity="0.1" />
      {/* areia */}
      <path d="M40 214 H420 V300 H40Z" fill="url(#areia)" />
      {/* rocha */}
      <path d="M40 300 H420 V470 H40Z" fill="url(#rocha)" />

      {/* linha do chão, mais firme que as outras */}
      <path d="M40 170 Q140 158 240 170 T420 168" fill="none"
        stroke="var(--color-marca)" strokeOpacity="0.4" strokeWidth="2.6" />

      {/* lençol freático */}
      <path d="M40 286 H420 V470 H40Z" fill="url(#agua)" />
      <path d="M40 286 q24-7 48 0 t48 0 t48 0 t48 0 t48 0 t48 0 t48 0 t48 0"
        fill="none" stroke="var(--color-marca)" strokeOpacity="0.34" strokeWidth="2" />

      {/* ── a perfuração ─────────────────────────────────────────── */}
      {/* o furo, aberto: é por dentro dele que a bomba desce */}
      <path d="M186 168 H214 V462 H186Z" fill="var(--color-superficie)" fillOpacity="0.55" />
      <g stroke="var(--color-marca)" strokeOpacity="0.42" strokeWidth="2.4" fill="none">
        <line x1="186" y1="168" x2="186" y2="462" />
        <line x1="214" y1="168" x2="214" y2="462" />
      </g>
      {/* boca do poço, com a tampa */}
      <path d="M172 168 h56 v-9 h-56Z" fill="var(--color-marca)" fillOpacity="0.28" />

      {/* crivos: por onde a água entra no furo, só abaixo do lençol */}
      <g stroke="var(--color-marca)" strokeOpacity="0.4" strokeWidth="2" strokeLinecap="round">
        {[320, 344, 368, 392].map((y) => (
          <g key={y}>
            <line x1="176" y1={y} x2="186" y2={y} />
            <line x1="214" y1={y} x2="224" y2={y} />
          </g>
        ))}
      </g>

      {/* ── a bomba, submersa ────────────────────────────────────── */}
      <g transform="translate(188 372)">
        {/* corpo */}
        <rect width="24" height="58" rx="6" fill="var(--color-marca)" fillOpacity="0.5" />
        {/* aletas do motor */}
        <g stroke="var(--color-superficie)" strokeOpacity="0.55" strokeWidth="1.6">
          <line x1="4" y1="12" x2="20" y2="12" />
          <line x1="4" y1="20" x2="20" y2="20" />
          <line x1="4" y1="28" x2="20" y2="28" />
          <line x1="4" y1="36" x2="20" y2="36" />
        </g>
        {/* saída de recalque, no alto */}
        <rect x="7" y="-11" width="10" height="11" rx="2" fill="var(--color-marca)" fillOpacity="0.45" />
        {/* a canopla, na base */}
        <path d="M2 58 q10 10 20 0Z" fill="var(--color-marca)" fillOpacity="0.35" />
      </g>

      {/* a água entrando: setas curtas apontando para a bomba */}
      <g stroke="var(--color-marca)" strokeOpacity="0.42" strokeWidth="2" fill="none" strokeLinecap="round">
        <path d="M152 420 h20 M166 415 l6 5-6 5" />
        <path d="M248 420 h-20 M234 415 l-6 5 6 5" />
      </g>

      {/* ── a mangueira sobe até a caixa ──────────────────────────── */}
      <path d="M200 361 V190 Q200 150 236 146 H300"
        fill="none" stroke="var(--color-marca)" strokeOpacity="0.42" strokeWidth="5"
        strokeLinecap="round" strokeLinejoin="round" />

      {/* sentido do fluxo, subindo */}
      <g stroke="var(--color-marca)" strokeOpacity="0.5" strokeWidth="2.2" fill="none" strokeLinecap="round">
        <path d="M194 300 l6-7 6 7" />
        <path d="M194 250 l6-7 6 7" />
        <path d="M194 205 l6-7 6 7" />
      </g>

      {/* profundidade, do jeito que vai no manual */}
      <g stroke="var(--color-marca)" strokeOpacity="0.3" strokeWidth="1.4" fill="none">
        <line x1="256" y1="170" x2="256" y2="372" strokeDasharray="5 5" />
        <line x1="250" y1="170" x2="262" y2="170" />
        <line x1="250" y1="372" x2="262" y2="372" />
      </g>
      <text x="264" y="278" fontSize="15" fontWeight="700" fill="var(--color-marca)" fillOpacity="0.4">
        profundidade
      </text>

      {/* a folga de 40 cm do fundo, que é o erro número 3 da lista */}
      <g stroke="var(--color-marca)" strokeOpacity="0.32" strokeWidth="1.4" fill="none">
        <line x1="140" y1="430" x2="140" y2="462" strokeDasharray="4 4" />
        <line x1="134" y1="462" x2="146" y2="462" />
      </g>
      <text x="94" y="424" fontSize="14" fontWeight="700" fill="var(--color-marca)" fillOpacity="0.38">
        40 cm
      </text>

      {/* fundo do poço */}
      <path d="M40 462 H420" stroke="var(--color-marca)" strokeOpacity="0.34" strokeWidth="3" />
    </svg>
  );
}
