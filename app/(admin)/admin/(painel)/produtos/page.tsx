import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { registrarAcao } from "@/lib/admin-auth";
import { DESCONTO_PIX } from "@/lib/formato";
import { TabelaProdutos, type LinhaProduto } from "@/components/admin/tabela-produtos";
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

/** Depósitos do Bling que a lista mostra (ids fixos da conta da Vibra Vert). */
const DEPOSITO = { darwin: "853471300", mlFull: "5230762183" };

/**
 * Saldo por depósito vindo do espelho do Bling, pelo código do produto.
 * O Bling tem vários cadastros com o mesmo código (anúncios antigos excluídos);
 * vale o ativo, que é o que o estoque de verdade usa.
 */
async function saldosDoBling(skus: string[]) {
  const [produtos, saldos] = await Promise.all([
    prisma.espelhoBling.findMany({ where: { entidade: "produto", codigo: { in: skus } }, select: { blingId: true, codigo: true, resumo: true } }),
    prisma.espelhoBling.findMany({ where: { entidade: "saldo", codigo: { in: skus } }, select: { blingId: true, resumo: true, lidoEm: true } }),
  ]);
  const ativo = new Map<string, string>();
  for (const p of produtos) {
    if ((p.resumo as { situacao?: string }).situacao === "A" && p.codigo) ativo.set(p.codigo, p.blingId);
  }
  const porId = new Map(saldos.map((s) => [s.blingId, s]));
  const mapa = new Map<string, { darwin: number; mlFull: number }>();
  for (const [codigo, blingId] of ativo) {
    const s = porId.get(blingId);
    if (!s) continue;
    const dep = (s.resumo as { depositos?: { id: number; saldoFisico: number }[] }).depositos ?? [];
    const de = (id: string) => dep.find((d) => String(d.id) === id)?.saldoFisico ?? 0;
    mapa.set(codigo, { darwin: de(DEPOSITO.darwin), mlFull: de(DEPOSITO.mlFull) });
  }
  const lido = saldos.reduce<Date | null>((m, s) => (!m || s.lidoEm > m ? s.lidoEm : m), null);
  return { mapa, lido };
}

export default async function Produtos() {
  const produtos = await prisma.produto.findMany({
    orderBy: [{ marca: "asc" }, { preco: "asc" }],
    select: {
      id: true, slug: true, nome: true, sku: true, marca: true, preco: true, ativo: true, destaque: true, naVitrine: true,
      voltagem: true, pocoPolegadas: true, versao: true, principalDaFamilia: true,
      _count: { select: { imagens: true, especificacoes: true } },
      imagens: { where: { principal: true }, select: { url: true }, take: 1 },
      categorias: { select: { categoria: { select: { nome: true } } } },
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

  const { mapa: saldo, lido } = await saldosDoBling(produtos.map((p) => p.sku));

  const linhas: LinhaProduto[] = produtos.map((p) => ({
    id: p.id,
    nome: p.nome,
    sku: p.sku,
    marca: p.marca,
    categorias: p.categorias.map((c) => c.categoria.nome),
    preco: Number(p.preco),
    ativo: p.ativo,
    imagem: p.imagens[0]?.url ?? null,
    detalhe: [p.pocoPolegadas && `poço ${p.pocoPolegadas}"`, p.versao.replace("_", " + "), `${p._count.especificacoes} specs`].filter(Boolean).join(" · "),
    tipo: p.tipo === "BOMBA" ? p.versao : p.tipo,
    voltagem: p.voltagem,
    principal: p.principalDaFamilia,
    darwin: saldo.get(p.sku)?.darwin ?? null,
    mlFull: saldo.get(p.sku)?.mlFull ?? null,
    // marcado mas fora da regra da prateleira (inativo, outro tipo) aparece como posição alta
    vitrine: p.naVitrine ? (vitrine.get(p.id) ?? 99) : null,
    lider: p.destaque ? (lider.get(p.id) ?? 99) : null,
  }));

  return (
    <div className="p-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-extrabold tracking-tight">Produtos</h1>
        <Link
          href="/admin/produtos/novo"
          className="ml-auto rounded-lg bg-marca px-3.5 py-2 text-[12.5px] font-extrabold text-white"
        >
          + Novo produto
        </Link>
      </div>
      <p className="mt-0.5 text-[13px] text-mudo">
        {produtos.filter((p) => p.ativo).length} ativos de {produtos.length}. O preço a prazo se edita na própria
        linha e o PIX ({Math.round(DESCONTO_PIX * 100)}% off) acompanha. Estoque Darwin e ML Full vem do Bling
        {lido ? `, lido em ${lido.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" })}` : ""}.
      </p>

      <TabelaProdutos
        linhas={linhas}
        limiteLider={LIMITE_LIDER}
        limiteVitrine={LIMITE_VITRINE}
        alternarAtivo={alternarAtivo}
        alternarVitrine={alternarVitrine}
        alternarDestaque={alternarDestaque}
      />
    </div>
  );
}
