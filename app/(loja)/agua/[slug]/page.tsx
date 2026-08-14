import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { MATERIAS, materiaPorSlug } from "@/lib/materias";

export const revalidate = 86400;

/** As três páginas são estáticas: texto que não muda não precisa de servidor. */
export function generateStaticParams() {
  return MATERIAS.map((m) => ({ slug: m.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const m = materiaPorSlug((await params).slug);
  if (!m) return {};
  return {
    title: m.metaTitulo,
    description: m.metaDescricao,
    alternates: { canonical: `/agua/${m.slug}` },
    openGraph: { title: m.metaTitulo, description: m.metaDescricao, type: "article" },
  };
}

export default async function Materia({ params }: { params: Promise<{ slug: string }> }) {
  const m = materiaPorSlug((await params).slug);
  if (!m) notFound();

  const outras = MATERIAS.filter((o) => o.slug !== m.slug);
  const dataBonita = new Date(m.publicadaEm + "T12:00:00").toLocaleDateString("pt-BR", {
    day: "2-digit", month: "long", year: "numeric",
  });

  return (
    <article className="mx-auto max-w-3xl px-5 py-10">
      <nav aria-label="Você está em" className="text-[11.5px] font-semibold text-mudo">
        <Link href="/" className="hover:text-marca">Início</Link>
        <span className="mx-1.5">›</span>
        <span className="text-tinta-2">{m.chapeu}</span>
      </nav>

      <p className="mt-6 text-[11px] font-extrabold uppercase tracking-[0.16em] text-marca">
        {m.chapeu}
      </p>
      <h1 className="mt-2 text-3xl font-extrabold leading-tight tracking-tight text-balance md:text-4xl">
        {m.titulo}
      </h1>
      <p className="mt-3 text-[16.5px] leading-relaxed text-tinta-2">{m.resumo}</p>
      <p className="mt-3 text-[12.5px] font-semibold text-mudo">
        Publicado em <time dateTime={m.publicadaEm}>{dataBonita}</time>
      </p>

      {/* Os números primeiro, em bloco. Quem chega de busca quer o dado, e
          quem quer o contexto lê o texto abaixo. */}
      <dl className="mt-7 grid gap-3 sm:grid-cols-3">
        {m.destaques.map((d) => (
          <div key={d.rotulo} className="rounded-caixa border border-linha bg-superficie-2 p-4">
            <dt className="num text-2xl font-extrabold tracking-tight text-marca">{d.valor}</dt>
            <dd className="mt-1 text-[12.5px] leading-snug text-mudo">{d.rotulo}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-7 space-y-4">
        {m.paragrafos.map((p) => (
          <p key={p.slice(0, 40)} className="text-[16px] leading-[1.72] text-tinta-2">{p}</p>
        ))}
      </div>

      <div className="mt-7 rounded-caixa border-l-[3px] border-marca bg-marca-suave px-5 py-4">
        <p className="text-[16px] font-semibold leading-relaxed text-tinta">{m.fecho}</p>
        <Link
          href={m.cta.href}
          className="mt-4 inline-block rounded-lg bg-marca px-5 py-3 text-[13.5px] font-bold text-white shadow-lg shadow-marca/25 transition hover:brightness-110 active:scale-[0.98]"
        >
          {m.cta.rotulo}
        </Link>
      </div>

      <footer className="mt-8 border-t border-linha pt-4">
        <h2 className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-mudo">Fontes</h2>
        <ul className="mt-2 space-y-1 text-[13px] text-tinta-2">
          {m.fontes.map((f) => (
            <li key={f.nome}>
              {f.url ? (
                <a href={f.url} target="_blank" rel="noopener" className="font-semibold text-marca">
                  {f.nome}
                </a>
              ) : (
                f.nome
              )}
            </li>
          ))}
        </ul>
      </footer>

      <section className="mt-10 border-t border-linha pt-6">
        <h2 className="text-[15px] font-extrabold">Leia também</h2>
        <ul className="mt-3 grid gap-3 sm:grid-cols-2">
          {outras.map((o) => (
            <li key={o.slug}>
              <Link
                href={`/agua/${o.slug}`}
                className="block h-full rounded-caixa border border-linha bg-superficie p-4 transition hover:border-marca hover:bg-marca-suave"
              >
                <span className="block text-[10.5px] font-extrabold uppercase tracking-[0.14em] text-marca">
                  {o.chapeu}
                </span>
                <span className="mt-1.5 block text-[14px] font-extrabold leading-tight">{o.titulo}</span>
                <span className="mt-1 block text-[12.5px] leading-snug text-mudo">{o.resumo}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            headline: m.titulo,
            description: m.metaDescricao,
            datePublished: m.publicadaEm,
            author: { "@type": "Organization", name: "Vibra Vert" },
            publisher: { "@type": "Organization", name: "Vibra Vert" },
          }),
        }}
      />
    </article>
  );
}
