import Link from "next/link";
import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { CartaoProduto } from "@/components/cartao-produto";

export const revalidate = 300;

type Busca = { poco?: string; voltagem?: string; acompanha?: string; ordem?: string };

/**
 * Cada combinação com demanda de busca vira uma página própria, indexável.
 * As demais ficam com noindex — a loja antiga tinha 416 categorias para 3.852
 * produtos, muitas com um ou dois itens, competindo entre si no Google. Aqui
 * o caminho é o inverso.
 */
const INDEXAVEIS = new Set(["poco", "voltagem"]);

function titulo(s: Busca) {
  const partes = ["Bombas submersas vibratórias"];
  if (s.poco) partes.push(`para poço de ${s.poco} polegadas`);
  if (s.voltagem) partes.push(s.voltagem);
  if (s.acompanha === "boia") partes.push("com boia de nível");
  if (s.acompanha === "kit") partes.push("com kit de manutenção");
  return partes.join(" ");
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Busca>;
}): Promise<Metadata> {
  const s = await searchParams;
  const filtros = Object.keys(s).filter((k) => k !== "ordem");
  const indexavel = filtros.length <= 1 && filtros.every((f) => INDEXAVEIS.has(f));

  return {
    title: titulo(s),
    description:
      "Bombas submersas vibratórias Vibra Vert e Rymer, direto da fábrica. " +
      "Filtre por diâmetro do poço, vazão e voltagem.",
    robots: indexavel ? { index: true, follow: true } : { index: false, follow: true },
  };
}

export default async function Listagem({ searchParams }: { searchParams: Promise<Busca> }) {
  const s = await searchParams;

  const where: Prisma.ProdutoWhereInput = { ativo: true };
  if (s.poco) where.pocoPolegadas = Number(s.poco);
  if (s.voltagem) where.voltagem = s.voltagem;
  if (s.acompanha === "boia") where.acompanhaBoia = true;
  if (s.acompanha === "kit") where.acompanhaKit = true;

  const [produtos, porPoco, porVoltagem] = await Promise.all([
    prisma.produto.findMany({
      where,
      orderBy: s.ordem === "preco" ? { preco: "asc" } : { vazaoMaxima: "desc" },
      select: {
        slug: true, nome: true, marca: true, preco: true, vazaoMaxima: true,
        voltagem: true, pocoPolegadas: true, saiaProtecao: true,
        imagens: { where: { principal: true }, select: { url: true, alt: true }, take: 1 },
      },
    }),
    prisma.produto.groupBy({ by: ["pocoPolegadas"], where: { ativo: true }, _count: true }),
    prisma.produto.groupBy({ by: ["voltagem"], where: { ativo: true }, _count: true }),
  ]);

  return (
    <div className="mx-auto max-w-7xl gap-8 px-5 py-8 lg:grid lg:grid-cols-[220px_1fr]">
      <aside className="mb-6 lg:mb-0">
        <h2 className="mb-3 text-[13.5px] font-extrabold">Filtrar</h2>

        <Grupo titulo="Diâmetro do poço">
          {porPoco
            .filter((g) => g.pocoPolegadas)
            .sort((a, b) => (a.pocoPolegadas ?? 0) - (b.pocoPolegadas ?? 0))
            .map((g) => (
              <Opcao
                key={g.pocoPolegadas}
                href={alternar(s, "poco", String(g.pocoPolegadas))}
                ativo={s.poco === String(g.pocoPolegadas)}
                rotulo={`${g.pocoPolegadas} polegadas`}
                n={g._count}
              />
            ))}
        </Grupo>

        <Grupo titulo="Voltagem">
          {porVoltagem
            .filter((g) => g.voltagem)
            .map((g) => (
              <Opcao
                key={g.voltagem}
                href={alternar(s, "voltagem", g.voltagem!)}
                ativo={s.voltagem === g.voltagem}
                rotulo={g.voltagem!}
                n={g._count}
              />
            ))}
        </Grupo>

        <Grupo titulo="Acompanha">
          <Opcao href={alternar(s, "acompanha", "boia")} ativo={s.acompanha === "boia"} rotulo="Boia de nível" />
          <Opcao href={alternar(s, "acompanha", "kit")} ativo={s.acompanha === "kit"} rotulo="Kit de manutenção" />
        </Grupo>
      </aside>

      <div>
        <div className="mb-4 flex flex-wrap items-baseline gap-3">
          <h1 className="text-2xl font-extrabold tracking-tight text-balance">{titulo(s)}</h1>
          <span className="num text-[11.5px] font-semibold text-mudo">
            {produtos.length} {produtos.length === 1 ? "produto" : "produtos"}
          </span>
        </div>

        {produtos.length === 0 ? (
          <p className="rounded-caixa border border-linha bg-superficie p-8 text-center text-[14px] text-mudo">
            Nenhuma bomba com esses filtros.{" "}
            <Link href="/bombas" className="font-bold text-marca underline">
              Ver todas
            </Link>
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
            {produtos.map((p) => (
              <CartaoProduto key={p.slug} p={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** Clicar num filtro ativo o remove — sem isso o visitante fica preso nele. */
function alternar(s: Busca, chave: keyof Busca, valor: string) {
  const q = new URLSearchParams(s as Record<string, string>);
  if (q.get(chave) === valor) q.delete(chave);
  else q.set(chave, valor);
  const str = q.toString();
  return str ? `/bombas?${str}` : "/bombas";
}

function Grupo({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-linha py-3.5">
      <h3 className="mb-2.5 text-[10px] font-bold uppercase tracking-[0.13em] text-mudo">{titulo}</h3>
      <ul className="space-y-1">{children}</ul>
    </div>
  );
}

function Opcao({ href, ativo, rotulo, n }: { href: string; ativo: boolean; rotulo: string; n?: number }) {
  return (
    <li>
      <Link
        href={href}
        aria-current={ativo ? "true" : undefined}
        className={`flex items-center gap-2 py-0.5 text-[12.9px] ${
          ativo ? "font-bold text-tinta" : "font-medium text-tinta-2"
        }`}
      >
        <span
          className={`h-3.5 w-3.5 shrink-0 rounded border-[1.5px] ${
            ativo ? "border-marca bg-marca" : "border-linha-2"
          }`}
        />
        {rotulo}
        {n !== undefined && <span className="num ml-auto text-[10.5px] font-bold text-tenue">{n}</span>}
      </Link>
    </li>
  );
}
