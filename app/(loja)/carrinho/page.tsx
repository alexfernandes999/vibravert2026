import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { obterCarrinho, alterar, remover } from "@/lib/carrinho";
import { brl } from "@/lib/formato";
import { PARCELAS_SEM_JUROS, FRETE_GRATIS_ACIMA } from "@/lib/loja";

export const metadata: Metadata = {
  title: "Carrinho",
  robots: { index: false, follow: false },
};

export default async function Carrinho() {
  const c = await obterCarrinho();

  if (!c.itens.length) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-20 text-center">
        <h1 className="text-2xl font-extrabold tracking-tight">Seu carrinho está vazio</h1>
        <p className="mt-2 text-[15px] text-mudo">
          Não sabe qual bomba serve no seu poço? A gente responde em quatro perguntas.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/qual-bomba" className="rounded-lg bg-marca px-5 py-3 text-sm font-bold text-white">
            Qual bomba eu preciso?
          </Link>
          <Link href="/bombas" className="rounded-lg border-[1.5px] border-marca px-5 py-3 text-sm font-bold text-marca">
            Ver a linha completa
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto grid max-w-7xl gap-8 px-5 py-8 lg:grid-cols-[1fr_340px]">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Seu carrinho</h1>

        <ul className="mt-5 divide-y divide-linha rounded-caixa border border-linha bg-superficie">
          {c.itens.map((i) => (
            <li key={i.id} className="flex gap-4 p-4">
              <Link href={`/produto/${i.slug}`} className="shrink-0 rounded-lg bg-superficie-2 p-2">
                {i.imagem && (
                  <Image src={i.imagem.url} alt={i.imagem.alt} width={80} height={80} className="h-20 w-20 object-contain" />
                )}
              </Link>

              <div className="min-w-0 flex-1">
                <Link href={`/produto/${i.slug}`} className="text-[13.5px] font-bold leading-snug">
                  {i.nome}
                </Link>
                <p className="num mt-1 text-[11px] font-semibold text-mudo">
                  SKU {i.sku}
                  {i.voltagem && ` · ${i.voltagem}`}
                  {i.pocoPolegadas && ` · poço ${i.pocoPolegadas}"`}
                </p>

                <div className="mt-2.5 flex flex-wrap items-center gap-3">
                  <form action={alterar.bind(null, i.id, i.qtd - 1)}>
                    <button className="rounded-l-lg border border-linha-2 px-2.5 py-1 text-[13px]" aria-label="Diminuir">−</button>
                  </form>
                  <span className="num -mx-2 text-[13.5px] font-bold">{i.qtd}</span>
                  <form action={alterar.bind(null, i.id, i.qtd + 1)}>
                    <button className="rounded-r-lg border border-linha-2 px-2.5 py-1 text-[13px]" aria-label="Aumentar">+</button>
                  </form>

                  <form action={remover.bind(null, i.id)} className="ml-auto">
                    <button className="text-[12.5px] font-semibold text-mudo underline underline-offset-2">
                      Remover
                    </button>
                  </form>
                </div>
              </div>

              <p className="num shrink-0 text-[15px] font-extrabold">{brl(i.total)}</p>
            </li>
          ))}
        </ul>

        {/* Faltando pouco para o frete grátis, dizer quanto falta vende mais
            do que só informar que existe a promoção. */}
        {!c.freteGratis && c.faltaParaFreteGratis > 0 && (
          <p className="mt-3 rounded-caixa border border-ouro/40 bg-ouro/10 px-4 py-3 text-[13px] font-semibold text-ouro-txt">
            Faltam <span className="num font-extrabold">{brl(c.faltaParaFreteGratis)}</span> para o
            frete sair de graça — acima de {brl(FRETE_GRATIS_ACIMA)} não se paga entrega.
          </p>
        )}
      </div>

      <aside className="h-fit rounded-caixa border border-linha bg-superficie-2 p-5">
        <h2 className="text-[15px] font-extrabold">Resumo</h2>

        <dl className="mt-4 space-y-2 text-[13.5px]">
          <div className="flex justify-between">
            <dt className="text-tinta-2">Subtotal</dt>
            <dd className="num font-bold">{brl(c.subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-tinta-2">Frete</dt>
            <dd className={`num font-bold ${c.freteGratis ? "text-bom" : ""}`}>
              {c.freteGratis ? "Grátis" : brl(c.frete)}
            </dd>
          </div>
          <div className="flex justify-between border-t border-linha pt-3 text-[17px]">
            <dt className="font-extrabold">Total</dt>
            <dd className="num font-extrabold">{brl(c.total)}</dd>
          </div>
        </dl>

        <div className="mt-4 rounded-lg bg-bom-suave px-4 py-3">
          <p className="num text-[15px] font-extrabold text-bom">{brl(c.totalPix)} no PIX</p>
          <p className="num text-[12px] font-semibold text-bom">
            economia de {brl(c.economiaPix)}
          </p>
        </div>

        <p className="num mt-2 text-[12.5px] font-semibold text-mudo">
          ou {PARCELAS_SEM_JUROS}× de {brl(c.total / PARCELAS_SEM_JUROS)} sem juros
        </p>

        <Link
          href="/checkout"
          className="mt-4 block rounded-lg bg-ouro py-3.5 text-center text-sm font-extrabold text-ouro-txt shadow-lg shadow-ouro/25"
        >
          Finalizar compra
        </Link>

        <p className="mt-3 text-center text-[11.5px] text-mudo">
          O frete definitivo é calculado pelo CEP na próxima etapa.
        </p>
      </aside>
    </div>
  );
}
