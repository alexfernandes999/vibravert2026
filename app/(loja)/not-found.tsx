import Link from "next/link";

import { TELEFONE, TELEFONE_LINK } from "@/lib/contato";
export default function NaoEncontrado() {
  return (
    <div className="mx-auto max-w-xl px-5 py-24 text-center">
      <p className="num text-[13px] font-extrabold tracking-[0.2em] text-marca">ERRO 404</p>
      <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-balance">
        Essa página não existe
      </h1>
      <p className="mt-3 text-[15px] text-tinta-2">
        Pode ter mudado de endereço ou o link veio incompleto. O caminho mais curto para o que você
        procura costuma ser a calculadora.
      </p>
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <Link href="/qual-bomba" className="rounded-lg bg-marca px-5 py-3 text-sm font-bold text-white">
          Qual bomba eu preciso?
        </Link>
        <Link href="/bombas" className="rounded-lg border-[1.5px] border-marca px-5 py-3 text-sm font-bold text-marca">
          Ver a linha completa
        </Link>
      </div>
      <p className="mt-8 text-[13px] text-mudo">
        Prefere falar com alguém?{" "}
        <a href={`tel:${TELEFONE_LINK}`} className="font-bold text-marca">{TELEFONE}</a>
      </p>
    </div>
  );
}
