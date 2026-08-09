import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { PAGINAS, acharPagina, EMPRESA } from "@/lib/paginas";

export const dynamicParams = false;

export function generateStaticParams() {
  return PAGINAS.map((p) => ({ institucional: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ institucional: string }> }): Promise<Metadata> {
  const p = acharPagina((await params).institucional);
  if (!p) return {};
  return { title: p.titulo, description: p.resumo, alternates: { canonical: `/${p.slug}` } };
}

export default async function Institucional({ params }: { params: Promise<{ institucional: string }> }) {
  const p = acharPagina((await params).institucional);
  if (!p) notFound();

  return (
    <article className="mx-auto max-w-2xl px-5 py-12">
      <h1 className="text-3xl font-extrabold tracking-tight text-balance">{p.titulo}</h1>
      <p className="mt-2 text-[15px] text-mudo">{p.resumo}</p>

      <div className="mt-8 space-y-4">
        {p.corpo.map((bloco, i) =>
          bloco.startsWith("## ") ? (
            <h2 key={i} className="pt-4 text-lg font-extrabold tracking-tight">{bloco.slice(3)}</h2>
          ) : (
            <p
              key={i}
              className="text-[14.5px] leading-relaxed text-tinta-2"
              dangerouslySetInnerHTML={{
                __html: bloco
                  .replace(/\*\*(.+?)\*\*/g, "<strong class='font-bold text-tinta'>$1</strong>")
                  .replace(/\[CONFIRMAR\]/g, "<span class='rounded bg-atencao/10 px-1.5 py-0.5 text-[12px] font-extrabold text-atencao'>A CONFIRMAR</span>"),
              }}
            />
          ),
        )}
      </div>

      <footer className="mt-10 border-t border-linha pt-5 text-[12.5px] leading-relaxed text-mudo">
        {EMPRESA.nome} · CNPJ {EMPRESA.cnpj}
        <br />
        {EMPRESA.endereco}
      </footer>
    </article>
  );
}
