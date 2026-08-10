import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { CartaoProduto } from "@/components/cartao-produto";
import { FaixaConfianca } from "@/components/faixa-lider";
import { EspacoBanner } from "@/components/espaco-banner";
import { bannerAtivo } from "@/lib/banners";
import { Medir } from "@/components/medir";
import { SecaoVideos } from "@/components/secao-videos";

export const revalidate = 300;

const CAMPOS = {
  slug: true,
  nome: true,
  marca: true,
  preco: true,
  vazaoMaxima: true,
  voltagem: true,
  pocoPolegadas: true,
  saiaProtecao: true,
  destaque: true,
  imagens: { where: { principal: true }, select: { url: true, alt: true }, take: 1 },
} as const;

export default async function Home() {

  const [principal, meio, maisVendidas, precos, videos, destaque] = await Promise.all([
    bannerAtivo("PRINCIPAL"),
    bannerAtivo("FAIXA_MEIO"),
    // Marcados como líder primeiro; o resto completa a prateleira.
    prisma.produto.findMany({
      where: { ativo: true },
      orderBy: [{ destaque: "desc" }, { vazaoMaxima: "desc" }],
      take: 4,
      select: CAMPOS,
    }),
    prisma.produto.findMany({
      where: { ativo: true },
      orderBy: { preco: "asc" },
      take: 4,
      select: CAMPOS,
    }),
    prisma.video.findMany({
      where: { ativo: true },
      orderBy: { ordem: "asc" },
      take: 3,
      select: { youtubeId: true, titulo: true, resumo: true },
    }),
    // A bomba de maior vazão abre a página: é a imagem que diz, sem texto, o
    // que a loja vende.
    prisma.produto.findFirst({
      where: { ativo: true, principalDaFamilia: true },
      orderBy: { vazaoMaxima: "desc" },
      select: {
        slug: true, nome: true, vazaoMaxima: true, pocoPolegadas: true,
        imagens: { where: { principal: true }, select: { url: true, alt: true }, take: 1 },
      },
    }),
  ]);

  return (
    <>
      <Medir etapa="VISITA" />

      {/* O banner abre a página de ponta a ponta. Com margem e cantos
          arredondados ele virava um cartão flutuando acima do herói, e a
          página passava a ter duas aberturas disputando a mesma atenção. */}
      <section className="[&_.rounded-caixa]:rounded-none">
        <EspacoBanner banner={principal} medida="2098 × 750 px · desktop" rotulo="Banner principal" />
      </section>

      {/* O slogan é o oficial da marca, o mesmo da embalagem. */}
      <section className="border-b border-linha bg-gradient-to-br from-marca-suave via-superficie-2 to-superficie">
        <div className="mx-auto grid max-w-7xl items-center gap-8 px-5 py-12 md:grid-cols-2">
          <div>
            <p className="entrar text-[10.5px] font-extrabold uppercase tracking-[0.16em] text-marca">
              Loja Oficial · Fabricação própria
            </p>
            <h1 className="entrar entrar-2 mt-3 text-4xl font-extrabold leading-tight tracking-tight text-balance md:text-5xl">
              Potência e qualidade para sua necessidade
            </h1>
            <p className="mt-3 max-w-lg text-[15px] text-tinta-2">
              Bombas submersas vibratórias para poço, das linhas Vibra Vert e Rymer.
              Fabricação brasileira, assistência técnica própria e postos autorizados
              em todo o país.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/qual-bomba"
                className="rounded-lg bg-marca px-5 py-3 text-sm font-bold text-white shadow-lg shadow-marca/25"
              >
                Qual bomba eu preciso?
              </Link>
              <Link
                href="/bombas"
                className="rounded-lg border-[1.5px] border-marca px-5 py-3 text-sm font-bold text-marca"
              >
                Ver a linha completa
              </Link>
            </div>

            <dl className="mt-8 flex flex-wrap gap-7">
              {[
                ["2.500", "litros / hora"],
                ["65 m", "altura máxima"],
                ["6 a 8″", "diâmetro do poço"],
              ].map(([v, r]) => (
                <div key={r}>
                  <dd className="num text-xl font-extrabold tracking-tight text-marca-escuro">{v}</dd>
                  <dt className="text-[9.5px] font-bold uppercase tracking-[0.13em] text-mudo">{r}</dt>
                </div>
              ))}
            </dl>
          </div>

          {/* Uma coisa só de cada lado: texto à esquerda, produto à direita.
              A foto e uma caixa de texto lado a lado partiam a coluna em dois
              blocos pequenos, e nenhum dos dois liderava. */}
          <div className="entrar entrar-3">
            {destaque?.imagens[0] && (
              <Link
                href={`/produto/${destaque.slug}`}
                className="group relative block overflow-hidden rounded-caixa border border-marca-linha bg-superficie shadow-xl shadow-marca/10"
              >
                <span className="relative block aspect-[5/4]">
                  <Image
                    src={destaque.imagens[0].url}
                    alt={destaque.imagens[0].alt}
                    fill
                    priority
                    sizes="(max-width: 768px) 100vw, 560px"
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                </span>
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-marca-escuro/90 to-transparent p-3.5 pt-10">
                  <span className="block text-[10px] font-extrabold uppercase tracking-[0.14em] text-ouro">
                    Maior vazão da linha
                  </span>
                  <span className="num mt-0.5 block text-[15px] font-extrabold text-white">
                    {destaque.vazaoMaxima?.toLocaleString("pt-BR")} L/h
                    {destaque.pocoPolegadas && (
                      <span className="font-bold text-white/70"> · poço {destaque.pocoPolegadas}&quot;</span>
                    )}
                  </span>
                </span>
              </Link>
            )}

          </div>
        </div>
      </section>


      {/* O diâmetro do poço decide se a bomba serve · é a primeira pergunta da
          compra e a maior causa de devolução. Vira faixa própria, larga e
          clicável, em vez de uma caixinha espremida na lateral do herói. */}
      <section className="border-b border-linha bg-superficie">
        <div className="mx-auto grid max-w-7xl gap-3 px-5 py-5 md:grid-cols-[auto_1fr_1fr] md:items-center">
          <p className="text-[13.5px] font-extrabold tracking-tight md:mr-2">
            Comece pelo seu poço
            <span className="mt-0.5 block text-[11.5px] font-medium text-mudo">
              o diâmetro define quais modelos cabem
            </span>
          </p>
          {[
            { p: 6, t: "Poço de 6 polegadas", d: "Linha Rymer · até 150 mm" },
            { p: 8, t: "Poço de 8 polegadas ou mais", d: "Vibra Vert 900 e Vibrinha" },
          ].map((o) => (
            <Link
              key={o.p}
              href={`/bombas?poco=${o.p}`}
              className="flex items-center gap-3 rounded-caixa border border-linha px-4 py-3 transition hover:border-marca hover:bg-marca-suave"
            >
              <span className="num text-2xl font-extrabold text-marca">{o.p}&quot;</span>
              <span className="text-[13px] font-bold leading-tight">
                {o.t}
                <span className="block font-medium text-mudo">{o.d}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      <FaixaConfianca />

      <Prateleira titulo="Mais vendidas" produtos={maisVendidas} />

      {/* Esta posição é um banner, e só. Antes havia uma composição de texto
          com coroa, número e métricas · e um espaço de banner embaixo dela, o
          que somava duas peças dizendo a mesma coisa. A arte da campanha já diz
          tudo isso, melhor e no formato que o cliente aprova. */}
      <section className="my-14 [&_.rounded-caixa]:rounded-none">
        <EspacoBanner
          banner={meio}
          medida="2219 × 709 px"
          rotulo="Faixa promocional"
          proporcao="2219 / 709"
        />
      </section>

      <SecaoVideos videos={videos} />

      {/* As mesmas perguntas que a Vibrinha responde, em dados estruturados.
          É o que faz a loja aparecer com respostas expandidas na busca, em vez
          de só um título e uma linha. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: [
              [
                "Qual bomba sapo serve no meu poço?",
                "O primeiro critério é o diâmetro do poço. A linha Rymer entra em poço de 6 polegadas; a Vibra Vert 900 e a Vibrinha precisam de 8 polegadas ou mais. Depois vêm a altura até a caixa d'água e a tensão da rede.",
              ],
              [
                "Quanto de água uma bomba sapo entrega?",
                "Depende da altura. Uma Vibra Vert 900 entrega 2.500 litros por hora na saída e 750 litros por hora a 65 metros de altura manométrica. Por isso publicamos a curva completa de cada modelo.",
              ],
              [
                "Qual a diferença entre a Rymer 2000 e a Rymer 2500?",
                "A hidráulica é idêntica: mesma vazão, potência e altura. A 2500 traz saia de proteção lateral, uma peça de borracha que permite trabalhar dentro de um poço de 6 polegadas sem bater nas paredes.",
              ],
              [
                "A garantia cobre bomba queimada?",
                "A garantia de fábrica cobre defeito de fabricação, não mau uso. Deixar a bomba trabalhar sem água é o que mais queima motor, e é justamente o que a boia de nível evita.",
              ],
            ].map(([name, text]) => ({
              "@type": "Question",
              name,
              acceptedAnswer: { "@type": "Answer", text },
            })),
          }),
        }}
      />



      <Prateleira titulo="Preços imbatíveis" produtos={precos} verTudo="/bombas?ordem=preco" />

      {/* A história fecha a página, mas em bloco com foto, não em linha de texto.
          É a última coisa que o visitante vê antes de decidir, e a credencial de
          meio século pesa mais com um produto ao lado do que sozinha.
          A foto sai do catálogo; quando houver imagem da fábrica, troca aqui. */}
      <section className="relative mt-6 overflow-hidden bg-marca-escuro text-white">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(700px 400px at 85% 50%, rgba(245,185,33,.14), transparent 65%)" }}
        />
        <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-5 py-14 lg:grid-cols-[1.1fr_.9fr]">
          <div className="revelar">
            <p className="text-[10.5px] font-extrabold uppercase tracking-[0.2em] text-ouro">
              Indústria brasileira
            </p>
            <h2 className="mt-3 text-balance text-3xl font-extrabold leading-tight tracking-tight md:text-4xl">
              Fabricamos bomba submersa vibratória desde 1974
            </h2>
            <p className="mt-3.5 max-w-xl text-[15px] leading-relaxed text-white/70">
              Fomos a primeira fábrica do país. A marca Rymer vem de 1958, quando o fundador
              aprendeu o ofício na Rymer Bombas, e voltou às nossas mãos em 2003.
            </p>

            <dl className="mt-8 grid gap-4 sm:grid-cols-3">
              {[
                {
                  v: "1958",
                  r: "origem da marca Rymer",
                  i: (
                    <>
                      <circle cx="12" cy="12" r="9" />
                      <path d="M12 7v5l3.2 2" strokeLinecap="round" />
                    </>
                  ),
                },
                {
                  v: "1974",
                  r: "primeira fábrica do país",
                  i: (
                    <>
                      <path d="M3 21V10l6 3.5V10l6 3.5V10l6 3.5V21z" />
                      <path d="M1 21h22M8 17h2M14 17h2" />
                    </>
                  ),
                },
                {
                  v: "27",
                  r: "estados atendidos",
                  i: (
                    <>
                      <circle cx="12" cy="12" r="9" />
                      <path d="M3 12h18M12 3a15 15 0 010 18a15 15 0 010-18" />
                    </>
                  ),
                },
              ].map((n) => (
                <div
                  key={n.r}
                  className="rounded-caixa border border-white/10 bg-white/[.04] p-4 transition hover:border-ouro/40 hover:bg-white/[.07]"
                >
                  <span className="grid h-9 w-9 place-items-center rounded-lg bg-ouro/15 text-ouro">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
                      {n.i}
                    </svg>
                  </span>
                  <dd className="num mt-3 text-2xl font-extrabold leading-none tracking-tight text-ouro">
                    {n.v}
                  </dd>
                  <dt className="mt-1.5 text-[10.5px] font-bold uppercase leading-snug tracking-[0.1em] text-white/50">
                    {n.r}
                  </dt>
                </div>
              ))}
            </dl>

            <Link
              href="/sobre"
              className="mt-8 inline-flex items-center gap-2 rounded-lg bg-ouro px-6 py-3.5 text-[14px] font-extrabold text-ouro-txt transition hover:brightness-110"
            >
              Conheça a nossa história
              <span aria-hidden>→</span>
            </Link>
          </div>

          {destaque?.imagens[0] && (
            <div className="revelar relative overflow-hidden rounded-caixa border border-white/10">
              <span className="relative block aspect-[4/3]">
                <Image
                  src={destaque.imagens[0].url}
                  alt="Bomba submersa vibratória fabricada pela Vibra Vert"
                  fill
                  sizes="(max-width: 1024px) 100vw, 520px"
                  className="object-cover"
                />
              </span>
              <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-marca-escuro to-transparent p-4 pt-12">
                <span className="text-[11.5px] font-bold text-white/80">
                  Produzida na nossa fábrica em São Paulo
                </span>
              </span>
            </div>
          )}
        </div>
      </section>
    </>
  );
}

function Prateleira({
  titulo,
  produtos,
  verTudo = "/bombas",
}: {
  titulo: string;
  produtos: React.ComponentProps<typeof CartaoProduto>["p"][];
  verTudo?: string;
}) {
  if (!produtos.length) return null;
  return (
    <section className="revelar mx-auto max-w-7xl px-5 py-9">
      <div className="mb-5 flex items-baseline gap-3">
        <h2 className="text-xl font-extrabold tracking-tight">{titulo}</h2>
        <Link href={verTudo} className="ml-auto text-[13px] font-bold text-marca">
          Ver todas →
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {produtos.map((p) => (
          <CartaoProduto key={p.slug} p={p} />
        ))}
      </div>
    </section>
  );
}
