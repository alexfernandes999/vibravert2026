import Link from "next/link";

/**
 * A prova social de liderança em marketplace, no azul do logotipo com o
 * dourado da comunicação da marca.
 *
 * É o bloco mais pesado da home, e por isso fica sozinho: o que vinha logo
 * abaixo disputava atenção com ele e os dois se anulavam. Aqui vale a regra de
 * gastar ousadia num lugar só e manter o resto quieto.
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
    { v: "1974", r: "fabricação própria" },
  ].filter(Boolean) as { v: string; r: string }[];

  return (
    <section className="relative my-14 overflow-hidden bg-marca-escuro text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(760px 300px at 18% 50%, rgba(245,185,33,.20), transparent 65%)",
        }}
      />

      <div className="relative mx-auto max-w-7xl px-5 py-12">
        <div className="flex flex-col items-center gap-8 text-center lg:flex-row lg:items-center lg:gap-14 lg:text-left">
          {/* O número é o herói do bloco: fica grande, sozinho e sem concorrência. */}
          <p className="flex shrink-0 items-center gap-4">
            <span aria-hidden className="hidden h-px w-10 bg-ouro/50 lg:block" />
            <span className="flex flex-col items-center lg:items-start">
              <span className="text-[10px] font-extrabold uppercase tracking-[0.28em] text-ouro/80">
                Somos os
              </span>
              <span className="text-[5.5rem] font-extrabold leading-[0.82] tracking-tighter text-ouro">
                Nº1
              </span>
            </span>
          </p>

          <div className="max-w-md">
            <h2 className="text-2xl font-extrabold leading-tight tracking-tight text-balance">
              de vendas em marketplace do Brasil
            </h2>
            <p className="mt-2 text-[13.5px] leading-relaxed text-white/65">
              Na categoria de bombas sapo, segundo o ranking do Mercado Livre. É a mesma
              bomba que sai da nossa fábrica — aqui, sem intermediário.
            </p>
            <Link
              href="/bombas"
              className="mt-5 inline-block rounded-lg bg-ouro px-5 py-2.5 text-[13.5px] font-extrabold text-ouro-txt"
            >
              Comprar direto da fábrica
            </Link>
          </div>

          <dl className="grid w-full grid-cols-2 gap-x-8 gap-y-6 border-t border-white/10 pt-8 lg:ml-auto lg:w-auto lg:border-l lg:border-t-0 lg:pl-12 lg:pt-0">
            {metricas.map((m) => (
              <div key={m.r}>
                <dd className="num text-xl font-extrabold leading-none tracking-tight text-ouro">
                  {m.v}
                </dd>
                <dt className="mt-1.5 text-[10px] font-bold uppercase leading-tight tracking-[0.11em] text-white/50">
                  {m.r}
                </dt>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}

/**
 * Os quatro pontos que o marketplace não entrega. É o argumento para comprar
 * aqui em vez de lá — e por isso se repete na ficha de cada produto.
 */
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
          <div key={t} className="border-l-2 border-ouro pl-3.5">
            <dt className="text-[14px] font-extrabold tracking-tight">{t}</dt>
            <dd className="mt-0.5 text-[12.8px] leading-snug text-mudo">{d}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
