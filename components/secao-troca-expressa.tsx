import Link from "next/link";

/**
 * Troca Expressa em 30 dias.
 *
 * É o argumento mais forte contra o marketplace, e não estava no site. Quem
 * compra bomba pela internet tem um medo só: dar problema e ficar na mão, com
 * o frete de volta por conta própria e um posto terceirizado no meio.
 *
 * A resposta é curta e verificável: a gente busca, avalia na bancada e
 * resolve. Quem fabrica é quem conserta.
 *
 * O asterisco fica visível, e não escondido em letra miúda no rodapé. Promessa
 * de troca com condição oculta é o que gera reclamação depois — e a condição
 * aqui é razoável o bastante para ser dita em voz alta.
 */
export function SecaoTrocaExpressa() {
  return (
    <section className="border-y border-linha bg-marca-escuro text-white">
      <div className="mx-auto grid max-w-7xl items-center gap-8 px-5 py-14 md:grid-cols-[1.25fr_1fr]">
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-ouro">
            Só para quem compra no site
          </p>
          <h2 className="revelar mt-2 text-3xl font-extrabold tracking-tight text-balance md:text-4xl">
            Troca Expressa em 30 dias
          </h2>
          <p className="revelar mt-4 max-w-xl text-[16px] leading-relaxed text-white/85">
            Deu problema nos primeiros 30 dias? A gente busca a sua bomba, avalia na nossa bancada
            e resolve. <strong className="font-bold text-white">O frete de ida é por nossa conta.</strong>
          </p>
          <p className="revelar mt-3 max-w-xl text-[16px] font-bold leading-relaxed text-white">
            Quem fabrica é quem conserta · e quem conserta responde.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/assistencia"
              className="rounded-lg bg-white px-5 py-3 text-[13.5px] font-bold text-marca-escuro transition hover:bg-white/90 active:scale-[0.98]"
            >
              Como funciona a assistência
            </Link>
            <Link
              href="/politica-de-troca"
              className="rounded-lg border border-white/35 px-5 py-3 text-[13.5px] font-bold text-white transition hover:bg-white/10"
            >
              Ler a política de troca
            </Link>
          </div>

          <p className="mt-5 max-w-xl text-[12px] leading-relaxed text-white/55">
            Sujeito a avaliação técnica. Após 30 dias, o envio fica por conta do cliente.
          </p>
        </div>

        {/* O Clube ainda está sendo definido. Em vez de inventar vantagens que
            depois não se cumprem, o bloco anuncia só o que já existe e reserva
            o espaço para o resto. */}
        <aside className="rounded-caixa border border-white/15 bg-white/5 p-6">
          <p className="text-[10.5px] font-extrabold uppercase tracking-[0.16em] text-ouro">
            Clube Vibra Vert
          </p>
          <p className="mt-2 text-[15px] font-extrabold leading-tight">
            A Troca Expressa é uma das vantagens de quem compra direto da fábrica.
          </p>
          <ul className="mt-4 space-y-2.5">
            {[
              "Troca Expressa em 30 dias, com frete de ida por nossa conta",
              "Assistência técnica na fábrica, sem posto terceirizado",
              "Peças de reposição originais, direto de quem produz",
            ].map((v) => (
              <li key={v} className="flex gap-2.5 text-[13px] leading-snug text-white/80">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6"
                  className="mt-0.5 h-4 w-4 shrink-0 text-ouro">
                  <path d="M4 12.5l5 5L20 6.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {v}
              </li>
            ))}
          </ul>
          <p className="mt-4 border-t border-white/12 pt-3 text-[12px] text-white/50">
            Em breve, mais vantagens para quem é do Clube.
          </p>
        </aside>
      </div>
    </section>
  );
}
