import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { obterCarrinho } from "@/lib/carrinho";
import { pagamentoDisponivel } from "./acoes";
import { registrar } from "@/lib/analitica";
import { FormularioCheckout } from "@/components/formulario-checkout";

export const metadata: Metadata = { title: "Finalizar compra", robots: { index: false, follow: false } };

export default async function Checkout() {
  const c = await obterCarrinho();
  if (!c.itens.length) redirect("/carrinho");
  await registrar("CHECKOUT");

  return (
    <div className="mx-auto max-w-7xl px-5 py-8">
      <h1 className="mb-6 text-2xl font-extrabold tracking-tight">Finalizar compra</h1>

      {/* O total muda a cada frete escolhido, e quem sabe o frete escolhido é o
          formulário. Por isso o resumo vai junto, como dado: a lateral e o
          botão de finalizar precisam dizer o mesmo número. */}
      <FormularioCheckout
        subtotal={c.subtotal}
        freteFallback={c.frete}
        pagamentoConfigurado={await pagamentoDisponivel()}
        itens={c.itens.map((i) => ({
          id: i.id,
          nome: i.nome,
          qtd: i.qtd,
          total: i.total,
          imagem: i.imagem,
        }))}
      />
    </div>
  );
}
