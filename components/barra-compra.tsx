"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { adicionar } from "@/lib/carrinho";
import { noCarrinho } from "@/components/rastreio";

/**
 * Barra de compra fixa no rodapé do celular.
 *
 * No celular a caixa de preço fica logo abaixo da foto, e quem desce para ler
 * a ficha técnica, a curva e o vídeo · justamente quem está decidindo · perde
 * o botão de vista. Para comprar precisava subir a página inteira de volta.
 *
 * Só aparece depois que a caixa de preço saiu da tela por cima, e some quando
 * ela volta: duas chamadas para comprar ao mesmo tempo na tela é ruído.
 */
export function BarraCompra({
  alvo,
  produtoId,
  sku,
  nome,
  preco,
  precoPix,
}: {
  /** id da caixa de preço da página. */
  alvo: string;
  produtoId: string;
  sku: string;
  nome: string;
  preco: number;
  precoPix: string;
}) {
  const [visivel, setVisivel] = useState(false);
  const [pendente, iniciar] = useTransition();
  const router = useRouter();

  useEffect(() => {
    const el = document.getElementById(alvo);
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      setVisivel(!e.isIntersecting && e.boundingClientRect.top < 0);
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, [alvo]);

  // O botão do WhatsApp sobe junto, para a barra não ficar por cima dele.
  useEffect(() => {
    document.body.toggleAttribute("data-barra-compra", visivel);
    return () => document.body.removeAttribute("data-barra-compra");
  }, [visivel]);

  return (
    <div
      aria-hidden={!visivel}
      className={`fixed inset-x-0 bottom-0 z-40 border-t border-linha bg-superficie/95 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 shadow-[0_-8px_24px_rgba(18,23,42,0.08)] backdrop-blur transition-transform duration-300 md:hidden ${
        visivel ? "translate-y-0" : "pointer-events-none translate-y-full"
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12px] font-semibold text-tinta-2">{nome}</p>
          <p className="num text-[15px] font-extrabold leading-tight text-tinta">
            {precoPix} <span className="text-[11.5px] font-bold text-bom">no PIX</span>
          </p>
        </div>
        <button
          type="button"
          tabIndex={visivel ? 0 : -1}
          disabled={pendente}
          onClick={() =>
            iniciar(async () => {
              await adicionar(produtoId, 1);
              noCarrinho(sku, nome, preco, 1);
              router.push("/carrinho");
            })
          }
          className="shrink-0 rounded-lg bg-ouro px-5 py-3 text-sm font-extrabold text-ouro-txt shadow-lg shadow-ouro/25 disabled:opacity-60"
        >
          {pendente ? "Adicionando…" : "Comprar"}
        </button>
      </div>
    </div>
  );
}
