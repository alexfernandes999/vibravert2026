import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { CartaoProduto } from "@/components/cartao-produto";
import { FaixaConfianca } from "@/components/faixa-lider";
import { EspacoBanner } from "@/components/espaco-banner";
import { bannerAtivo, bannersAtivos } from "@/lib/banners";
import { Medir } from "@/components/medir";

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
  imagens: { where: { principal: true }, select: { url: true, alt: true }, take: 1 },
} as const;

export default async function Home() {

  const [principal, duplos, meio, maisVendidas, precos, destaque] = await Promise.all([
    bannerAtivo("PRINCIPAL"),
    bannersAtivos("FAIXA_DUPLA"),
    bannerAtivo("FAIXA_MEIO"),
    prisma.produto.findMany({
      where: { ativo: true },
      orderBy: { preco: "desc" },
      take: 4,
      select: CAMPOS,
    }),
    prisma.produto.findMany({
      where: { ativo: true },
      orderBy: { preco: "asc" },
      take: 4,
      select: CAMPOS,
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
          medida="1880 × 640 px"
          rotulo="Faixa promocional"
          proporcao="1880 / 640"
        />
      </section>

      {/* As duas faixas ficam abaixo da prateleira e longe da faixa do Nº 1:
          dois blocos pesados colados se anulavam. */}
      <section className="mx-auto grid max-w-7xl gap-4 px-5 md:grid-cols-2">
        <EspacoBanner
          banner={duplos[0] ?? null}
          medida="940 × 300 px"
          rotulo="Faixa dupla · esquerda"
          proporcao="940 / 300"
        />
        <EspacoBanner
          banner={duplos[1] ?? null}
          medida="940 × 300 px"
          rotulo="Faixa dupla · direita"
          proporcao="940 / 300"
        />
      </section>

      <Prateleira titulo="Preços imbatíveis" produtos={precos} verTudo="/bombas?ordem=preco" />

      {/* A história por último e em banda estreita: quem quer comprar já passou
          por dez blocos de venda antes de chegar aqui. A credencial de 1974 não
          sai do lado do preço · é lá que mora o medo de "vai queimar em três
          meses", não numa página institucional. */}
      <section className="mt-4 border-y border-linha bg-superficie-2">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-5 px-5 py-7">
          <div>
            <h2 className="text-lg font-extrabold tracking-tight">
              Fabricamos bomba submersa vibratória desde 1974
            </h2>
            <p className="mt-1 max-w-2xl text-[14px] text-mudo">
              Fomos a primeira fábrica do país. A marca Rymer vem de 1958, quando o fundador
              aprendeu o ofício na Rymer Bombas.
            </p>
          </div>
          <Link
            href="/sobre"
            className="rounded-lg bg-marca-escuro px-5 py-2.5 text-[13.5px] font-bold text-white"
          >
            Conheça a nossa história →
          </Link>
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
