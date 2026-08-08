import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { CartaoProduto } from "@/components/cartao-produto";

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
  const [maisVendidas, precos] = await Promise.all([
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
  ]);

  return (
    <>
      {/* O slogan é o oficial da marca, o mesmo da embalagem. */}
      <section className="border-b border-linha bg-gradient-to-br from-marca-suave via-superficie to-superficie">
        <div className="mx-auto grid max-w-7xl items-center gap-8 px-5 py-12 md:grid-cols-2">
          <div>
            <p className="text-[10.5px] font-extrabold uppercase tracking-[0.16em] text-marca">
              Loja Oficial · Fabricação própria
            </p>
            <h1 className="mt-3 text-4xl font-extrabold leading-tight tracking-tight text-balance md:text-5xl">
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

          {/* Antes de vazão, o comprador precisa saber se a bomba entra no poço.
              É a dúvida que mais gera devolução, então vira o primeiro caminho. */}
          <div className="rounded-caixa border border-marca-linha bg-superficie p-6 shadow-xl shadow-marca/5">
            <h2 className="text-lg font-extrabold tracking-tight">Comece pelo seu poço</h2>
            <p className="mt-1 text-[13px] text-mudo">
              O diâmetro do poço define quais modelos cabem. É o primeiro filtro.
            </p>
            <div className="mt-4 grid gap-2.5">
              <Link
                href="/bombas?poco=6"
                className="flex items-center gap-3 rounded-lg border border-linha px-4 py-3 hover:border-marca hover:bg-marca-suave"
              >
                <span className="num text-2xl font-extrabold text-marca">6&quot;</span>
                <span className="text-[13px] font-semibold leading-tight">
                  Poço de 6 polegadas
                  <span className="block font-medium text-mudo">Linha Rymer · 150 mm</span>
                </span>
              </Link>
              <Link
                href="/bombas?poco=8"
                className="flex items-center gap-3 rounded-lg border border-linha px-4 py-3 hover:border-marca hover:bg-marca-suave"
              >
                <span className="num text-2xl font-extrabold text-marca">8&quot;</span>
                <span className="text-[13px] font-semibold leading-tight">
                  Poço de 8 polegadas ou mais
                  <span className="block font-medium text-mudo">Vibra Vert 900 e Vibrinha</span>
                </span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Prateleira titulo="Mais vendidas" produtos={maisVendidas} />

      <section className="mx-auto max-w-7xl px-5">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-caixa bg-gradient-to-br from-marca-escuro to-marca-claro p-7 text-white">
            <p className="text-[9.5px] font-extrabold uppercase tracking-[0.18em] opacity-80">
              Direto da fábrica
            </p>
            <h2 className="mt-2 text-xl font-extrabold tracking-tight">Sem intermediário</h2>
            <p className="mt-1 text-[13px] opacity-90">
              Quem fabrica vende pelo preço justo — e assiste depois da venda.
            </p>
          </div>
          <div className="rounded-caixa bg-gradient-to-br from-marca-claro to-ciano p-7 text-white">
            <p className="text-[9.5px] font-extrabold uppercase tracking-[0.18em] opacity-80">
              Suporte técnico
            </p>
            <h2 className="mt-2 text-xl font-extrabold tracking-tight">
              Não sabe qual bomba serve?
            </h2>
            <p className="mt-1 text-[13px] opacity-90">
              Diga a profundidade e o diâmetro do poço. Indicamos o modelo certo.
            </p>
          </div>
        </div>
      </section>

      <Prateleira titulo="Preços imbatíveis" produtos={precos} verTudo="/bombas?ordem=preco" />
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
    <section className="mx-auto max-w-7xl px-5 py-9">
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
