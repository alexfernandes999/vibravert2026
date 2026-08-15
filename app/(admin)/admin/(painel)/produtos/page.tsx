import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { registrarAcao } from "@/lib/admin-auth";
import { brl } from "@/lib/formato";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

async function alternarAtivo(id: string, ativo: boolean) {
  "use server";
  await prisma.produto.update({ where: { id }, data: { ativo } });
  await registrarAcao("alterou o produto");
  revalidatePath("/admin/produtos");
}

/**
 * O selo de líder em vendas é decisão comercial, não cálculo.
 *
 * Serve tanto para destacar o que realmente vende quanto para dar saída ao que
 * está parado no estoque, e quem sabe disso é quem toca a loja. Por isso é um
 * botão aqui, e não uma regra escondida no código.
 */
/**
 * Escolher o que aparece na prateleira da home.
 *
 * Separado do selo de líder: dar saída ao que está parado não é a mesma coisa
 * que dizer que é o mais vendido. Com um campo só, arrumar a vitrine obrigava
 * a mentir no selo.
 */
async function alternarVitrine(id: string, naVitrine: boolean) {
  "use server";
  await prisma.produto.update({ where: { id }, data: { naVitrine } });
  await registrarAcao(naVitrine ? "colocou na vitrine" : "tirou da vitrine");
  revalidatePath("/admin/produtos");
  revalidatePath("/", "layout");
}

async function alternarDestaque(id: string, destaque: boolean) {
  "use server";
  await prisma.produto.update({ where: { id }, data: { destaque } });
  revalidatePath("/admin/produtos");
  revalidatePath("/", "layout");
}

export default async function Produtos() {
  const produtos = await prisma.produto.findMany({
    orderBy: [{ marca: "asc" }, { preco: "asc" }],
    select: {
      id: true, slug: true, nome: true, sku: true, marca: true, preco: true, ativo: true, destaque: true, naVitrine: true,
      voltagem: true, pocoPolegadas: true, versao: true, principalDaFamilia: true,
      _count: { select: { imagens: true, especificacoes: true } },
      imagens: { where: { principal: true }, select: { url: true }, take: 1 },
      tipo: true, vazaoMaxima: true,
    },
  });

  /**
   * Em que posição cada marcado aparece na loja.
   *
   * O número importa porque a prateleira tem tamanho: "Mais vendidas" mostra
   * 4 e a de peças mostra 8. Sem ele, quem marca o quinto produto não descobre
   * que ele não vai aparecer · e fica achando que o painel não salvou.
   *
   * A ordem aqui é a mesma que a loja usa, senão o número mentiria.
   */
  const LIMITE_LIDER = 4;
  const LIMITE_VITRINE = 8;

  const posicao = (lista: typeof produtos) =>
    new Map(lista.map((p, i) => [p.id, i + 1]));

  const lider = posicao(
    produtos
      .filter((p) => p.ativo && p.destaque && p.tipo === "BOMBA")
      .sort((a, b) => (b.vazaoMaxima ?? 0) - (a.vazaoMaxima ?? 0)),
  );

  const vitrine = posicao(
    produtos
      .filter((p) => p.ativo && p.naVitrine && p.tipo === "PECA")
      .sort((a, b) => Number(b.preco) - Number(a.preco)),
  );

  return (
    <div className="p-6">
      <h1 className="text-xl font-extrabold tracking-tight">Produtos</h1>
      <p className="mt-0.5 text-[13px] text-mudo">
        {produtos.filter((p) => p.ativo).length} ativos de {produtos.length} · o número diz em que
        posição o produto aparece na loja. A prateleira de bombas mostra {LIMITE_LIDER} e a de peças
        mostra {LIMITE_VITRINE} · quem passar disso fica marcado, mas não aparece
      </p>

      <div className="mt-5 overflow-x-auto rounded-caixa border border-linha bg-superficie">
        <table className="w-full text-[12.5px]">
          <thead>
            <tr className="border-b border-linha text-left text-[10px] uppercase tracking-[0.12em] text-mudo">
              <th className="px-4 py-2.5 font-bold" colSpan={2}>Produto</th>
              <th className="px-2 py-2.5 font-bold">SKU</th>
              <th className="px-2 py-2.5 font-bold">Versão</th>
              <th className="px-2 py-2.5 text-right font-bold">Preço</th>
              <th className="px-2 py-2.5 text-center font-bold" title="Aparece na prateleira da home">Vitrine</th>
              <th className="px-2 py-2.5 text-center font-bold" title="Selo de líder em vendas no cartão">Líder</th>
              <th className="px-4 py-2.5 font-bold">Situação</th>
            </tr>
          </thead>
          <tbody>
            {produtos.map((p) => (
              <tr key={p.id} className="border-b border-linha last:border-0">
                <td className="w-14 py-1.5 pl-4">
                  {p.imagens[0] && (
                    <Link href={`/admin/produtos/${p.id}`}>
                    <Image
                      src={p.imagens[0].url}
                      alt=""
                      width={44}
                      height={44}
                      className="h-11 w-11 rounded-lg border border-linha object-cover transition hover:border-marca"
                    />
                    </Link>
                  )}
                </td>
                <td className="py-2 pl-2">
                  {p.principalDaFamilia && <span className="mr-1 text-ouro-escuro">★</span>}
                  <Link href={`/admin/produtos/${p.id}`} className="font-semibold hover:text-marca hover:underline">
                    {p.nome}
                  </Link>
                  <span className="num block text-[10.5px] text-mudo">
                    {p.voltagem} {p.pocoPolegadas && `· poço ${p.pocoPolegadas}"`} · {p._count.especificacoes} specs
                  </span>
                </td>
                <td className="num px-2 py-2 text-mudo">{p.sku}</td>
                <td className="px-2 py-2 text-mudo">{p.versao.replace("_", " + ")}</td>
                <td className="num px-2 py-2 text-right font-bold">{brl(Number(p.preco))}</td>
                <td className="px-2 py-2 text-center">
                  <form action={alternarVitrine.bind(null, p.id, !p.naVitrine)}>
                    <Posicao
                      n={vitrine.get(p.id)}
                      limite={LIMITE_VITRINE}
                      cor="marca"
                      titulo={p.naVitrine ? "Tirar da prateleira da home" : "Mostrar na prateleira da home"}
                    />
                  </form>
                </td>
                <td className="px-2 py-2 text-center">
                  <form action={alternarDestaque.bind(null, p.id, !p.destaque)}>
                    <Posicao
                      n={lider.get(p.id)}
                      limite={LIMITE_LIDER}
                      cor="ouro"
                      titulo={p.destaque ? "Tirar o selo de líder em vendas" : "Marcar como líder em vendas"}
                    />
                  </form>
                </td>
                <td className="px-4 py-2">
                  <form action={alternarAtivo.bind(null, p.id, !p.ativo)}>
                    <button
                      className={`rounded px-2 py-0.5 text-[10px] font-extrabold tracking-wide ${
                        p.ativo ? "bg-bom-suave text-bom" : "bg-critico/10 text-critico"
                      }`}
                    >
                      {p.ativo ? "ATIVO" : "INATIVO"}
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * O botão que liga e desliga, mostrando a posição na loja.
 *
 * Marcado e dentro do limite: número em cor cheia · é o que se vê no site.
 * Marcado e fora do limite: número riscado, porque a prateleira acabou.
 * Não marcado: traço, que convida a clicar sem parecer erro.
 */
function Posicao({
  n,
  limite,
  cor,
  titulo,
}: {
  n?: number;
  limite: number;
  cor: "ouro" | "marca";
  titulo: string;
}) {
  const dentro = n !== undefined && n <= limite;
  const fora = n !== undefined && n > limite;

  return (
    <button
      title={
        fora
          ? `Marcado, mas a prateleira mostra só ${limite} · este é o ${n}º`
          : dentro
            ? `Aparece na posição ${n} da prateleira`
            : titulo
      }
      className={`num grid h-6 w-6 place-items-center rounded-md text-[11.5px] font-extrabold transition ${
        dentro
          ? cor === "ouro"
            ? "bg-ouro text-ouro-txt"
            : "bg-marca text-white"
          : fora
            ? "border border-dashed border-linha-2 text-mudo line-through"
            : "text-linha-2 hover:bg-superficie-2 hover:text-tinta-2"
      }`}
    >
      {n ?? "–"}
    </button>
  );
}
