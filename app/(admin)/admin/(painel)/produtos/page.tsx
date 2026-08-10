import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { brl } from "@/lib/formato";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

async function alternarAtivo(id: string, ativo: boolean) {
  "use server";
  await prisma.produto.update({ where: { id }, data: { ativo } });
  revalidatePath("/admin/produtos");
}

export default async function Produtos() {
  const produtos = await prisma.produto.findMany({
    orderBy: [{ marca: "asc" }, { preco: "asc" }],
    select: {
      id: true, slug: true, nome: true, sku: true, marca: true, preco: true, ativo: true,
      voltagem: true, pocoPolegadas: true, versao: true, principalDaFamilia: true,
      _count: { select: { imagens: true, especificacoes: true } },
      imagens: { where: { principal: true }, select: { url: true }, take: 1 },
    },
  });

  return (
    <div className="p-6">
      <h1 className="text-xl font-extrabold tracking-tight">Produtos</h1>
      <p className="mt-0.5 text-[13px] text-mudo">
        {produtos.filter((p) => p.ativo).length} ativos de {produtos.length} · ★ marca a versão
        cuja URL o Google indexa
      </p>

      <div className="mt-5 overflow-x-auto rounded-caixa border border-linha bg-superficie">
        <table className="w-full text-[12.5px]">
          <thead>
            <tr className="border-b border-linha text-left text-[10px] uppercase tracking-[0.12em] text-mudo">
              <th className="px-4 py-2.5 font-bold" colSpan={2}>Produto</th>
              <th className="px-2 py-2.5 font-bold">SKU</th>
              <th className="px-2 py-2.5 font-bold">Versão</th>
              <th className="px-2 py-2.5 text-right font-bold">Preço</th>
              <th className="px-2 py-2.5 text-center font-bold">Fotos</th>
              <th className="px-4 py-2.5 font-bold">Situação</th>
            </tr>
          </thead>
          <tbody>
            {produtos.map((p) => (
              <tr key={p.id} className="border-b border-linha last:border-0">
                <td className="w-14 py-1.5 pl-4">
                  {p.imagens[0] && (
                    <Image
                      src={p.imagens[0].url}
                      alt=""
                      width={44}
                      height={44}
                      className="h-11 w-11 rounded-lg border border-linha object-cover"
                    />
                  )}
                </td>
                <td className="py-2 pl-2">
                  {p.principalDaFamilia && <span className="mr-1 text-ouro-escuro">★</span>}
                  <Link href={`/produto/${p.slug}`} className="font-semibold hover:underline">
                    {p.nome}
                  </Link>
                  <span className="num block text-[10.5px] text-mudo">
                    {p.voltagem} {p.pocoPolegadas && `· poço ${p.pocoPolegadas}"`} · {p._count.especificacoes} specs
                  </span>
                </td>
                <td className="num px-2 py-2 text-mudo">{p.sku}</td>
                <td className="px-2 py-2 text-mudo">{p.versao.replace("_", " + ")}</td>
                <td className="num px-2 py-2 text-right font-bold">{brl(Number(p.preco))}</td>
                <td className="num px-2 py-2 text-center text-mudo">{p._count.imagens}</td>
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
