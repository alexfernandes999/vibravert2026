import { prisma } from "@/lib/prisma";
import { brl } from "@/lib/formato";
import { revalidatePath } from "next/cache";
import type { PedidoStatus } from "@prisma/client";
import Link from "next/link";
import { Selo } from "@/components/selo-pedido";

export const dynamic = "force-dynamic";

/** O fluxo real do galpão: o próximo passo, e só ele. */
const PROXIMO: Partial<Record<PedidoStatus, { para: PedidoStatus; r: string }>> = {
  PAGO: { para: "SEPARANDO", r: "Separar" },
  SEPARANDO: { para: "ENVIADO", r: "Marcar enviado" },
  ENVIADO: { para: "ENTREGUE", r: "Marcar entregue" },
};

async function avancar(id: string, para: PedidoStatus) {
  "use server";
  await prisma.pedido.update({ where: { id }, data: { status: para } });
  revalidatePath("/admin/pedidos");
}

const FILTROS: { v: string; r: string }[] = [
  { v: "", r: "Todos" },
  { v: "PAGO", r: "A separar" },
  { v: "SEPARANDO", r: "Separando" },
  { v: "ENVIADO", r: "Enviados" },
  { v: "AGUARDANDO_PAGAMENTO", r: "Aguardando" },
];

export default async function Pedidos({ searchParams }: { searchParams: Promise<{ s?: string }> }) {
  const { s } = await searchParams;
  const pedidos = await prisma.pedido.findMany({
    where: s ? { status: s as PedidoStatus } : {},
    orderBy: { criadoEm: "desc" },
    take: 100,
    include: { cliente: { select: { nome: true, email: true } }, endereco: true, itens: true },
  });

  return (
    <div className="p-6">
      <h1 className="text-xl font-extrabold tracking-tight">Pedidos</h1>

      {/* Quem abre esta tela quer saber o que precisa sair hoje, não navegar
          por tudo. O filtro segue a ordem do galpão. */}
      <nav className="mt-3 flex flex-wrap gap-1.5">
        {FILTROS.map((f) => (
          <Link
            key={f.v}
            href={f.v ? `/admin/pedidos?s=${f.v}` : "/admin/pedidos"}
            className={`rounded-lg px-3 py-1.5 text-[12.5px] font-bold ${
              (s ?? "") === f.v ? "bg-marca text-white" : "border border-linha bg-superficie text-tinta-2"
            }`}
          >
            {f.r}
          </Link>
        ))}
      </nav>

      {pedidos.length === 0 ? (
        <p className="mt-5 rounded-caixa border border-linha bg-superficie p-6 text-[13.5px] text-mudo">
          Nenhum pedido ainda. Assim que a loja receber o primeiro, ele aparece aqui.
        </p>
      ) : (
        <ul className="mt-5 space-y-3">
          {pedidos.map((p) => {
            const prox = PROXIMO[p.status];
            return (
              <li key={p.id} className="rounded-caixa border border-linha bg-superficie p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="num text-[15px] font-extrabold">#{p.numero}</span>
                  <Selo s={p.status} />
                  <span className="text-[13px] font-semibold">{p.cliente.nome}</span>
                  <span className="text-[12.5px] text-mudo">{p.metodo.replace("_", " ")}</span>
                  <span className="num ml-auto text-[15px] font-extrabold">{brl(Number(p.total))}</span>
                </div>

                <p className="num mt-2 text-[12px] text-mudo">
                  {p.endereco.cidade}/{p.endereco.uf} · CEP {p.endereco.cep} ·{" "}
                  {p.itens.reduce((s, i) => s + i.quantidade, 0)} item(s) ·{" "}
                  {p.criadoEm.toLocaleDateString("pt-BR")}
                </p>

                <ul className="mt-2 text-[12.5px] text-tinta-2">
                  {p.itens.map((i) => (
                    <li key={i.id} className="num">
                      {i.quantidade}× {i.nomeProduto} <span className="text-mudo">({i.skuProduto})</span>
                    </li>
                  ))}
                </ul>

                {prox && (
                  <form action={avancar.bind(null, p.id, prox.para)} className="mt-3">
                    <button className="rounded-lg bg-marca px-4 py-2 text-[12.5px] font-bold text-white">
                      {prox.r}
                    </button>
                  </form>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
