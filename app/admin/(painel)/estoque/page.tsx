import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { CONTROLA_ESTOQUE } from "@/lib/loja";

export const dynamic = "force-dynamic";

async function gravar(dados: FormData) {
  "use server";
  const id = String(dados.get("produtoId"));
  const q = Number(dados.get("quantidade"));
  if (!id || !Number.isFinite(q) || q < 0) return;
  await prisma.estoque.upsert({
    where: { produtoId: id },
    update: { quantidade: q },
    create: { produtoId: id, quantidade: q },
  });
  revalidatePath("/admin/estoque");
}

export default async function Estoque() {
  const itens = await prisma.produto.findMany({
    where: { ativo: true },
    orderBy: [{ marca: "asc" }, { nome: "asc" }],
    select: { id: true, nome: true, sku: true, marca: true, estoque: { select: { quantidade: true, minimo: true } } },
  });

  return (
    <div className="p-6">
      <h1 className="text-xl font-extrabold tracking-tight">Estoque</h1>

      {!CONTROLA_ESTOQUE && (
        <p className="mt-3 rounded-caixa border border-atencao/30 bg-atencao/5 px-4 py-3 text-[13px] leading-snug text-atencao">
          <strong className="font-extrabold">A trava está desligada.</strong> A loja vende mesmo com
          quantidade zero, porque o cadastro veio da VTEX com 99.999 em tudo — o mesmo que não
          controlar. Depois de lançar as quantidades reais aqui, ligar{" "}
          <code className="rounded bg-atencao/10 px-1">CONTROLA_ESTOQUE</code> em lib/loja.ts.
        </p>
      )}

      <table className="mt-5 w-full overflow-hidden rounded-caixa border border-linha bg-superficie text-[13px]">
        <thead>
          <tr className="border-b border-linha text-left text-[10px] uppercase tracking-[0.12em] text-mudo">
            <th className="px-4 py-2.5 font-bold">Produto</th>
            <th className="px-3 py-2.5 font-bold">SKU</th>
            <th className="px-3 py-2.5 text-right font-bold">Quantidade</th>
          </tr>
        </thead>
        <tbody>
          {itens.map((p) => (
            <tr key={p.id} className="border-b border-linha last:border-0">
              <td className="px-4 py-2 font-semibold">{p.nome}</td>
              <td className="num px-3 py-2 text-mudo">{p.sku}</td>
              <td className="px-3 py-2">
                <form action={gravar} className="flex items-center justify-end gap-2">
                  <input type="hidden" name="produtoId" value={p.id} />
                  <input
                    name="quantidade"
                    type="number"
                    min={0}
                    defaultValue={p.estoque?.quantidade ?? 0}
                    className="num w-20 rounded-lg border border-linha-2 px-2 py-1.5 text-right font-bold"
                  />
                  <button className="rounded-lg border border-linha-2 px-2.5 py-1.5 text-[12px] font-bold text-marca">
                    Salvar
                  </button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
