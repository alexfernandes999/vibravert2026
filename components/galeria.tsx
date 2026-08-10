"use client";

import { useState } from "react";
import Image from "next/image";

/**
 * Galeria da ficha de produto.
 *
 * As miniaturas não faziam nada: eram imagens soltas, sem clique. Miniatura que
 * não troca a foto principal é pior do que não ter miniatura, porque o
 * visitante tenta, não acontece nada, e conclui que o site está quebrado.
 *
 * A foto preenche o quadro inteiro. Antes ficava contida num fundo claro, e a
 * sobra em volta destoava do resto da página.
 */
export function Galeria({
  imagens,
  nome,
}: {
  imagens: { url: string; alt: string }[];
  nome: string;
}) {
  const [atual, setAtual] = useState(0);
  if (!imagens.length) return null;

  const foto = imagens[atual];

  return (
    <div>
      <div className="relative aspect-square overflow-hidden rounded-caixa border border-linha bg-superficie-2">
        <Image
          key={foto.url}
          src={foto.url}
          alt={foto.alt || nome}
          fill
          priority
          sizes="(max-width: 768px) 100vw, 560px"
          className="object-cover"
        />

        {imagens.length > 1 && (
          <>
            <Seta
              lado="esq"
              onClick={() => setAtual((i) => (i - 1 + imagens.length) % imagens.length)}
            />
            <Seta lado="dir" onClick={() => setAtual((i) => (i + 1) % imagens.length)} />
            <span className="num absolute bottom-3 right-3 rounded-full bg-marca-escuro/75 px-2.5 py-1 text-[11px] font-bold text-white">
              {atual + 1} / {imagens.length}
            </span>
          </>
        )}
      </div>

      {imagens.length > 1 && (
        <ul className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]">
          {imagens.map((img, i) => (
            <li key={img.url}>
              <button
                type="button"
                onClick={() => setAtual(i)}
                aria-label={`Ver foto ${i + 1}`}
                aria-current={i === atual}
                className={`block h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 transition ${
                  i === atual ? "border-marca" : "border-linha hover:border-marca-linha"
                }`}
              >
                <Image
                  src={img.url}
                  alt=""
                  width={64}
                  height={64}
                  className="h-full w-full object-cover"
                />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Seta({ lado, onClick }: { lado: "esq" | "dir"; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={lado === "esq" ? "Foto anterior" : "Próxima foto"}
      className={`absolute top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-superficie/85 text-marca shadow-md backdrop-blur-sm transition hover:bg-superficie ${
        lado === "esq" ? "left-3" : "right-3"
      }`}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" className="h-5 w-5">
        <path d={lado === "esq" ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
