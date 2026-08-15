import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { brl, precoPix } from "@/lib/formato";

/**
 * Peças originais.
 *
 * A loja não vende nenhuma peça hoje, e peça é margem alta e recompra: quem
 * comprou a bomba volta todo ano para trocar a borracha. A seção sobe com a
 * estrutura pronta e o selo "Em breve", como o briefing pede, para o espaço
 * já existir na página e no menu enquanto os preços não chegam.
 *
 * O desenho de cada peça é feito aqui. Foto de peça pequena em fundo branco
 * some no cartão, e um ícone de traço lê melhor em tamanho pequeno — quando
 * as fotos reais chegarem, elas entram no lugar.
 */
const PECAS = [
  {
    nome: "Caneca",
    d: "o motor elétrico da bomba",
    icone: (
      <>
        <rect x="7" y="4" width="10" height="16" rx="2.5" />
        <path d="M10 1.5h4v2.5h-4z" />
        <path d="M9.5 8.5h5M9.5 12h5M9.5 15.5h5" />
      </>
    ),
  },
  {
    nome: "Kit de manutenção",
    d: "as quatro borrachas de desgaste",
    icone: (
      <>
        <circle cx="8" cy="8" r="3.6" />
        <circle cx="16.5" cy="8" r="2.4" />
        <path d="M4 20c0-2.8 2.4-5 5.5-5s5.5 2.2 5.5 5" />
        <path d="M17 15c2 .6 3.4 2.4 3.4 5" />
      </>
    ),
  },
  {
    nome: "Ventosa",
    d: "o disco que puxa a água",
    icone: (
      <>
        <path d="M3.5 9.5c0-2.5 3.8-4.5 8.5-4.5s8.5 2 8.5 4.5-3.8 4.5-8.5 4.5S3.5 12 3.5 9.5z" />
        <path d="M11 14v5.5M9 19.5h4" />
      </>
    ),
  },
  {
    nome: "Martelete",
    d: "a peça que gera a vibração",
    icone: (
      <>
        <path d="M6 3.5h7l1.5 4.5H7.5z" />
        <path d="M10.2 8v12.5" />
        <path d="M8.5 20.5h3.5" />
      </>
    ),
  },
  {
    nome: "Válvula",
    d: "impede a água de voltar",
    icone: (
      <>
        <circle cx="12" cy="12" r="7.5" />
        <path d="M12 4.5v15" />
        <path d="M7.5 8.5c3 1.5 6 1.5 9 0M7.5 15.5c3-1.5 6-1.5 9 0" />
      </>
    ),
  },
  {
    nome: "Kit de instalação",
    d: "abraçadeira, curva e cabo",
    icone: (
      <>
        <path d="M3.5 6.5h11a4 4 0 010 8h-4" />
        <path d="M12 11l-3 3.5 3 3.5" />
        <circle cx="18.5" cy="6.5" r="2" />
      </>
    ),
  },
];

export async function SecaoPecas() {
  // As peças agora existem de verdade no catálogo. A grade de "Em breve" fica
  // como reserva: se um dia não houver peça ativa, a seção não some da home.
  // As escolhidas primeiro; as demais completam a prateleira. Assim a seção
  // nunca fica vazia enquanto ninguém escolheu nada.
  const pecas = await prisma.produto.findMany({
    where: { ativo: true, tipo: "PECA" },
    orderBy: [{ naVitrine: "desc" }, { preco: "desc" }],
    take: 8,
    select: {
      slug: true, nome: true, preco: true, modelo: true,
      imagens: { where: { principal: true }, select: { url: true, alt: true }, take: 1 },
    },
  });

  return (
    <section id="pecas" className="scroll-mt-16 border-t border-linha bg-superficie">
      <div className="mx-auto max-w-7xl px-5 py-14">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-marca">
          Reposição
        </p>
        <h2 className="revelar mt-2 max-w-2xl text-3xl font-extrabold tracking-tight text-balance">
          Peças originais, direto de quem fabrica
        </h2>
        <p className="revelar mt-3 max-w-2xl text-[15px] leading-relaxed text-tinta-2">
          Caneca, kit de manutenção, ventosa, martelete e válvula. Peças compatíveis também com as
          bombas que já existem no mercado.
        </p>

        {pecas.length > 0 ? (
          <ul className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {pecas.map((p, i) => (
              <li key={p.slug} className="revelar" style={{ transitionDelay: `${(i % 4) * 55}ms` }}>
                <Link
                  href={`/produto/${p.slug}`}
                  className="group flex h-full flex-col overflow-hidden rounded-caixa border border-linha bg-superficie-2 transition duration-300 hover:-translate-y-1 hover:border-marca hover:shadow-lg hover:shadow-marca/10"
                >
                  <span className="relative block aspect-square overflow-hidden bg-superficie">
                    {p.imagens[0] && (
                      <Image
                        src={p.imagens[0].url}
                        alt={p.imagens[0].alt}
                        fill
                        sizes="(min-width:1024px) 16vw, 44vw"
                        className="object-contain p-2 transition-transform duration-500 group-hover:scale-105"
                      />
                    )}
                  </span>
                  <span className="flex flex-1 flex-col p-3">
                    {p.modelo && (
                      <span className="text-[9.5px] font-extrabold uppercase tracking-[0.12em] text-marca">
                        {p.modelo}
                      </span>
                    )}
                    <span className="mt-1 line-clamp-2 text-[13px] font-bold leading-snug">
                      {p.nome}
                    </span>
                    <span className="num mt-auto pt-2 text-[17px] font-extrabold text-bom">
                      {brl(precoPix(Number(p.preco)))}
                    </span>
                    <span className="text-[10.5px] font-bold uppercase tracking-wide text-bom">
                      no PIX
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
        <ul className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {PECAS.map((p, i) => (
            <li
              key={p.nome}
              className="revelar group relative flex flex-col items-center rounded-caixa border border-linha bg-superficie-2 p-4 text-center"
              style={{ transitionDelay: `${(i % 4) * 55}ms` }}
            >
              <span className="absolute right-2 top-2 rounded bg-marca-suave px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-marca">
                Em breve
              </span>
              <span className="mt-2 grid h-14 w-14 place-items-center rounded-2xl bg-superficie text-marca">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
                  strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8">
                  {p.icone}
                </svg>
              </span>
              <p className="mt-3 text-[13px] font-extrabold leading-tight">{p.nome}</p>
              <p className="mt-1 text-[11.5px] leading-snug text-mudo">{p.d}</p>
            </li>
          ))}
        </ul>
        )}

        <div className="revelar mt-6 flex flex-wrap items-center gap-3">
          <Link
            href="/bombas?tipo=peca"
            className="rounded-lg bg-marca px-5 py-3 text-[13.5px] font-bold text-white shadow-lg shadow-marca/25 transition hover:brightness-110 active:scale-[0.98]"
          >
            Ver todas as peças
          </Link>
          <Link
            href="/assistencia"
            className="rounded-lg border border-marca bg-superficie px-5 py-3 text-[13.5px] font-bold text-marca transition hover:bg-marca-suave"
          >
            Falar com a assistência
          </Link>
          <span className="text-[12.5px] text-mudo">
            A fábrica tem estoque de reposição de toda a linha.
          </span>
        </div>
      </div>
    </section>
  );
}
