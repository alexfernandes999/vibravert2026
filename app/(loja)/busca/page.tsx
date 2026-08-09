import Link from "next/link";
import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { CartaoProduto } from "@/components/cartao-produto";

export const dynamic = "force-dynamic";

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ q?: string }> }): Promise<Metadata> {
  const { q } = await searchParams;
  return {
    title: q ? `Busca por “${q}”` : "Busca",
    // Página de resultado não entra no índice: gera uma URL nova a cada termo
    // digitado, e nenhuma delas responde a uma busca de verdade no Google.
    robots: { index: false, follow: true },
  };
}

/**
 * Busca no catálogo.
 *
 * São 47 produtos: um índice de texto completo seria mais infraestrutura do
 * que resultado. O que importa nesta loja é que os termos técnicos funcionem —
 * quem procura escreve "1500", "220v", "sapo" ou o código do produto, e não o
 * nome cadastrado inteiro. Por isso cada palavra é buscada em separado, e o
 * produto precisa casar com todas.
 */
export default async function Busca({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const termo = (await searchParams).q?.trim() ?? "";
  const palavras = termo.split(/\s+/).filter((p) => p.length >= 2).slice(0, 6);

  const produtos = palavras.length
    ? await prisma.produto.findMany({
        where: {
          ativo: true,
          AND: palavras.map<Prisma.ProdutoWhereInput>((p) => ({
            OR: [
              { nome: { contains: p, mode: "insensitive" } },
              { modelo: { contains: p, mode: "insensitive" } },
              { marca: { contains: p, mode: "insensitive" } },
              { sku: { contains: p, mode: "insensitive" } },
              { voltagem: { contains: p, mode: "insensitive" } },
              { especificacoes: { some: { valor: { contains: p, mode: "insensitive" } } } },
            ],
          })),
        },
        // a versão canônica primeiro: quem busca "rymer 1500" quer a bomba,
        // não as quatro montagens dela empilhadas
        orderBy: [{ principalDaFamilia: "desc" }, { vazaoMaxima: "desc" }],
        take: 24,
        select: {
          slug: true, nome: true, marca: true, preco: true, vazaoMaxima: true,
          voltagem: true, pocoPolegadas: true, saiaProtecao: true,
          imagens: { where: { principal: true }, select: { url: true, alt: true }, take: 1 },
        },
      })
    : [];

  return (
    <div className="mx-auto max-w-7xl px-5 py-8">
      <h1 className="text-2xl font-extrabold tracking-tight">
        {termo ? <>Busca por “{termo}”</> : "Busca"}
      </h1>
      {termo && (
        <p className="num mt-1 text-[13px] text-mudo">
          {produtos.length} {produtos.length === 1 ? "resultado" : "resultados"}
        </p>
      )}

      {termo && produtos.length === 0 ? (
        <div className="mt-6 rounded-caixa border border-linha bg-superficie p-8">
          <p className="text-[15px] font-bold">Nenhuma bomba com esse termo.</p>
          <p className="mt-1.5 max-w-lg text-[14px] text-mudo">
            Tente pelo modelo (<span className="font-semibold">Rymer 1500</span>,{" "}
            <span className="font-semibold">Vibra Vert 900</span>), pela tensão ou pelo diâmetro do
            poço. Se não souber qual serve, a calculadora responde em quatro perguntas.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/qual-bomba" className="rounded-lg bg-marca px-5 py-2.5 text-[13.5px] font-bold text-white">
              Qual bomba eu preciso?
            </Link>
            <Link href="/bombas" className="rounded-lg border-[1.5px] border-marca px-5 py-2.5 text-[13.5px] font-bold text-marca">
              Ver todas
            </Link>
          </div>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {produtos.map((p) => (
            <CartaoProduto key={p.slug} p={p} />
          ))}
        </div>
      )}
    </div>
  );
}
