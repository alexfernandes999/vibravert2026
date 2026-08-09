"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { adicionar } from "@/lib/carrinho";

/**
 * Comprar leva direto ao carrinho, sem modal intermediário.
 *
 * Quem compra bomba compra uma, resolve o problema e sai. Um "continuar
 * comprando" no meio do caminho só adia a conversão desta loja — não é uma
 * loja de navegar.
 */
export function BotaoComprar({ produtoId }: { produtoId: string }) {
  const [qtd, setQtd] = useState(1);
  const [pendente, iniciar] = useTransition();
  const router = useRouter();

  return (
    <div className="mt-4 flex gap-2.5">
      <div className="flex items-center rounded-lg border border-linha-2 bg-superficie">
        <button
          type="button"
          onClick={() => setQtd((q) => Math.max(1, q - 1))}
          className="px-3.5 py-3 text-tinta-2"
          aria-label="Diminuir quantidade"
        >
          −
        </button>
        <span className="num w-6 text-center text-[14px] font-bold" aria-live="polite">{qtd}</span>
        <button
          type="button"
          onClick={() => setQtd((q) => q + 1)}
          className="px-3.5 py-3 text-tinta-2"
          aria-label="Aumentar quantidade"
        >
          +
        </button>
      </div>

      <button
        type="button"
        disabled={pendente}
        onClick={() =>
          iniciar(async () => {
            await adicionar(produtoId, qtd);
            router.push("/carrinho");
          })
        }
        className="flex-1 rounded-lg bg-ouro py-3.5 text-sm font-extrabold text-ouro-txt shadow-lg shadow-ouro/25 disabled:opacity-60"
      >
        {pendente ? "Adicionando…" : "Comprar agora"}
      </button>
    </div>
  );
}
