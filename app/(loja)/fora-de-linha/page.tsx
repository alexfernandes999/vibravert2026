import Link from "next/link";
import type { Metadata } from "next";
import { RedeLojas } from "@/components/rede-lojas";

export const metadata: Metadata = {
  title: "Produto fora de linha",
  robots: { index: false, follow: true },
};

/**
 * Servida com status 410 pelo middleware, nas ~3.800 URLs de produtos de
 * terceiros que a loja deixou de vender. Quem chegou aqui digitou o nome de
 * uma bomba no Google: ainda é um comprador, e merece um caminho — não um
 * "página não encontrada".
 */
export default function ForaDeLinha() {
  return (
    <div className="mx-auto max-w-2xl px-5 py-20 text-center">
      <p className="text-[10.5px] font-extrabold uppercase tracking-[0.16em] text-marca">
        Este produto saiu de linha
      </p>
      <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-balance">
        A loja agora vende apenas as bombas de fabricação própria
      </h1>
      <p className="mx-auto mt-4 max-w-lg text-[15px] text-tinta-2">
        Passamos a trabalhar somente com as linhas <strong>Vibra Vert</strong> e{" "}
        <strong>Rymer</strong>, fabricadas por nós, com assistência técnica própria e
        rede de postos autorizados em todo o Brasil.
      </p>

      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <Link
          href="/qual-bomba"
          className="rounded-lg bg-marca px-5 py-3 text-sm font-bold text-white shadow-lg shadow-marca/25"
        >
          Descobrir qual bomba eu preciso
        </Link>
        <Link
          href="/bombas"
          className="rounded-lg border-[1.5px] border-marca px-5 py-3 text-sm font-bold text-marca"
        >
          Ver a linha completa
        </Link>
      </div>

      <div className="mt-12 border-t border-linha text-left">
        <RedeLojas
          origem="410"
          titulo="Procurava uma bomba de outra marca?"
          chamada="Schneider, Ebara, Thebe, Leão e as demais continuam à venda nas outras lojas do Grupo das Bombas ARF."
        />
      </div>

      <p className="mt-2 text-[13px] text-mudo">
        Precisa de ajuda para escolher?{" "}
        <Link href="/fale-conosco" className="font-bold text-marca underline">
          Fale com a gente
        </Link>{" "}
 · informe a profundidade e o diâmetro do seu poço.
      </p>
    </div>
  );
}
