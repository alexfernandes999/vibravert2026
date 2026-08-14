"use client";

import { useState } from "react";

/**
 * Newsletter do rodapé.
 *
 * Guarda o e-mail localmente até haver envio ligado: sem chave do Resend, um
 * formulário que "envia" e não faz nada é pior que não ter formulário · a
 * pessoa acha que se cadastrou e nunca recebe.
 *
 * Por isso a mensagem de sucesso diz a verdade: o e-mail foi anotado, e o
 * primeiro envio sai quando a lista abrir.
 */
export function RodapeNewsletter() {
  const [email, setEmail] = useState("");
  const [pronto, setPronto] = useState(false);

  return (
    <div className="border-b border-linha bg-marca-suave">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-7 md:flex-row md:items-center">
        <div className="md:flex-1">
          <p className="text-[15px] font-extrabold tracking-tight">
            Receba lançamentos, vídeos e cupons de desconto
          </p>
          <p className="mt-1 text-[13px] text-tinta-2">
            Sem spam. Só quando tem novidade de verdade.
          </p>
        </div>

        {pronto ? (
          <p className="rounded-lg border border-bom/30 bg-bom-suave px-4 py-3 text-[13px] font-bold text-bom md:w-[380px]">
            Anotado! Você recebe o primeiro assim que a lista abrir.
          </p>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              try {
                const lista = JSON.parse(localStorage.getItem("vv_news") ?? "[]") as string[];
                if (!lista.includes(email)) lista.push(email);
                localStorage.setItem("vv_news", JSON.stringify(lista));
              } catch {
                // Navegador com armazenamento bloqueado não pode travar o aviso.
              }
              setPronto(true);
            }}
            className="flex gap-2 md:w-[380px]"
          >
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com.br"
              aria-label="Seu e-mail"
              className="min-w-0 flex-1 rounded-lg border border-linha-2 bg-superficie px-3 py-2.5 text-[13.5px] font-semibold"
            />
            <button className="shrink-0 rounded-lg bg-marca px-4 py-2.5 text-[13px] font-bold text-white transition hover:brightness-110 active:scale-[0.97]">
              Quero receber
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
