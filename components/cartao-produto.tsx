import Link from "next/link";
import Image from "next/image";
import { brl, precoPix, parcela, PARCELAS_MAX, litros } from "@/lib/formato";

export type ProdutoVitrine = {
  slug: string;
  destaque?: boolean;
  nome: string;
  marca: string;
  preco: unknown;
  vazaoMaxima: number | null;
  voltagem: string | null;
  pocoPolegadas: number | null;
  saiaProtecao: boolean;
  imagens: { url: string; alt: string }[];
};

/**
 * Quem compra bomba de poço compara por número, não por foto: vazão, tensão e
 * — antes de tudo — diâmetro do poço, porque a bomba errada simplesmente não
 * entra. Por isso os três aparecem já na prateleira, e não escondidos dentro
 * da página do produto.
 */
export function CartaoProduto({ p }: { p: ProdutoVitrine }) {
  // O selo vem do cadastro, não da posição na prateleira: quem decide o que é
  // líder de vendas é o comercial, e é ele que usa isso para dar saída ao que
  // está parado.
  const lider = p.destaque === true;
  const capa = p.imagens[0];
  const preco = Number(p.preco);

  return (
    <article className="group revelar flex flex-col overflow-hidden rounded-caixa border border-linha bg-superficie transition duration-300 hover:-translate-y-1 hover:border-marca-linha hover:shadow-xl hover:shadow-marca/10">
      {/* As fotos novas são a bomba de pé, em fundo branco · quase o dobro de
          altura que de largura. Com `object-cover` num quadrado, o corte comia
          a saída de água em cima e a etiqueta embaixo, que é justamente onde
          está o modelo. Com `contain` sobre fundo branco não sobra moldura
          nenhuma: o branco da foto encosta no branco do cartão. */}
      <Link href={`/produto/${p.slug}`} className="relative block aspect-square overflow-hidden bg-superficie">
        {capa ? (
          <Image
            src={capa.url}
            alt={capa.alt}
            fill
            className="object-contain p-2 transition-transform duration-500 group-hover:scale-[1.06]"
            sizes="(max-width: 640px) 50vw, 300px"
          />
        ) : null}
        {lider && (
          <span className="absolute left-0 top-3 flex items-center gap-1.5 rounded-r-full bg-ouro py-1 pl-2.5 pr-3 text-[10px] font-extrabold uppercase tracking-wide text-ouro-txt shadow-md">
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
              <path d="M12 2l2.6 5.6 6.1.8-4.5 4.2 1.2 6.1L12 15.8 6.6 18.7l1.2-6.1L3.3 8.4l6.1-.8z" />
            </svg>
            Líder em vendas
          </span>
        )}
        {p.saiaProtecao && (
          // Quem não é instalador não sabe o que é "saia". O title explica no
          // toque e no mouse, sem gastar linha do cartão com uma legenda.
          <span
            title="Saia de proteção: borracha que envolve o corpo e deixa a bomba trabalhar justa no poço sem bater nas paredes"
            className="absolute right-2.5 top-2.5 flex items-center gap-1 rounded bg-ciano px-1.5 py-0.5 text-[9.5px] font-extrabold uppercase tracking-wider text-white"
          >
            Com saia
            <span aria-hidden className="grid h-3 w-3 place-items-center rounded-full bg-white/25 text-[8px] leading-none">
              ?
            </span>
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col gap-2 p-3.5">
        <span className="text-[9.5px] font-extrabold uppercase tracking-[0.14em] text-marca">
          {p.marca}
        </span>

        <h3 className="min-h-[3.4em] text-[13px] font-semibold leading-snug">
          <Link href={`/produto/${p.slug}`}>{p.nome}</Link>
        </h3>

        <ul className="flex flex-wrap gap-1.5">
          {p.pocoPolegadas && (
            <li className="rounded bg-marca-suave px-1.5 py-0.5 text-[9.5px] font-bold text-marca">
              Poço {p.pocoPolegadas}&quot;
            </li>
          )}
          {p.vazaoMaxima && (
            <li className="num rounded bg-superficie-2 px-1.5 py-0.5 text-[9.5px] font-bold text-tinta-2">
              {litros(p.vazaoMaxima)}
            </li>
          )}
          {p.voltagem && (
            <li className="num rounded bg-superficie-2 px-1.5 py-0.5 text-[9.5px] font-bold text-tinta-2">
              {p.voltagem}
            </li>
          )}
        </ul>

        {/* O preço do PIX vem primeiro e maior. É o valor que a pessoa vai
            pagar de verdade, e ancorar por ele em vez de pelo cheio é o que
            faz o desconto trabalhar a favor da venda. */}
        <div className="mt-auto pt-2">
          <p className="num text-[11.5px] font-semibold text-mudo line-through">{brl(preco)}</p>
          <p className="num text-[22px] font-extrabold leading-tight tracking-tight text-bom">
            {brl(precoPix(preco))}
          </p>
          <p className="text-[11px] font-extrabold uppercase tracking-wide text-bom">
            à vista no PIX
          </p>
          <p className="num mt-1.5 rounded-md bg-superficie-2 px-2 py-1 text-[11.5px] font-bold text-tinta-2">
            ou {PARCELAS_MAX}× de {brl(parcela(preco))} sem juros
          </p>

          {/* Comprar sem sair da prateleira. Obrigar a abrir o produto para
              descobrir onde se compra custa uma etapa em quem já decidiu. */}
          <Link
            href={`/produto/${p.slug}`}
            className="mt-2.5 block rounded-lg bg-marca py-2.5 text-center text-[12.5px] font-bold text-white shadow-md shadow-marca/20 transition hover:brightness-110 active:scale-[0.98]"
          >
            Comprar
          </Link>
        </div>
      </div>
    </article>
  );
}
