import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { SeletorVersao } from "@/components/seletor-versao";
import { Video } from "@/components/video";
import { brl, precoPix, parcela, PARCELAS_MAX, ALTURAS_MCA, litros } from "@/lib/formato";

export const revalidate = 300;

async function irmas(familia: string | null, slug: string) {
  if (!familia) return [];
  return prisma.produto.findMany({
    where: { familia, ativo: true },
    select: { slug: true, versao: true, preco: true, principalDaFamilia: true },
  });
}

async function buscar(slug: string) {
  return prisma.produto.findUnique({
    where: { slug },
    include: {
      especificacoes: { orderBy: { ordem: "asc" } },
      imagens: { orderBy: { ordem: "asc" } },
      estoque: true,
    },
  });
}

export async function generateStaticParams() {
  const todos = await prisma.produto.findMany({ where: { ativo: true }, select: { slug: true } });
  return todos.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const p = await buscar((await params).slug);
  if (!p) return {};
  return {
    title: p.metaTitulo ?? p.nome,
    description: p.metaDescricao ?? undefined,
    // A URL indexada é a da versão principal: quatro páginas quase idênticas
    // disputando a mesma busca é o que diluía a força do produto.
    alternates: { canonical: `/produto/${(await irmas(p.familia, p.slug)).find((i) => i.principalDaFamilia)?.slug ?? p.slug}` },
    openGraph: {
      title: p.nome,
      description: p.metaDescricao ?? undefined,
      images: p.imagens[0] ? [p.imagens[0].url] : undefined,
    },
  };
}

export default async function PaginaProduto({ params }: { params: Promise<{ slug: string }> }) {
  const p = await buscar((await params).slug);
  if (!p || !p.ativo) notFound();

  const preco = Number(p.preco);
  const capa = p.imagens[0];
  const versoes = await irmas(p.familia, p.slug);
  // O vídeo é da família de modelo, não da montagem: a bomba é a mesma com
  // ou sem boia. A família guarda a tensão junto, então tira-se o sufixo.
  const video = p.familia
    ? await prisma.video.findFirst({
        where: { ativo: true, familia: p.familia.replace(/-(110127v|220v)$/, "") },
      })
    : null;

  return (
    <article className="mx-auto max-w-7xl px-5 py-8">
      <div className="grid gap-10 md:grid-cols-2">
        <div>
          <div className="flex items-center justify-center rounded-caixa border border-linha bg-superficie-2 p-8">
            {capa && (
              <Image
                src={capa.url}
                alt={capa.alt}
                width={640}
                height={640}
                priority
                className="h-80 w-auto object-contain"
                sizes="(max-width: 768px) 100vw, 560px"
              />
            )}
          </div>
          {p.imagens.length > 1 && (
            <ul className="mt-3 flex gap-2 overflow-x-auto">
              {p.imagens.slice(0, 8).map((img) => (
                <li key={img.url} className="shrink-0 rounded-lg border border-linha bg-superficie-2 p-1.5">
                  <Image src={img.url} alt={img.alt} width={64} height={64} className="h-14 w-14 object-contain" />
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <p className="text-[10.5px] font-extrabold uppercase tracking-[0.16em] text-marca">{p.marca}</p>
          <h1 className="mt-2 text-2xl font-extrabold leading-snug tracking-tight text-balance">{p.nome}</h1>
          <p className="mt-2 flex flex-wrap gap-4 text-[11px] font-semibold tracking-wide text-mudo">
            <span>SKU {p.sku}</span>
            {p.modelo && <span>Modelo {p.modelo}</span>}
          </p>

          {/* O diâmetro do poço vem antes do preço: é o que decide se a bomba
              serve. Errar isso é a principal causa de devolução. */}
          {p.pocoPolegadas && (
            <p className="mt-4 inline-flex items-center gap-2 rounded-lg bg-marca-suave px-3.5 py-2 text-[13px] font-bold text-marca">
              Para poço de {p.pocoPolegadas} polegadas
              {p.saiaProtecao && <span className="font-semibold">· com saia de proteção lateral</span>}
            </p>
          )}

          <div className="mt-5 rounded-caixa border border-linha bg-superficie-2 p-5">
            <p className="num text-3xl font-extrabold tracking-tight">{brl(preco)}</p>
            <p className="num mt-2 text-[13px] font-extrabold text-bom">
              {brl(precoPix(preco))} à vista no PIX · 5% de desconto
            </p>
            <p className="num mt-1 text-[13px] font-semibold text-tinta-2">
              ou até {PARCELAS_MAX}× de {brl(parcela(preco))} sem juros
            </p>
            <button
              type="button"
              className="mt-4 w-full rounded-lg bg-marca py-3.5 text-sm font-bold text-white shadow-lg shadow-marca/25"
            >
              Comprar agora
            </button>
          </div>

          <SeletorVersao versoes={versoes} atual={p.versao} />

          <Confianca especificacoes={p.especificacoes} />

          {p.curvaVazao.length > 0 && <Curva curva={p.curvaVazao} />}
        </div>
      </div>

      <section className="mt-10 border-t border-linha pt-7">
        <h2 className="text-lg font-extrabold tracking-tight">Ficha técnica</h2>
        <p className="mt-1 text-[13px] text-mudo">
          Dados da embalagem do fabricante. Os mesmos alimentam os filtros da loja e o feed
          do Google Shopping — cadastrados uma vez só.
        </p>
        <div className="mt-4 overflow-hidden rounded-caixa border border-linha">
          <table className="w-full text-[13px]">
            <tbody>
              {p.especificacoes
                .filter((e) => e.nome !== "Curva de vazão")
                .map((e, i) => (
                  <tr key={e.id} className={i % 2 ? "" : "bg-superficie-2"}>
                    <th
                      scope="row"
                      className="w-2/5 px-4 py-2.5 text-left text-[10.2px] font-bold uppercase tracking-[0.12em] text-mudo"
                    >
                      {e.nome}
                    </th>
                    <td className="num px-4 py-2.5 font-bold">{e.valor}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>

      {video && (
        <section className="mt-9 max-w-2xl">
          <h2 className="mb-3 text-lg font-extrabold tracking-tight">Veja a bomba funcionando</h2>
          <Video youtubeId={video.youtubeId} titulo={video.titulo} resumo={video.resumo} />
        </section>
      )}

      {p.descricao && (
        <section className="mt-8 max-w-3xl">
          <h2 className="text-lg font-extrabold tracking-tight">Sobre este produto</h2>
          <div className="mt-2 whitespace-pre-line text-[14.5px] leading-relaxed text-tinta-2">
            {p.descricao}
          </div>
        </section>
      )}

      {/* O Merchant Center compara o feed com a landing page: preço e
          disponibilidade precisam bater, ou o produto é reprovado. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            name: p.nome,
            sku: p.sku,
            ...(p.ean ? { gtin13: p.ean } : { mpn: p.sku }),
            brand: { "@type": "Brand", name: p.marca },
            description: p.metaDescricao ?? p.descricao?.slice(0, 300),
            image: p.imagens.map((i) => i.url),
            offers: {
              "@type": "Offer",
              price: preco.toFixed(2),
              priceCurrency: "BRL",
              availability: "https://schema.org/InStock",
              itemCondition: "https://schema.org/NewCondition",
            },
          }),
        }}
      />
    </article>
  );
}

/**
 * O prazo de garantia é o da embalagem do fabricante — 1 ano na maior parte da
 * linha, 6 meses na Rymer 1500. O cadastro antigo anunciava 2 anos em todos, o
 * que nenhum modelo tem: prazo anunciado obriga a ser honrado, e publicar mais
 * do que a fábrica cobre transfere o prejuízo para a loja.
 *
 * Quando não há ficha oficial, nada é publicado. Omitir é melhor que inventar.
 */
function Confianca({ especificacoes }: { especificacoes: { nome: string; valor: string }[] }) {
  const garantia = especificacoes.find((e) => e.nome === "Garantia")?.valor;
  const acompanha = especificacoes.find((e) => e.nome === "Acompanha")?.valor;

  const itens = [
    garantia && { t: `Garantia de ${garantia}`, d: "de fábrica, contra defeito de fabricação" },
    acompanha && { t: "Kit de instalação incluso", d: acompanha },
    {
      t: "A assistência é nossa",
      d: "quem conserta é a fábrica, não um posto terceirizado",
      href: "/assistencia",
    },
  ].filter(Boolean) as { t: string; d: string; href?: string }[];

  return (
    <ul className="mt-5 space-y-2.5">
      {itens.map((i) => (
        <li key={i.t} className="flex gap-2.5">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-0.5 h-4 w-4 shrink-0 text-marca">
            <path d="M12 3l8 3v6c0 5-3.4 8.1-8 9-4.6-.9-8-4-8-9V6z" />
            <path d="M9 12l2 2 4-4" />
          </svg>
          <span className="text-[13px] leading-snug">
            {i.href ? (
              <Link href={i.href} className="font-bold underline decoration-marca/30 underline-offset-2">
                {i.t}
              </Link>
            ) : (
              <strong className="font-bold">{i.t}</strong>
            )}
            <span className="block text-mudo">{i.d}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

/**
 * Bomba vibratória perde vazão conforme a altura que precisa vencer. Anunciar
 * só a vazão máxima leva o cliente a comprar esperando 2.500 litros e receber
 * 750 no poço dele. A curva inteira evita essa frustração — e é o dado que a
 * concorrência não publica.
 */
function Curva({ curva }: { curva: number[] }) {
  const max = curva[0];
  return (
    <section className="mt-5 rounded-caixa border border-linha bg-superficie p-5">
      <h2 className="text-sm font-extrabold tracking-tight">Vazão por altura</h2>
      <p className="mt-0.5 text-[12.5px] text-mudo">
        Quanto esta bomba entrega conforme a altura que precisa vencer.
      </p>
      <ul className="mt-4 space-y-1.5">
        {ALTURAS_MCA.map((a, i) => (
          <li key={a} className="flex items-center gap-3">
            <span className="num w-12 shrink-0 text-right text-[11.5px] font-bold text-mudo">{a} m</span>
            <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-superficie-2">
              <span
                className="block h-full rounded-full bg-marca-claro"
                style={{ width: `${Math.round((curva[i] / max) * 100)}%` }}
              />
            </span>
            <span className="num w-20 shrink-0 text-right text-[11.5px] font-bold">{litros(curva[i])}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
