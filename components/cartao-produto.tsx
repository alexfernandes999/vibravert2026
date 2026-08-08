import Link from "next/link";
import Image from "next/image";
import { brl, precoPix, parcela, PARCELAS_MAX, litros } from "@/lib/formato";

export type ProdutoVitrine = {
  slug: string;
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
  const capa = p.imagens[0];
  const preco = Number(p.preco);

  return (
    <article className="flex flex-col overflow-hidden rounded-caixa border border-linha bg-superficie transition hover:border-marca-linha hover:shadow-lg hover:shadow-marca/5">
      <Link href={`/produto/${p.slug}`} className="relative block bg-superficie-2 p-4">
        {capa ? (
          <Image
            src={capa.url}
            alt={capa.alt}
            width={300}
            height={300}
            className="mx-auto h-44 w-auto object-contain"
            sizes="(max-width: 640px) 50vw, 300px"
          />
        ) : (
          <div className="h-44" />
        )}
        {p.saiaProtecao && (
          <span className="absolute left-2.5 top-2.5 rounded bg-ciano px-1.5 py-0.5 text-[9.5px] font-extrabold uppercase tracking-wider text-white">
            Com saia
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

        <div className="mt-auto pt-1.5">
          <p className="num text-xl font-extrabold tracking-tight">{brl(preco)}</p>
          <p className="num text-[11.5px] font-bold text-bom">{brl(precoPix(preco))} no PIX</p>
          <p className="num text-[11.5px] font-semibold text-mudo">
            ou {PARCELAS_MAX}× de {brl(parcela(preco))}
          </p>
        </div>
      </div>
    </article>
  );
}
