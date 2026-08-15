"use client";

import { useState } from "react";

/**
 * Os 11 erros, com o resto escondido no celular.
 *
 * Onze cartões empilhados numa tela de telefone são quase duas rolagens de
 * dedo antes de chegar no bloco do kit de reparo, que é o que vende. No
 * desktop cabem todos em três colunas e não há por que esconder nada.
 *
 * O botão diz quantos faltam. "Ver mais" sozinho não deixa a pessoa decidir se
 * vale o toque.
 */
const VISIVEIS_NO_CELULAR = 3;

export function ListaErros({ children }: { children: React.ReactNode[] }) {
  const [tudo, setTudo] = useState(false);
  const escondidos = children.length - VISIVEIS_NO_CELULAR;

  return (
    <>
      <ol className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {children.map((c, i) => (
          <li
            key={i}
            // O corte é só no celular: `sm:block` devolve todos a partir do
            // tablet, sem depender do estado do botão.
            className={!tudo && i >= VISIVEIS_NO_CELULAR ? "hidden sm:block" : ""}
          >
            {c}
          </li>
        ))}
      </ol>

      {!tudo && escondidos > 0 && (
        <button
          onClick={() => setTudo(true)}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-caixa border border-marca bg-superficie px-4 py-3 text-[13.5px] font-bold text-marca transition active:scale-[0.99] sm:hidden"
        >
          Ver os outros {escondidos} erros
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" className="h-4 w-4">
            <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      )}
    </>
  );
}
