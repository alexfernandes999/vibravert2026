import { prisma } from "@/lib/prisma";
import { RelogioPainel } from "@/components/relogio-painel";
import { Prateleira } from "@/components/montar-vitrine";

export const dynamic = "force-dynamic";
export const metadata = { title: "Vitrine da loja" };

/**
 * Montar o que aparece na página inicial.
 *
 * Duas prateleiras, com o número de vagas que a loja realmente mostra. Ver a
 * vaga vazia é o que faz entender que existe uma vaga · a tabela de produtos
 * com um ícone na ponta não contava isso a ninguém.
 */
const CAMPOS = {
  id: true, nome: true, sku: true, preco: true, vazaoMaxima: true,
  imagens: { where: { principal: true }, select: { url: true, alt: true }, take: 1 },
} as const;

export default async function Vitrine() {
  const [bombas, pecas] = await Promise.all([
    prisma.produto.findMany({
      where: { ativo: true, tipo: "BOMBA" },
      orderBy: [{ destaque: "desc" }, { vazaoMaxima: "desc" }],
      select: { ...CAMPOS, destaque: true },
    }),
    prisma.produto.findMany({
      where: { ativo: true, tipo: "PECA" },
      orderBy: [{ naVitrine: "desc" }, { preco: "desc" }],
      select: { ...CAMPOS, naVitrine: true },
    }),
  ]);

  const limpar = <T extends { preco: unknown }>(l: T[]) =>
    l.map((p) => ({ ...p, preco: Number(p.preco) }));

  return (
    <div className="p-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-extrabold tracking-tight">Vitrine da loja</h1>
        <div className="ml-auto"><RelogioPainel /></div>
      </div>
      <p className="mt-1.5 max-w-2xl text-[13.5px] leading-relaxed text-tinta-2">
        O que aparece na página inicial. Clique numa vaga para escolher o produto, e no
        <strong className="font-bold"> × </strong> para tirar. A troca aparece na loja na hora.
      </p>

      <Prateleira
        titulo="Mais vendidas"
        explica="A primeira prateleira da home. Quem entra vê estas quatro antes de qualquer outra · e cada uma ganha o selo LÍDER EM VENDAS no cartão."
        campo="destaque"
        vagas={4}
        escolhidos={limpar(bombas.filter((p) => p.destaque))}
        disponiveis={limpar(bombas.filter((p) => !p.destaque))}
      />

      <Prateleira
        titulo="Peças originais"
        explica="Duas linhas de quatro, na seção de reposição. Use para as peças que o cliente procura depois que a bomba dá problema · caneca, kit e martelete saem mais que arruela."
        campo="naVitrine"
        vagas={8}
        escolhidos={limpar(pecas.filter((p) => p.naVitrine))}
        disponiveis={limpar(pecas.filter((p) => !p.naVitrine))}
      />
    </div>
  );
}
