import Image from "next/image";
import { lerReviews } from "@/lib/reviews";

/**
 * Prova social, com a moldura do grupo.
 *
 * A seção some sozinha enquanto não houver avaliação cadastrada: um bloco
 * "sem avaliações ainda" é pior que nenhum bloco.
 */
function Estrelas({ n, tamanho = 15 }: { n: number; tamanho?: number }) {
  return (
    <span className="inline-flex gap-[2px]" aria-label={`${n} de 5 estrelas`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <svg
          key={i}
          viewBox="0 0 24 24"
          width={tamanho}
          height={tamanho}
          className={i <= Math.round(n) ? "text-ouro" : "text-linha-2"}
          fill="currentColor"
          aria-hidden
        >
          <path d="M12 2l2.6 5.6 6.1.8-4.5 4.2 1.2 6.1L12 15.8 6.6 18.7l1.2-6.1L3.3 8.4l6.1-.8z" />
        </svg>
      ))}
    </span>
  );
}

export function SecaoReviews() {
  const r = lerReviews();
  if (!r.avaliacoes.length || r.nota == null) return null;

  return (
    <section className="border-t border-linha bg-superficie">
      <div className="mx-auto max-w-7xl px-5 py-14">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-marca">
          Quem já comprou com a gente
        </p>

        {/* A moldura explica a troca de nome antes de o cliente estranhar. */}
        <div className="revelar mt-3 flex flex-wrap items-center gap-x-5 gap-y-3">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight text-balance">
              Grupo das Bombas ARF
            </h2>
            <p className="mt-1 text-[14.5px] text-tinta-2">
              28 anos de mercado · a maior loja de bombas de água do Brasil
            </p>
          </div>

          <div className="flex items-center gap-3 rounded-caixa border border-linha bg-superficie-2 px-4 py-3">
            <span className="num text-3xl font-extrabold leading-none">
              {r.nota.toFixed(1).replace(".", ",")}
            </span>
            <span>
              <Estrelas n={r.nota} />
              <span className="num mt-1 block text-[12px] font-semibold text-mudo">
                {r.quantidade?.toLocaleString("pt-BR")} avaliações no Google
              </span>
            </span>
          </div>

          <Image
            src="/lojas/casa-sao-paulo.png"
            alt="A Casa São Paulo"
            width={150}
            height={44}
            className="h-9 w-auto object-contain opacity-80"
          />
        </div>

        <ul className="mt-8 grid gap-4 md:grid-cols-3">
          {r.avaliacoes.slice(0, 6).map((a, i) => (
            <li
              key={a.autor + i}
              className="revelar flex h-full flex-col rounded-caixa border border-linha bg-superficie-2 p-5"
              style={{ transitionDelay: `${(i % 3) * 70}ms` }}
            >
              <Estrelas n={a.nota} tamanho={14} />
              <p className="mt-3 flex-1 text-[13.5px] leading-relaxed text-tinta-2">
                “{a.texto}”
              </p>
              <p className="mt-4 text-[12.5px] font-extrabold">
                {a.autor}
                {a.quando && <span className="ml-2 font-semibold text-mudo">{a.quando}</span>}
              </p>
            </li>
          ))}
        </ul>

        {r._fonte && (
          <a
            href={r._fonte}
            target="_blank"
            rel="noopener"
            className="revelar mt-5 inline-block text-[13px] font-bold text-marca underline underline-offset-2"
          >
            Ver o perfil no Google →
          </a>
        )}
      </div>
    </section>
  );
}
