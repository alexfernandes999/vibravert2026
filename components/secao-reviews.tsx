import Image from "next/image";
import { lerReviews } from "@/lib/reviews";

/**
 * Prova social, com a moldura do grupo.
 *
 * A primeira versão ficava em fundo branco, entre duas seções claras, e sumia:
 * a única coisa que separava as avaliações do resto era uma borda cinza. Aqui
 * a seção tem fundo próprio, a nota vira um bloco azul cheio e as estrelas
 * ficam douradas de verdade · é o bloco que precisa parar o olho, porque é o
 * único em que quem fala não somos nós.
 *
 * Três avaliações, e não seis. Escolhidas: quem compra bomba pela internet
 * teme errar o modelo, não receber, e ficar na mão se der problema. As três
 * respondem exatamente isso, nessa ordem.
 *
 * A moldura do Grupo ARF é obrigatória. Sem ela o cliente lê uma avaliação
 * assinada por outra empresa e desconfia da loja inteira.
 */
function Estrelas({ n, tamanho = 16 }: { n: number; tamanho?: number }) {
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
    <section className="border-y border-marca/15 bg-marca-suave">
      <div className="mx-auto max-w-7xl px-5 py-14">
        <div className="revelar flex flex-wrap items-center gap-x-6 gap-y-4">
          {/* A nota em bloco cheio: é o número que dá autoridade, e em texto
              solto ele se perde no meio do resto. */}
          <div className="flex items-center gap-4 rounded-caixa bg-marca px-5 py-4 text-white shadow-xl shadow-marca/25">
            <span className="num text-[42px] font-extrabold leading-none tracking-tight">
              {r.nota.toFixed(1).replace(".", ",")}
            </span>
            <span>
              <Estrelas n={r.nota} tamanho={18} />
              <span className="num mt-1.5 block text-[12.5px] font-bold text-white/75">
                {r.quantidade?.toLocaleString("pt-BR")} avaliações no Google
              </span>
            </span>
          </div>

          <div className="min-w-0">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-marca">
              Quem já comprou com a gente
            </p>
            <h2 className="mt-1.5 text-[clamp(24px,3.6vw,34px)] font-extrabold leading-tight tracking-tight text-balance">
              Grupo das Bombas ARF
            </h2>
            <p className="mt-1 text-[14.5px] text-tinta-2">
              28 anos de mercado · a maior loja de bombas de água do Brasil
            </p>
          </div>

          <Image
            src="/lojas/casa-sao-paulo.png"
            alt="A Casa São Paulo"
            width={160}
            height={48}
            className="ml-auto hidden h-10 w-auto object-contain sm:block"
          />
        </div>

        <ul className="mt-8 grid gap-4 md:grid-cols-3">
          {r.avaliacoes.slice(0, 3).map((a, i) => (
            <li
              key={a.autor + i}
              className="revelar flex h-full flex-col rounded-caixa border-l-[3px] border-ouro bg-superficie p-5 shadow-lg shadow-marca/5"
              style={{ transitionDelay: `${i * 70}ms` }}
            >
              <Estrelas n={a.nota} tamanho={15} />
              <p className="mt-3 flex-1 text-[14px] leading-relaxed text-tinta-2">“{a.texto}”</p>
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
            className="revelar mt-6 inline-flex items-center gap-2 rounded-lg border border-marca bg-superficie px-5 py-3 text-[13.5px] font-bold text-marca transition hover:bg-marca hover:text-white"
          >
            Ler as {r.quantidade?.toLocaleString("pt-BR")} avaliações no Google
            <span aria-hidden>→</span>
          </a>
        )}
      </div>
    </section>
  );
}
