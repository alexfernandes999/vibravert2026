import type { Metadata } from "next";
import Link from "next/link";
import { FaixaConfianca } from "@/components/faixa-lider";

import { TELEFONE, TELEFONE_LINK, WHATSAPP_BONITO, SAC_EMAIL, whatsappLink } from "@/lib/contato";
import { GARANTIA_ALCANCE, GARANTIA_BORRACHAS, TROCA_EXPRESSA_CONDICAO } from "@/lib/loja";
export const metadata: Metadata = {
  title: "Assistência técnica · quem conserta a sua bomba somos nós",
  description:
    "Assistência técnica própria na fábrica, em São Paulo, sem posto terceirizado. Troca Expressa com frete de ida por nossa conta nos primeiros 30 dias de compras no site.",
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
  { o: "Vendas e assistência presencial", q: "De segunda a sexta-feira, das 08h30 às 17h00" },
  { o: "Chamados técnicos", q: "Segunda a sexta, 7h às 17h" },
];

/**
 * Página de venda, não de suporte.
 *
 * A concorrência encaminha para posto terceirizado. Aqui quem conserta é a
 * fábrica — é o argumento mais forte contra comprar no marketplace, e por isso
 * está linkada na ficha de todos os produtos em vez de escondida no rodapé.
 *
 * O frete de ida por nossa conta vale só na Troca Expressa (30 dias, compra no
 * site). A página prometia "sem frete de ida e volta" para todos, o que a
 * política de garantia não cobre · e o que se promete aqui vira obrigação.
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
              Na nossa fábrica em São Paulo, sem posto terceirizado e sem fila de intermediário.
              Comprou aqui no site há até 30 dias? Na Troca Expressa, o frete de ida é por nossa
              conta.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              {/* O chamado de garantia é aberto aqui mesmo: protocolo na hora e,
                  na maioria dos casos, o laudo em segundos. Antes o botão
                  levava ao Fale Conosco e o caso seguia por WhatsApp e planilha. */}
              <Link
                href="/assistencia/garantia"
                className="rounded-lg bg-ouro px-6 py-3.5 text-sm font-extrabold text-ouro-txt transition hover:brightness-110"
              >
                Abrir chamado de garantia
              </Link>
              <Link
                href="/assistencia/protocolo"
                className="rounded-lg border-[1.5px] border-white/30 px-6 py-3.5 text-sm font-extrabold text-white transition hover:border-white/60"
              >
                Acompanhar chamado
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

            <div className="mt-5 border-t border-white/15 pt-4">
              <p className="text-[10.5px] font-extrabold uppercase tracking-[0.14em] text-ouro">
                Assistência e garantia
              </p>
              <p className="num mt-0.5 text-[13.5px] text-white/85">
                <a href={whatsappLink()} target="_blank" rel="noopener" className="underline underline-offset-2">
                  WhatsApp {WHATSAPP_BONITO}
                </a>{" "}
                ·{" "}
                <a href={`mailto:${SAC_EMAIL}`} className="underline underline-offset-2">
                  {SAC_EMAIL}
                </a>
              </p>
            </div>
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

      {/* Prazos e frete ditos como estão no Termo de Garantia: o prazo longo é
          do motor e da carcaça, e o frete de ida grátis é só da Troca Expressa. */}
      <section className="border-t border-linha bg-superficie">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-12 lg:grid-cols-2">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight text-balance">
              Prazo de garantia por modelo
            </h2>
            <p className="mt-2 max-w-xl text-[14.5px] text-tinta-2">
              Contado a partir da emissão da nota fiscal. O prazo vale {GARANTIA_ALCANCE}.
            </p>
            <div className="mt-5 overflow-hidden rounded-caixa border border-linha">
              <table className="num w-full text-left text-[14px]">
                <thead className="bg-superficie-2 text-[11px] font-extrabold uppercase tracking-[0.1em] text-mudo">
                  <tr>
                    <th className="px-4 py-2.5">Modelo</th>
                    <th className="px-4 py-2.5">Motor e carcaça</th>
                    <th className="px-4 py-2.5">Borrachas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-linha">
                  {[
                    ["Rymer 1500", "6 meses"],
                    ["Rymer 2000 e 2500", "1 ano"],
                    ["Vibrinha, Vibra Vert 800 e 900", "2 anos"],
                  ].map(([m, p]) => (
                    <tr key={m}>
                      <td className="px-4 py-2.5 font-bold">{m}</td>
                      <td className="px-4 py-2.5">{p}</td>
                      <td className="px-4 py-2.5">{GARANTIA_BORRACHAS}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 max-w-xl text-[12.5px] leading-relaxed text-mudo">
              Borrachas: canopla, ventosa, amortecedor e válvula. São peças de desgaste natural, com
              garantia de {GARANTIA_BORRACHAS} em todos os modelos.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-extrabold tracking-tight text-balance">
              Como fica o frete
            </h2>
            <dl className="mt-5 space-y-4 text-[14.5px]">
              <div className="rounded-caixa border border-linha p-4">
                <dt className="font-extrabold">Troca Expressa · até 30 dias, compra no site</dt>
                <dd className="mt-1 text-tinta-2">
                  Mandamos o código de postagem e o frete de ida é por nossa conta. A bomba é avaliada
                  na bancada em até 48 horas da chegada. {TROCA_EXPRESSA_CONDICAO}
                </dd>
              </div>
              <div className="rounded-caixa border border-linha p-4">
                <dt className="font-extrabold">Comprou em marketplace há até 30 dias?</dt>
                <dd className="mt-1 text-tinta-2">
                  Abra a devolução no próprio marketplace: é o caminho mais rápido nesse prazo.
                </dd>
              </div>
              <div className="rounded-caixa border border-linha p-4">
                <dt className="font-extrabold">Depois de 30 dias</dt>
                <dd className="mt-1 text-tinta-2">
                  O envio da bomba até a fábrica é por conta do cliente. Confirmado o defeito de
                  fabricação, o reparo é por nossa conta.
                </dd>
              </div>
            </dl>
          </div>
        </div>
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
                dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
                opens: "08:30",
                closes: "17:00",
              },
            ],
          }),
        }}
      />
    </>
  );
}
