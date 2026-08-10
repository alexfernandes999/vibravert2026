"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { revelarQr, testarCodigo, type Cadastro } from "@/lib/acoes-2fa";

/**
 * Cadastro do aplicativo autenticador, guiado.
 *
 * Segundo fator é onde as pessoas desistem: a tela normal mostra um QR e um
 * segredo sem explicar o que é nem para que serve, e quem nunca usou fecha a
 * página. Aqui a Vibrinha conduz — um passo por vez, e o código é testado
 * antes de virar obrigatório, para ninguém descobrir que não funciona só na
 * hora em que precisa entrar.
 */
const APLICATIVOS = [
  { nome: "Google Authenticator", nota: "o mais comum" },
  { nome: "Microsoft Authenticator", nota: null },
  { nome: "Authy", nota: "guarda cópia na nuvem" },
  { nome: "1Password · Bitwarden", nota: "se já usa um" },
];

export function Cadastro2FA() {
  const [aberto, setAberto] = useState(false);
  const [dados, setDados] = useState<Cadastro | null>(null);
  const [senha, setSenha] = useState("");
  const [codigo, setCodigo] = useState("");
  const [prova, setProva] = useState<{ ok: boolean; erro?: string } | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [carregando, iniciar] = useTransition();

  const pedirQr = () => iniciar(async () => setDados(await revelarQr(senha)));
  const provar = () =>
    iniciar(async () => setProva(await testarCodigo(codigo)));

  const copiar = () => {
    if (!dados?.ok) return;
    navigator.clipboard?.writeText(dados.segredo.replace(/\s/g, ""));
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2200);
  };

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="mt-3 flex w-full items-center gap-2.5 rounded-lg border border-linha bg-superficie-2 px-3.5 py-2.5 text-left transition-colors hover:border-marca/40"
      >
        <Image src="/vibrinha.png" alt="" width={30} height={30} className="shrink-0 rounded-full" />
        <span className="text-[12.5px] font-semibold leading-tight text-tinta-2">
          Primeira vez? <span className="text-marca underline underline-offset-2">Eu te ajudo a
          ligar o autenticador</span>
        </span>
      </button>
    );
  }

  return (
    <div className="mt-3 rounded-caixa border border-marca/25 bg-superficie-2 p-4">
      <div className="flex items-start gap-2.5">
        <Image src="/vibrinha.png" alt="" width={34} height={34} className="mt-px shrink-0 rounded-full" />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-extrabold text-marca">Vibrinha</p>
          <p className="mt-0.5 text-[12.8px] leading-relaxed text-tinta-2">
            {!dados?.ok
              ? "Vamos ligar o código de 6 dígitos no seu celular. Leva um minuto e é só uma vez. Primeiro me confirma a senha do painel, só para eu saber que é você."
              : !prova?.ok
                ? "Pronto. Abre o aplicativo autenticador no celular, aponta a câmera para o quadrado e depois digita aqui o código que aparecer, para a gente conferir."
                : "É isso. A partir de agora o aplicativo mostra um código novo a cada 30 segundos, e é ele que você digita junto com a senha."}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setAberto(false)}
          aria-label="Fechar"
          className="shrink-0 rounded-md p-1 text-mudo hover:text-tinta"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* ── passo 1: a senha libera o QR ───────────────────────────── */}
      {!dados?.ok && (
        <div className="mt-3.5">
          <div className="flex gap-2">
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), pedirQr())}
              placeholder="Senha do painel"
              autoComplete="current-password"
              className="min-w-0 flex-1 rounded-lg border border-linha-2 bg-superficie px-3 py-2.5 text-[13.5px] font-semibold"
            />
            <button
              type="button"
              onClick={pedirQr}
              disabled={carregando || senha.length < 3}
              className="shrink-0 rounded-lg bg-marca px-4 py-2.5 text-[13px] font-bold text-white transition-all active:scale-[0.97] disabled:opacity-50"
            >
              {carregando ? "…" : "Ver o QR"}
            </button>
          </div>
          {dados && !dados.ok && (
            <p role="alert" className="mt-2 text-[12.3px] font-semibold text-critico">
              {dados.erro}
            </p>
          )}

          <p className="mt-3 text-[11.5px] font-bold uppercase tracking-wide text-mudo">
            Serve com qualquer um destes
          </p>
          <ul className="mt-1.5 grid gap-1">
            {APLICATIVOS.map((a) => (
              <li key={a.nome} className="flex items-baseline gap-1.5 text-[12.3px] text-tinta-2">
                <span className="text-marca">·</span>
                <span className="font-semibold">{a.nome}</span>
                {a.nota && <span className="text-mudo">{a.nota}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── passo 2: o QR e o segredo escrito ──────────────────────── */}
      {dados?.ok && (
        <div className="mt-3.5">
          <div className="flex flex-col items-center gap-3 rounded-lg border border-linha bg-superficie p-4 sm:flex-row sm:items-start">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={dados.qr}
              alt="QR do autenticador"
              width={150}
              height={150}
              className="h-[150px] w-[150px] shrink-0 rounded-md"
            />
            <div className="min-w-0 flex-1 text-center sm:text-left">
              <p className="text-[11.5px] font-bold uppercase tracking-wide text-mudo">
                Se a câmera não pegar, digite
              </p>
              <button
                type="button"
                onClick={copiar}
                className="num mt-1.5 w-full break-all rounded-md border border-linha-2 bg-superficie-2 px-2.5 py-2 text-left text-[12.5px] font-extrabold tracking-wide text-tinta transition-colors hover:border-marca/50"
              >
                {dados.segredo}
              </button>
              <p className="mt-1.5 text-[11.8px] font-semibold text-mudo">
                {copiado ? "Copiado" : "Toque para copiar · tipo “baseado em tempo”"}
              </p>
            </div>
          </div>

          {/* ── passo 3: provar que funciona antes de precisar ──────── */}
          {!prova?.ok ? (
            <div className="mt-3">
              <div className="flex gap-2">
                <input
                  inputMode="numeric"
                  maxLength={6}
                  value={codigo}
                  onChange={(e) => (setCodigo(e.target.value.replace(/\D/g, "")), setProva(null))}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), provar())}
                  placeholder="000000"
                  className="num min-w-0 flex-1 rounded-lg border border-linha-2 bg-superficie px-3 py-2.5 text-center text-[18px] font-extrabold tracking-[0.3em]"
                />
                <button
                  type="button"
                  onClick={provar}
                  disabled={carregando || codigo.length !== 6}
                  className="shrink-0 rounded-lg bg-marca px-4 py-2.5 text-[13px] font-bold text-white transition-all active:scale-[0.97] disabled:opacity-50"
                >
                  {carregando ? "…" : "Conferir"}
                </button>
              </div>
              {prova?.erro && (
                <p role="alert" className="mt-2 text-[12.3px] font-semibold text-critico">
                  {prova.erro}
                </p>
              )}
            </div>
          ) : (
            <div className="mt-3 flex items-center gap-2 rounded-lg border border-bom/30 bg-bom/10 px-3.5 py-3">
              <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-bom" fill="none" stroke="currentColor" strokeWidth="2.6">
                <path d="M4 12.5l5 5L20 6.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <p className="text-[12.8px] font-bold text-bom">
                Autenticador ligado. Já pode entrar com a senha e o código.
              </p>
            </div>
          )}

          <p className="mt-3 rounded-lg bg-superficie px-3 py-2.5 text-[11.8px] leading-relaxed text-mudo">
            Guarde este QR fora do celular, num lugar seguro. Se o aparelho sumir e não houver
            cópia, ninguém entra no painel sem trocar a variável no Vercel.
          </p>
        </div>
      )}
    </div>
  );
}
