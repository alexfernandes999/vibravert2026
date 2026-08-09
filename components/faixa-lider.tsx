import Link from "next/link";

/**
 * Coroa de louros desenhada por geometria, não por caminho copiado.
 *
 * Os ramos sobem pelas laterais e deixam o topo aberto — uma coroa fechada em
 * cima vira arco, que é outro símbolo. Cada folha é gerada sobre o arco com
 * inclinação própria, para que se leiam como folhas separadas e não como um
 * borrão dourado.
 */
function folha(x: number, y: number, ang: number, comp: number, larg: number) {
  const pts: string[] = [];
  for (let t = 0; t <= 360; t += 12) {
    const r = (t * Math.PI) / 180;
    const lx = comp * Math.cos(r);
    const ly = larg * Math.sin(r) * (1 - 0.5 * Math.abs(Math.cos(r)));
    const a = (ang * Math.PI) / 180;
    pts.push(`${(x + lx * Math.cos(a) - ly * Math.sin(a)).toFixed(1)},${(y + lx * Math.sin(a) + ly * Math.cos(a)).toFixed(1)}`);
  }
  return `M${pts.join("L")}Z`;
}

function ramo(lado: 1 | -1, cx: number, cy: number, R: number) {
  const folhas: string[] = [];
  const n = 8;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const th = ((18 + t * 128) * Math.PI) / 180;
    const x = cx + lado * R * Math.sin(th);
    const y = cy + R * Math.cos(th);
    const ang = (Math.atan2(Math.cos(th), lado * Math.sin(th)) * 180) / Math.PI - 34 * lado;
    folhas.push(folha(x, y, ang, 34 - 12 * t, 11 - 3.5 * t));
  }
  const haste: string[] = [];
  for (let i = 0; i <= 40; i++) {
    const th = ((18 + (i / 40) * 128) * Math.PI) / 180;
    haste.push(`${(cx + lado * R * Math.sin(th)).toFixed(1)},${(cy + R * Math.cos(th)).toFixed(1)}`);
  }
  return { folhas, haste: `M${haste.join("L")}` };
}

function Coroa() {
  const cx = 230, cy = 230, R = 150;
  const dir = ramo(1, cx, cy, R);
  const esq = ramo(-1, cx, cy, R);
  return (
    <svg viewBox="0 0 460 460" className="absolute inset-0 h-full w-full" aria-hidden="true">
      <defs>
        <linearGradient id="ouro" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FBE08A" />
          <stop offset="45%" stopColor="#F5B921" />
          <stop offset="100%" stopColor="#B8830F" />
        </linearGradient>
      </defs>
      {[dir, esq].map((r, i) => (
        <g key={i}>
          <path d={r.haste} fill="none" stroke="#C9911A" strokeWidth={4} strokeLinecap="round" />
          {r.folhas.map((f, j) => (
            <path key={j} d={f} fill="url(#ouro)" />
          ))}
        </g>
      ))}
    </svg>
  );
}

const CREDENCIAIS = [
  { t: "Líderes em vendas", d: "no maior marketplace do país" },
  { t: "Fábrica desde 1974", d: "a primeira do Brasil" },
  { t: "Assistência própria", d: "quem conserta é quem fabrica" },
  { t: "27 estados", d: "entregamos em todo o país" },
];

/**
 * Prova social de liderança.
 *
 * ⚠ "Nº 1 de vendas" é alegação publicitária: pelo CDC e pelo CONAR precisa
 * ser comprovável a qualquer momento. Por isso o recorte fica explícito —
 * marketplace, categoria de bombas sapo — em vez de uma liderança genérica,
 * que seria impossível de sustentar se alguém questionar.
 */
export function FaixaLider({
  nota,
  vendas,
  selo = "MercadoLíder",
}: {
  nota?: string;
  vendas?: string;
  selo?: string;
}) {
  const metricas = [
    nota && { v: nota, r: "média de avaliação" },
    vendas && { v: vendas, r: "vendas nos marketplaces" },
    { v: selo, r: "selo do Mercado Livre" },
  ].filter(Boolean) as { v: string; r: string }[];

  return (
    <section className="relative my-16 overflow-hidden bg-[#0B1B44] text-white">
      {/* brilho e partículas: a mesma linguagem das peças de marketplace */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(680px 420px at 22% 45%, rgba(245,185,33,.26), transparent 62%), radial-gradient(900px 500px at 100% 0%, rgba(31,101,145,.45), transparent 60%)",
        }}
      />
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[.07] [background:repeating-linear-gradient(115deg,transparent_0_38px,#F5B921_38px_39px)]" />

      <div className="relative mx-auto max-w-7xl px-5 py-14">
        <div className="grid items-center gap-10 lg:grid-cols-[300px_1fr]">
          {/* medalha */}
          <div className="revelar mx-auto grid h-[260px] w-[260px] place-items-center lg:mx-0">
            <div className="relative h-full w-full">
              <Coroa />
              <div className="absolute inset-0 grid place-items-center">
                <span
                  className="text-[7rem] font-extrabold leading-none tracking-tighter"
                  style={{
                    background: "linear-gradient(180deg,#FDEBA8 0%,#F5B921 46%,#C9911A 100%)",
                    WebkitBackgroundClip: "text",
                    backgroundClip: "text",
                    color: "transparent",
                    filter: "drop-shadow(0 4px 10px rgba(0,0,0,.45))",
                  }}
                >
                  1
                </span>
              </div>
            </div>
          </div>

          <div className="text-center lg:text-left">
            <p aria-hidden className="mb-3 text-[15px] tracking-[0.5em] text-ouro">★★★★★</p>

            <p className="text-[11px] font-extrabold uppercase tracking-[0.3em] text-white/60">
              Somos os número 1
            </p>

            <h2 className="mt-3 text-balance text-[clamp(1.9rem,4vw,3rem)] font-extrabold uppercase leading-[1.02] tracking-tight">
              <span className="mt-1 inline-block bg-ouro px-3 py-0.5 text-marca-escuro">
                de vendas
              </span>{" "}
              <span className="mt-1 inline-block">em marketplace</span>{" "}
              <span className="mt-1 inline-block text-ouro">do Brasil</span>
            </h2>

            <p className="mx-auto mt-4 max-w-xl text-[14px] leading-relaxed text-white/65 lg:mx-0">
              Na categoria de bombas sapo, segundo o ranking do Mercado Livre. É a mesma bomba
              que sai da nossa fábrica — aqui, sem intermediário.
            </p>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-8 gap-y-4 lg:justify-start">
              <Link
                href="/bombas"
                className="rounded-lg bg-ouro px-6 py-3 text-[14px] font-extrabold text-ouro-txt transition hover:brightness-110"
              >
                Comprar direto da fábrica
              </Link>
              <dl className="flex flex-wrap gap-x-7 gap-y-3">
                {metricas.map((m) => (
                  <div key={m.r}>
                    <dd className="num text-lg font-extrabold leading-none text-ouro">{m.v}</dd>
                    <dt className="mt-1 text-[9.5px] font-bold uppercase tracking-[0.11em] text-white/45">
                      {m.r}
                    </dt>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </div>

        <ul className="mt-12 grid gap-x-8 gap-y-5 border-t border-white/10 pt-7 sm:grid-cols-2 lg:grid-cols-4">
          {CREDENCIAIS.map((c) => (
            <li key={c.t} className="border-l-2 border-ouro/70 pl-3.5">
              <p className="text-[12.5px] font-extrabold uppercase tracking-wide">{c.t}</p>
              <p className="mt-0.5 text-[11.5px] leading-snug text-white/50">{c.d}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/** Os quatro pontos que o marketplace não entrega. */
export function FaixaConfianca() {
  const pontos = [
    ["Fábrica desde 1974", "a primeira fábrica de bombas submersas vibratórias do Brasil"],
    ["A assistência é nossa", "quem conserta é a fábrica, não um posto terceirizado"],
    ["Garantia estendida", "mais tempo de cobertura para quem compra aqui no site"],
    ["27 estados", "Grupo das Bombas ARF, 28 anos de distribuição"],
  ];

  return (
    <section className="border-y border-linha bg-superficie">
      <dl className="mx-auto grid max-w-7xl gap-6 px-5 py-7 sm:grid-cols-2 lg:grid-cols-4">
        {pontos.map(([t, d]) => (
          <div key={t} className="revelar border-l-2 border-ouro pl-3.5">
            <dt className="text-[14px] font-extrabold tracking-tight">{t}</dt>
            <dd className="mt-0.5 text-[12.8px] leading-snug text-mudo">{d}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
