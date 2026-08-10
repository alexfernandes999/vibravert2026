"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";

/**
 * Escolher a senha nova.
 *
 * A força é medida e mostrada enquanto se digita, porque uma regra recusada
 * depois de enviar o formulário faz a pessoa escolher a senha mais curta que
 * passe. O medidor conta o que realmente importa — comprimento e variedade —
 * e não obriga a colocar um caractere estranho no fim para satisfazer a regra.
 */
const MINIMO = 10;

function forcaDe(s: string) {
  if (!s) return { nivel: 0, texto: "" };
  let pontos = 0;
  if (s.length >= MINIMO) pontos++;
  if (s.length >= 16) pontos++;
  if (/[a-z]/.test(s) && /[A-Z0-9]/.test(s)) pontos++;
  if (/[^a-zA-Z0-9]/.test(s) || /\s/.test(s)) pontos++;
  if (s.length < MINIMO) return { nivel: 1, texto: `faltam ${MINIMO - s.length} caracteres` };
  return { nivel: Math.max(2, pontos), texto: ["", "fraca", "razoável", "boa", "forte"][Math.max(2, pontos)] };
}

export function FormNovaSenha({
  acao,
  erro,
  pedeCodigo,
}: {
  acao: (dados: FormData) => void;
  erro?: string;
  pedeCodigo: boolean;
}) {
  const [senha, setSenha] = useState("");
  const [repetida, setRepetida] = useState("");
  const [visivel, setVisivel] = useState(false);

  const forca = forcaDe(senha);
  const diferem = repetida.length > 0 && repetida !== senha;
  const cores = ["", "bg-critico", "bg-atencao", "bg-marca", "bg-bom"];

  return (
    <form action={acao}>
      <label className="mt-4 block">
        <span className="mb-1.5 block text-[12.5px] font-bold">Nova senha</span>
        <input
          name="senha"
          type={visivel ? "text" : "password"}
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          autoFocus
          autoComplete="new-password"
          className="w-full rounded-lg border border-linha-2 bg-superficie px-3 py-2.5 text-[14px] font-semibold"
        />
      </label>

      {senha && (
        <div className="mt-1.5 flex items-center gap-2">
          <span className="flex h-1 flex-1 gap-0.5 overflow-hidden rounded-full">
            {[1, 2, 3, 4].map((n) => (
              <span
                key={n}
                className={`h-full flex-1 rounded-full ${n <= forca.nivel ? cores[forca.nivel] : "bg-linha-2"}`}
              />
            ))}
          </span>
          <span className="text-[11.5px] font-bold text-mudo">{forca.texto}</span>
        </div>
      )}

      <label className="mt-3.5 block">
        <span className="mb-1.5 block text-[12.5px] font-bold">Repita a senha</span>
        <input
          name="repetida"
          type={visivel ? "text" : "password"}
          value={repetida}
          onChange={(e) => setRepetida(e.target.value)}
          autoComplete="new-password"
          className={`w-full rounded-lg border bg-superficie px-3 py-2.5 text-[14px] font-semibold ${
            diferem ? "border-critico" : "border-linha-2"
          }`}
        />
      </label>
      {diferem && <p className="mt-1.5 text-[12px] font-semibold text-critico">As duas não são iguais.</p>}

      <label className="mt-2.5 flex cursor-pointer items-center gap-2.5 text-[12.5px] font-semibold text-tinta-2">
        <input
          type="checkbox"
          checked={visivel}
          onChange={() => setVisivel((v) => !v)}
          className="h-4 w-4 accent-marca"
        />
        Mostrar o que estou digitando
      </label>

      {/* O segundo fator vale também aqui: quem tomou a caixa de e-mail ainda
          não tem o celular, e é esse o caso que o autenticador cobre. */}
      {pedeCodigo && (
        <label className="mt-4 block">
          <span className="mb-1.5 block text-[12.5px] font-bold">
            Código do aplicativo
            <span className="ml-1.5 font-medium text-mudo">(6 dígitos)</span>
          </span>
          <input
            name="codigo"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="000000"
            className="num w-full rounded-lg border border-linha-2 bg-superficie px-3 py-2.5 text-center text-[20px] font-extrabold tracking-[0.35em]"
          />
        </label>
      )}

      {erro && (
        <p role="alert" className="mt-3 text-[12.5px] font-semibold text-critico">
          {erro}
        </p>
      )}

      <Botao travado={senha.length < MINIMO || diferem || !repetida} />
    </form>
  );
}

function Botao({ travado }: { travado: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      disabled={pending || travado}
      className="mt-4 w-full rounded-lg bg-marca py-3 text-sm font-bold text-white shadow-lg shadow-marca/25 transition-all duration-100 hover:brightness-110 active:scale-[0.98] disabled:opacity-50 disabled:shadow-none"
    >
      {pending ? "Trocando…" : "Trocar a senha"}
    </button>
  );
}
