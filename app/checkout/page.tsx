import { redirect } from "next/navigation";
import Image from "next/image";
import type { Metadata } from "next";
import { obterCarrinho } from "@/lib/carrinho";
import { pagamentoDisponivel } from "./acoes";
import { FormularioCheckout } from "@/components/formulario-checkout";
import { brl } from "@/lib/formato";

export const metadata: Metadata = { title: "Finalizar compra", robots: { index: false, follow: false } };

export default async function Checkout() {
  const c = await obterCarrinho();
  if (!c.itens.length) redirect("/carrinho");

  return (
    <div className="mx-auto grid max-w-7xl gap-9 px-5 py-8 lg:grid-cols-[1fr_330px]">
      <div>
        <h1 className="mb-6 text-2xl font-extrabold tracking-tight">Finalizar compra</h1>
        <FormularioCheckout total={c.total} totalPix={c.totalPix} pagamentoConfigurado={await pagamentoDisponivel()} />
      </div>

      <aside className="h-fit rounded-caixa border border-linha bg-superficie-2 p-5 lg:sticky lg:top-6">
        <h2 className="text-[15px] font-extrabold">Seu pedido</h2>
        <ul className="mt-4 space-y-3 border-b border-linha pb-4">
          {c.itens.map((i) => (
            <li key={i.id} className="flex gap-3">
              {i.imagem && (
                <span className="shrink-0 rounded-lg bg-superficie p-1">
                  <Image src={i.imagem.url} alt={i.imagem.alt} width={48} height={48} className="h-12 w-12 object-contain" />
                </span>
              )}
              <span className="min-w-0 flex-1 text-[12.5px] font-semibold leading-snug">
                {i.nome}
                <span className="num mt-0.5 block font-normal text-mudo">{i.qtd} un · {brl(i.total)}</span>
              </span>
            </li>
          ))}
        </ul>

        <dl className="mt-4 space-y-2 text-[13.5px]">
          <div className="flex justify-between"><dt className="text-tinta-2">Subtotal</dt><dd className="num font-bold">{brl(c.subtotal)}</dd></div>
          <div className="flex justify-between">
            <dt className="text-tinta-2">Frete</dt>
            <dd className={`num font-bold ${c.freteGratis ? "text-bom" : ""}`}>{c.freteGratis ? "Grátis" : brl(c.frete)}</dd>
          </div>
          <div className="flex justify-between border-t border-linha pt-3 text-[17px]">
            <dt className="font-extrabold">Total</dt><dd className="num font-extrabold">{brl(c.total)}</dd>
          </div>
        </dl>

        <p className="num mt-3 rounded-lg bg-bom-suave px-3.5 py-2.5 text-[13px] font-extrabold text-bom">
          {brl(c.totalPix)} pagando no PIX
        </p>
      </aside>
    </div>
  );
}
