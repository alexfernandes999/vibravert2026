"use client";

import Link from "next/link";
import Image from "next/image";
import { escolheuItem } from "@/components/rastreio";

/**
 * Cartão de modelo na página de campanha.
 *
 * Mostra o que decide a compra de uma bomba de poço, nesta ordem: em que poço
 * entra, quanto entrega, quanto custa no PIX e qual é a garantia daquele
 * modelo · e não uma garantia genérica, porque ela muda de um para o outro.
 */
export type ModeloCartao = {
  sku: string;
  slug: string;
  nome: string;
  marca: string;
  titulo: string;
  poco: number | null;
  voltagens: string;
  vazao: string | null;
  garantia: string | null;
  preco: number;
  precoCheio: string;
  precoPix: string;
  parcela: string;
  imagem: { url: string; alt: string } | null;
  freteGratis: boolean;
  categoria: string;
};

export function CartaoBombaLanding({ m, lista }: { m: ModeloCartao; lista: string }) {
  return (
    <article className="flex flex-col overflow-hidden rounded-caixa border border-linha bg-superficie transition-shadow hover:shadow-lg hover:shadow-tinta/10">
      <Link
        href={`/produto/${m.slug}`}
        onClick={() =>
          escolheuItem(lista, {
            sku: m.sku,
            quantidade: 1,
            precoUnitario: m.preco,
            nome: m.nome,
            marca: m.marca,
            categoria: m.categoria,
            variacao: m.voltagens,
          })
        }
        className="flex flex-1 flex-col"
      >
        <div className="relative aspect-square bg-white">
          {m.imagem && (
            <Image
              src={m.imagem.url}
              alt={m.imagem.alt || m.nome}
              fill
              sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 260px"
              className="object-contain p-3"
            />
          )}
          {m.poco && (
            <span className="absolute left-2.5 top-2.5 rounded-md bg-marca-suave px-2 py-1 text-[11px] font-extrabold text-marca">
              Poço de {m.poco}&quot;
            </span>
          )}
        </div>

        <div className="flex flex-1 flex-col px-4 pb-4">
          <h3 className="text-[15.5px] font-extrabold leading-snug tracking-tight text-tinta">{m.titulo}</h3>

          <ul className="num mt-2 space-y-0.5 text-[12.5px] text-tinta-2">
            {m.vazao && <li>Até {m.vazao}</li>}
            <li>{m.voltagens}</li>
            {m.garantia && <li>Garantia de {m.garantia}</li>}
          </ul>

          <div className="mt-3 border-t border-linha pt-3">
            {/* O preço cheio fica à vista junto do PIX · é o mesmo par que a
                loja e o feed publicam, e esconder um dos dois é o que faz o
                Google reprovar o produto por preço divergente. */}
            <p className="num text-[11.5px] font-semibold text-mudo line-through">{m.precoCheio}</p>
            <p className="num text-[22px] font-extrabold leading-none tracking-tight text-tinta">{m.precoPix}</p>
            <p className="text-[11.5px] font-bold text-bom">à vista no PIX</p>
            <p className="num mt-1 text-[12px] text-mudo">ou 10× de {m.parcela} sem juros</p>
            {m.freteGratis && (
              <p className="mt-1.5 text-[12px] font-extrabold text-bom">Frete grátis para todo o Brasil</p>
            )}
          </div>

          <span className="mt-3 block rounded-lg bg-ouro py-2.5 text-center text-[13.5px] font-extrabold text-ouro-txt">
            Ver oferta
          </span>
        </div>
      </Link>
    </article>
  );
}
