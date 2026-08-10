import type { Metadata } from "next";
import Link from "next/link";
import { RedeLojas } from "@/components/rede-lojas";

export const metadata: Metadata = {
  title: "Nossa história · fábrica de bombas desde 1974",
  description:
    "A primeira fábrica de bombas submersas vibratórias do Brasil. A marca Rymer vem de 1958; a Vibra Vert, de 1974. Hoje, Grupo das Bombas ARF.",
  alternates: { canonical: "/sobre" },
};

/**
 * A história sai do corpo da home e ganha página própria.
 *
 * Decisão do briefing, e é a certa: quem quer comprar já passou por dez blocos
 * de venda antes de chegar aqui, e quem tem curiosidade clica. O que não sai
 * da home é a credencial de 1974 — ela continua embaixo do preço, porque numa
 * bomba de R$ 244 o medo do comprador é "vai queimar em três meses", e esse
 * medo aparece na hora em que ele olha o preço, não numa página institucional.
 */
const LINHA_DO_TEMPO = [
  {
    ano: "1958",
    titulo: "Rymer Bombas",
    texto:
      "Nosso fundador começa na Rymer Bombas, onde aprende o ofício de fabricar bomba submersa vibratória.",
  },
  {
    ano: "1974",
    titulo: "A primeira fábrica do país",
    texto:
      "Nasce a Instaladora Credi-Bombas, a primeira loja especializada do Brasil, e com ela a primeira fábrica nacional de bombas submersas vibratórias. É o ano que está estampado em cada embalagem até hoje.",
  },
  {
    ano: "Anos 80",
    titulo: "A Rymer Bombas se extingue",
    texto: "A empresa onde tudo começou fecha as portas, e a marca fica parada por duas décadas.",
  },
  {
    ano: "2003",
    titulo: "A retomada",
    texto:
      "A família retoma a fabricação da Vibra Vert e traz de volta a marca Rymer · que segue sendo o nome que o cliente reconhece na hora de comprar.",
  },
  {
    ano: "Hoje",
    titulo: "Grupo das Bombas ARF",
    texto:
      "28 anos de distribuição, atendimento nos 27 estados e assistência técnica própria na fábrica em São Paulo.",
  },
];

export default function Sobre() {
  return (
    <>
      <section className="border-b border-linha bg-gradient-to-br from-marca-suave via-superficie to-superficie">
        <div className="mx-auto max-w-7xl px-5 py-12">
          <p className="text-[10.5px] font-extrabold uppercase tracking-[0.16em] text-marca">
            Fábrica de bombas desde 1974
          </p>
          <h1 className="mt-2.5 max-w-3xl text-3xl font-extrabold leading-tight tracking-tight text-balance md:text-4xl">
            Fomos a primeira fábrica de bomba submersa vibratória do Brasil
          </h1>
          <p className="mt-3 max-w-2xl text-[15.5px] leading-relaxed text-tinta-2">
            Meio século depois, ainda é a mesma família, na mesma cidade, fabricando e
            consertando a mesma coisa. É o que está por trás de cada bomba que sai daqui.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-5 py-12">
        <ol className="border-l-2 border-ouro pl-6">
          {LINHA_DO_TEMPO.map((e) => (
            <li key={e.ano} className="relative pb-9 last:pb-0">
              <span
                aria-hidden
                className="absolute -left-[31px] top-1.5 h-3 w-3 rounded-full border-2 border-ouro bg-superficie"
              />
              <p className="num text-[13px] font-extrabold tracking-[0.06em] text-ouro-escuro">
                {e.ano}
              </p>
              <h2 className="mt-1 text-lg font-extrabold tracking-tight">{e.titulo}</h2>
              <p className="mt-1.5 text-[14.5px] leading-relaxed text-tinta-2">{e.texto}</p>
            </li>
          ))}
        </ol>

        <div className="mt-10 rounded-caixa border border-linha bg-superficie-2 p-6">
          <h2 className="text-lg font-extrabold tracking-tight">Duas marcas, uma fábrica</h2>
          <p className="mt-2 text-[14.5px] leading-relaxed text-tinta-2">
            <strong>Vibra Vert</strong> é o nome da fábrica. <strong>Rymer</strong> é o nome que o
            cliente conhece e procura · herdado da empresa onde o fundador aprendeu o ofício. As
            duas saem da mesma linha de produção, em São Paulo, com a mesma assistência técnica
            atrás.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/bombas"
              className="rounded-lg bg-marca px-5 py-2.5 text-[13.5px] font-bold text-white"
            >
              Ver a linha completa
            </Link>
            <Link
              href="/assistencia"
              className="rounded-lg border-[1.5px] border-marca px-5 py-2.5 text-[13.5px] font-bold text-marca"
            >
              Assistência técnica
            </Link>
          </div>
        </div>
      </section>

      <div className="border-t border-linha bg-superficie">
        <RedeLojas origem="sobre" />
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            name: "Vibra Vert Bombas Submersas Vibratórias",
            foundingDate: "1974",
            description:
              "A primeira fábrica de bombas submersas vibratórias do Brasil. Marcas Vibra Vert e Rymer.",
            parentOrganization: { "@type": "Organization", name: "Grupo das Bombas ARF" },
            address: {
              "@type": "PostalAddress",
              streetAddress: "Rua Charles Darwin, 707",
              addressLocality: "Vila Santa Catarina, São Paulo",
              addressRegion: "SP",
              addressCountry: "BR",
            },
          }),
        }}
      />
    </>
  );
}
