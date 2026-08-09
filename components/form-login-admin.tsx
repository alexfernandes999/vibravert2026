"use client";

import { useState } from "react";

/**
 * Formulário de acesso ao painel.
 *
 * O olho para revelar a senha não é enfeite: quem opera digita no celular, no
 * galpão, e senha errada com o campo mascarado é a causa mais boba de chamado
 * de suporte.
 *
 * O "esqueci a senha" diz a verdade sobre como este acesso funciona hoje —
 * uma senha só, compartilhada, guardada fora do banco. Um fluxo de
 * recuperação por e-mail exigiria conta por pessoa, e prometer um link que
 * nunca chega é pior do que explicar.
 */
export function FormLoginAdmin({
  acao,
  erro,
}: {
  acao: (dados: FormData) => void;
  erro?: string;
}) {
  const [visivel, setVisivel] = useState(false);
  const [ajuda, setAjuda] = useState(false);

  return (
    <>
      <form action={acao}>
        <label className="mt-4 block">
          <span className="mb-1.5 block text-[12.5px] font-bold">Senha</span>
          <span className="relative block">
            <input
              name="senha"
              type={visivel ? "text" : "password"}
              autoFocus
              autoComplete="current-password"
              className="w-full rounded-lg border border-linha-2 bg-superficie px-3 py-2.5 pr-11 text-[14px] font-semibold"
            />
            <button
              type="button"
              onClick={() => setVisivel((v) => !v)}
              aria-label={visivel ? "Ocultar senha" : "Mostrar senha"}
              aria-pressed={visivel}
              className="absolute right-1 top-1/2 -translate-y-1/2 rounded-md p-2 text-mudo hover:text-marca"
            >
              {visivel ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className="h-5 w-5">
                  <path d="M3 3l18 18" strokeLinecap="round" />
                  <path d="M10.6 10.6a2 2 0 002.8 2.8" />
                  <path d="M9.4 5.4A9.5 9.5 0 0112 5c5 0 9 4.5 9 7 0 .9-.6 2.1-1.6 3.3M6.3 6.7C4 8.2 3 10.2 3 12c0 2.5 4 7 9 7 1.4 0 2.6-.3 3.7-.8" strokeLinecap="round" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className="h-5 w-5">
                  <path d="M3 12s3.6-7 9-7 9 7 9 7-3.6 7-9 7-9-7-9-7z" />
                  <circle cx="12" cy="12" r="2.6" />
                </svg>
              )}
            </button>
          </span>
        </label>

        {erro && (
          <p role="alert" className="mt-2 text-[12.5px] font-semibold text-critico">
            {erro}
          </p>
        )}

        <button className="mt-4 w-full rounded-lg bg-marca py-3 text-sm font-bold text-white">
          Entrar
        </button>
      </form>

      <button
        type="button"
        onClick={() => setAjuda((a) => !a)}
        aria-expanded={ajuda}
        className="mt-4 text-[12.5px] font-semibold text-marca underline underline-offset-2"
      >
        Esqueci a senha
      </button>

      {ajuda && (
        <div className="mt-3 rounded-lg border border-linha bg-superficie-2 p-4 text-[12.8px] leading-relaxed text-tinta-2">
          <p>
            O painel usa <strong className="font-bold">uma senha só</strong>, compartilhada pela
            equipe — ainda não há conta por pessoa, então não há como enviar um link de
            recuperação por e-mail.
          </p>
          <p className="mt-2.5">
            Peça a senha a quem administra a loja. Se ninguém tiver, ela pode ser trocada em{" "}
            <strong className="font-bold">Vercel → Settings → Environment Variables → ADMIN_SENHA</strong>,
            publicando o site em seguida.
          </p>
          <p className="mt-2.5 text-mudo">
            Quando cada pessoa tiver o seu acesso, este passa a ser um “recuperar por e-mail” de
            verdade.
          </p>
        </div>
      )}
    </>
  );
}
