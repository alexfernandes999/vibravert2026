import Link from "next/link";
import { MATERIAS } from "@/lib/materias";
import { FundoPoco } from "@/components/fundo-poco";

/**
 * Matérias sobre água, no fim da home.
 *
 * A loja não tinha nenhuma página de conteúdo, e conteúdo é o que traz quem
 * ainda não está procurando bomba · está procurando entender por que falta
 * água. Cada card leva para uma página própria, e cada página fecha em produto.
 */
export function SecaoMaterias() {
  return (
    <section className="relative overflow-hidden border-t border-linha bg-superficie-2">
      {/* O desenho conta o que o texto diz: terreno, lençol, poço tubular e a
          bomba no fundo, sobre a silhueta do país. Fica bem apagado · é
          atmosfera, e não pode competir com a leitura. */}
      <FundoPoco className="pointer-events-none absolute -right-6 top-1/2 hidden h-[118%] w-[470px] -translate-y-1/2 opacity-100 lg:block" />

      <div className="relative mx-auto max-w-7xl px-5 py-14">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-marca">
          Água no Brasil
        </p>
        <h2 className="revelar mt-2 max-w-2xl text-[clamp(30px,5vw,48px)] font-extrabold leading-[1.06] tracking-tight text-balance">
          Por que tanta gente depende de poço
        </h2>
        <p className="revelar mt-4 max-w-xl text-[16px] leading-relaxed text-tinta-2">
          Três números que explicam o país em que a gente fabrica. Com fonte, e sem exagero.
        </p>

        <ul className="mt-8 grid gap-4 md:grid-cols-3">
          {MATERIAS.map((m, i) => (
            <li key={m.slug} className="revelar" style={{ transitionDelay: `${i * 70}ms` }}>
              <Link
                href={`/agua/${m.slug}`}
                className="group flex h-full flex-col rounded-caixa border border-linha bg-superficie p-5 transition duration-300 hover:-translate-y-1 hover:border-marca hover:shadow-lg hover:shadow-marca/10"
              >
                {/* O número puxa o olho antes do título: é o que faz parar. */}
                <span className="num text-3xl font-extrabold tracking-tight text-marca">
                  {m.destaques[0].valor}
                </span>
                <span className="mt-1 text-[12px] font-semibold uppercase tracking-wide text-mudo">
                  {m.destaques[0].rotulo}
                </span>
                <span className="mt-4 text-[15.5px] font-extrabold leading-tight text-balance">
                  {m.titulo}
                </span>
                <span className="mt-2 text-[13px] leading-relaxed text-mudo">{m.resumo}</span>
                <span className="mt-auto pt-4 text-[13px] font-bold text-marca">
                  Ler mais
                  <span className="ml-1 inline-block transition-transform group-hover:translate-x-1">→</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
