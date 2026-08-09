import Link from "next/link";

/**
 * A prova social da marca — líder de vendas em marketplace — no azul do
 * logotipo com o dourado da comunicação. É a mesma linguagem das peças que
 * a Vibra Vert já usa fora do site, e não uma identidade nova.
 *
 * ⚠ "Nº 1 de vendas" é alegação publicitária: pelo CDC e pelo CONAR precisa
 * ser comprovável a qualquer momento. Por isso o recorte fica explícito —
 * marketplace, categoria de bombas sapo — em vez de uma liderança genérica,
 * que seria impossível de sustentar se alguém questionar. Guardar o print do
 * ranking com data.
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
  return (
    <section className="relative overflow-hidden bg-marca-escuro text-white">
      {/* brilho radial atrás do número, como nas peças de marketplace */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          background:
            "radial-gradient(900px 320px at 22% 40%, rgba(245,185,33,.22), transparent 62%)",
        }}
      />
      <div className="relative mx-auto flex max-w-7xl flex-wrap items-center gap-x-10 gap-y-6 px-5 py-8">
        <p className="flex items-baseline gap-3">
          <span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-ouro">
            Somos os
          </span>
          <span className="text-5xl font-extrabold leading-none tracking-tighter text-ouro">
            Nº1
          </span>
        </p>

        <p className="max-w-md text-[15px] font-bold leading-snug">
          de vendas em marketplace do Brasil
          <span className="mt-0.5 block text-[12.5px] font-medium text-white/70">
            na categoria de bombas sapo, segundo o ranking do Mercado Livre
          </span>
        </p>

        <dl className="ml-auto flex flex-wrap gap-x-8 gap-y-3">
          {[
            nota && { v: nota, r: "média de avaliação" },
            vendas && { v: vendas, r: "vendas nos marketplaces" },
            { v: selo, r: "selo do Mercado Livre" },
            { v: "1974", r: "fabricação própria" },
          ]
            .filter(Boolean)
            .map((i) => {
              const item = i as { v: string; r: string };
              return (
                <div key={item.r}>
                  <dd className="num text-xl font-extrabold leading-none tracking-tight text-ouro">
                    {item.v}
                  </dd>
                  <dt className="mt-1 text-[10px] font-bold uppercase tracking-[0.11em] text-white/60">
                    {item.r}
                  </dt>
                </div>
              );
            })}
        </dl>
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
