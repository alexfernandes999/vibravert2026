import type { Metadata } from "next";
import Link from "next/link";
import { FaixaConfianca } from "@/components/faixa-lider";

import { TELEFONE, TELEFONE_LINK } from "@/lib/contato";
export const metadata: Metadata = {
  title: "Assistência técnica · quem conserta a sua bomba somos nós",
  description:
    "Assistência técnica própria na fábrica, em São Paulo. Sem posto terceirizado e sem frete de ida e volta por conta do cliente. Abra um chamado.",
  alternates: { canonical: "/assistencia" },
};

const FABRICA = {
  rua: "Rua Charles Darwin, 707",
  bairro: "Vila Santa Catarina",
  cidade: "São Paulo",
  uf: "SP",
  telefone: TELEFONE,
  telefoneLink: TELEFONE_LINK,
};

const HORARIOS = [
  { o: "Vendas e assistência presencial", q: "Segunda a quinta, 7h às 18h · Sexta, 8h às 17h" },
  { o: "Chamados técnicos", q: "Segunda a sexta, 7h às 17h" },
];

/**
 * Página de venda, não de suporte.
 *
 * A concorrência encaminha para posto terceirizado e o frete de ida e volta
 * fica por conta do cliente. Aqui quem conserta é a fábrica — é o argumento
 * mais forte contra comprar no marketplace, e por isso está linkada na ficha
 * de todos os produtos em vez de escondida no rodapé.
 */
export default function Assistencia() {
  return (
    <>
      {/* O fundo amarelo inteiro gritava e empurrava a leitura para longe.
          O azul da marca sustenta o bloco, e o ouro fica só onde precisa
          chamar: o rótulo e o botão. */}
      <section className="relative overflow-hidden bg-marca-escuro text-white">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(760px 380px at 15% 40%, rgba(245,185,33,.16), transparent 62%)" }}
        />
        <div className="relative mx-auto grid max-w-7xl items-center gap-8 px-5 py-14 lg:grid-cols-[1.35fr_1fr]">
          <div>
            <p className="text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-ouro">
              Assistência técnica própria
            </p>
            <h1 className="mt-3 max-w-2xl text-3xl font-extrabold leading-tight tracking-tight text-balance md:text-4xl">
              Quem conserta a sua bomba somos nós
            </h1>
            <p className="mt-3 max-w-xl text-[15.5px] leading-relaxed text-white/70">
              Na nossa fábrica em São Paulo. Sem posto terceirizado, sem frete de ida e volta
              para o cliente resolver sozinho, e sem fila de espera de intermediário.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/fale-conosco"
                className="rounded-lg bg-ouro px-6 py-3.5 text-sm font-extrabold text-ouro-txt transition hover:brightness-110"
              >
                Abrir chamado técnico
              </Link>
              <a
                href={`tel:${FABRICA.telefoneLink}`}
                className="rounded-lg border-[1.5px] border-white/30 px-6 py-3.5 text-sm font-extrabold text-white transition hover:border-white/60"
              >
                Ligar: {FABRICA.telefone}
              </a>
            </div>
          </div>

          <address className="rounded-caixa border border-white/10 bg-white/[.06] p-6 not-italic text-white backdrop-blur-sm">
            <p className="text-[10.5px] font-extrabold uppercase tracking-[0.14em] text-ouro">
              Fábrica e assistência presencial
            </p>
            <p className="mt-1.5 text-[14.5px] leading-relaxed">
              {FABRICA.rua}
              <br />
              {FABRICA.bairro}, {FABRICA.cidade}/{FABRICA.uf}
            </p>

            <dl className="mt-5 space-y-3 border-t border-white/15 pt-4">
              {HORARIOS.map((h) => (
                <div key={h.o}>
                  <dt className="text-[10.5px] font-extrabold uppercase tracking-[0.14em] text-ouro">
                    {h.o}
                  </dt>
                  <dd className="num mt-0.5 text-[13.5px] text-white/85">{h.q}</dd>
                </div>
              ))}
            </dl>
          </address>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-12">
        <h2 className="text-2xl font-extrabold tracking-tight text-balance">
          Antes de comprar outra, veja se é isso
        </h2>
        <p className="mt-2 max-w-2xl text-[15px] text-tinta-2">
          A maior parte das bombas que chegam na nossa bancada não queimou · parou por um
          motivo que se resolve. Vale conferir antes de gastar com uma nova.
        </p>

        <ol className="mt-7 grid gap-4 md:grid-cols-3">
          {[
            {
              t: "Não puxa água",
              d: "Costuma ser o diafragma ou entupimento na entrada. A bomba liga, vibra, e nada sobe.",
            },
            {
              t: "Só faz barulho",
              d: "Vibra e não bombeia. Quase sempre é peça de desgaste, não o motor.",
            },
            {
              t: "Queima seguido",
              d: "Rodar sem água queima. É o que a boia de nível existe para evitar.",
            },
          ].map((c, i) => (
            <li key={c.t} className="rounded-caixa border border-linha bg-superficie p-5">
              <span className="num text-[11px] font-extrabold text-ouro-escuro">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-1 text-[15.5px] font-extrabold tracking-tight">{c.t}</h3>
              <p className="mt-1.5 text-[13.5px] leading-snug text-mudo">{c.d}</p>
            </li>
          ))}
        </ol>

        <p className="mt-7 text-[14px] text-tinta-2">
          Não é nenhum desses?{" "}
          <Link href="/fale-conosco" className="font-extrabold text-marca underline">
            Descreva o que está acontecendo
          </Link>{" "}
          e o técnico responde.
        </p>
      </section>

      <FaixaConfianca />

      {/* Endereço e horários também em dados estruturados: é uma fábrica com
          atendimento presencial, e a busca local por "assistência de bomba"
          é justamente a de quem está com a bomba na mão. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "LocalBusiness",
            name: "Vibra Vert Bombas Submersas Vibratórias",
            description: "Fábrica e assistência técnica própria de bombas submersas vibratórias.",
            telephone: FABRICA.telefoneLink,
            address: {
              "@type": "PostalAddress",
              streetAddress: FABRICA.rua,
              addressLocality: `${FABRICA.bairro}, ${FABRICA.cidade}`,
              addressRegion: FABRICA.uf,
              addressCountry: "BR",
            },
            openingHoursSpecification: [
              {
                "@type": "OpeningHoursSpecification",
                dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday"],
                opens: "07:00",
                closes: "18:00",
              },
              {
                "@type": "OpeningHoursSpecification",
                dayOfWeek: "Friday",
                opens: "08:00",
                closes: "17:00",
              },
            ],
          }),
        }}
      />
    </>
  );
}
