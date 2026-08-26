"use client";

import { useState } from "react";

/**
 * O PIX do pedido, para pagar sem sair da loja.
 *
 * O copia-e-cola vem primeiro e o QR depois, e não o contrário: a maioria
 * fecha a compra no próprio celular, onde não há uma segunda tela para
 * apontar a câmera. Quem está no computador rola dez pixels e acha o código.
 *
 * O botão diz "Copiado" e volta sozinho · sem essa confirmação a pessoa
 * copia três vezes por não saber se funcionou, e depois cola duas.
 */
export function PixDoPedido({ codigo, qr }: { codigo: string; qr: string }) {
  const [copiado, setCopiado] = useState(false);

  return (
    <section className="rounded-caixa border border-linha bg-superficie p-5">
      <h2 className="text-[15px] font-extrabold">Pague com PIX</h2>
      <p className="mt-1 text-[13.5px] leading-relaxed text-tinta-2">
        Abra o aplicativo do seu banco, escolha PIX e cole o código. A confirmação é imediata
        e o pedido entra em separação sozinho.
      </p>

      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(codigo);
          } catch {
            // Alguns navegadores em http ou em janela anônima recusam a área
            // de transferência. O código continua visível abaixo para copiar
            // à mão · pior seria um botão que não faz nada e não explica.
          }
          setCopiado(true);
          setTimeout(() => setCopiado(false), 2500);
        }}
        className="mt-3.5 w-full rounded-lg bg-bom py-3.5 text-[14.5px] font-extrabold text-white transition active:scale-[0.99]"
      >
        {copiado ? "Copiado ✓" : "Copiar código PIX"}
      </button>

      <p className="num mt-2.5 break-all rounded-lg border border-linha bg-fundo px-3 py-2.5 text-[11px] leading-relaxed text-mudo">
        {codigo}
      </p>

      <details className="mt-3 group">
        <summary className="cursor-pointer list-none text-[13px] font-bold text-marca">
          Prefiro apontar a câmera <span className="group-open:hidden">↓</span>
        </summary>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={qr}
          alt="QR Code do PIX"
          width={220}
          height={220}
          className="mx-auto mt-3 rounded-lg border border-linha bg-white p-2"
        />
      </details>
    </section>
  );
}
