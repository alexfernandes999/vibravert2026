"use client";

import { useState, useTransition } from "react";
import { retomarPagamento } from "@/lib/retomar";

/**
 * Retomar o pagamento de um pedido parado.
 *
 * É o destino de todo lembrete de carrinho abandonado. O link do Mercado Pago
 * vence, então ele não vai no e-mail nem no WhatsApp: o que vai é o endereço
 * desta página, e o link novo nasce aqui, no clique.
 */
export function BotaoPagar({ numero }: { numero: number }) {
  const [erro, setErro] = useState("");
  const [indo, iniciar] = useTransition();

  return (
    <div className="mt-5">
      <button
        onClick={() =>
          iniciar(async () => {
            const r = await retomarPagamento(numero);
            if (r.ok) window.location.href = r.link;
            else setErro(r.erro);
          })
        }
        disabled={indo}
        className="w-full rounded-lg bg-marca px-6 py-3.5 text-[15px] font-bold text-white shadow-lg shadow-marca/25 transition hover:brightness-110 active:scale-[0.99] disabled:opacity-70 sm:w-auto"
      >
        {indo ? "Abrindo o pagamento…" : "Pagar agora"}
      </button>
      <p className="mt-2 text-[12.5px] text-mudo">
        Você vai para o ambiente seguro do Mercado Pago e volta para cá em seguida.
      </p>
      {erro && (
        <p role="alert" className="mt-2 text-[12.5px] font-semibold text-critico">
          {erro}
        </p>
      )}
    </div>
  );
}
