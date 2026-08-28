"use client";

import { whatsappLink } from "@/lib/contato";
import { guardarConversa } from "@/lib/acoes-vibrinha";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ROTEIRO, INICIO, type Opcao } from "@/lib/roteiro-vibrinha";

/**
 * Vibrinha, a atendente da loja.
 *
 * Não é inteligência artificial e não finge ser: é um roteiro de perguntas
 * frequentes com respostas escritas, sem custo por mensagem e sem inventar
 * dado técnico. Numa loja de bomba, uma resposta errada sobre vazão ou
 * garantia volta como devolução, então nada aqui é gerado na hora.
 *
 * O papel dela é resolver o que é simples e passar o resto para o WhatsApp com
 * o assunto já escrito, para o vendedor não recomeçar a conversa do zero.
 *
 * O nome vem do modelo Vibrinha, que tem mascote próprio na embalagem: é da
 * casa, e não um robô genérico com nome de startup.
 */

type Msg = { de: "ela" | "eu"; texto: string; acao?: { rotulo: string; href: string } };

const OI = "Oi! Eu sou a Vibrinha, da Vibra Vert. Antes de mais nada, como posso te chamar?";

export function Vibrinha() {
  const [aberto, setAberto] = useState(false);
  const [nome, setNome] = useState("");
  const [rascunho, setRascunho] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([{ de: "ela", texto: OI }]);
  const [digitando, setDigitando] = useState(false);
  const [opcoes, setOpcoes] = useState<Opcao[]>([]);
  const [encaminhar, setEncaminhar] = useState(false);
  // O que já foi apurado vai junto para o WhatsApp: o vendedor não recomeça
  // do zero, e ninguém repete a mesma história duas vezes.
  const [apurado, setApurado] = useState<string[]>([]);
  const fim = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fim.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [msgs, digitando, aberto]);

  /** Pequeno atraso antes de responder: resposta instantânea denuncia robô. */
  function responder(itens: Msg[], seguintes?: Opcao[], encaminha = false) {
    setDigitando(true);
    setOpcoes([]);
    setTimeout(() => {
      setDigitando(false);
      setMsgs((m) => [...m, ...itens]);
      setOpcoes(seguintes ?? []);
      setEncaminhar(encaminha);
    }, 700);
  }

  /** Caminha um passo no roteiro. */
  function ir(chave: string, rotulo?: string) {
    const no = ROTEIRO[chave];
    if (!no) return;
    if (rotulo) {
      setMsgs((m) => [...m, { de: "eu", texto: rotulo }]);
      setApurado((a) => [...a, rotulo]);
    }
    responder(
      no.fala.map((texto, i) => ({
        de: "ela" as const,
        texto,
        acao: i === no.fala.length - 1 ? no.acao : undefined,
      })),
      no.opcoes,
      Boolean(no.encaminha),
    );
  }

  function enviarNome(valor: string) {
    const n = valor.trim();
    if (!n) return;
    setNome(n);
    setRascunho("");
    setMsgs((m) => [...m, { de: "eu", texto: n }]);
    setDigitando(true);
    setTimeout(() => {
      setDigitando(false);
      setMsgs((m) => [
        ...m,
        {
          de: "ela",
          texto: `Prazer, ${n.split(" ")[0]}! Trabalho aqui na Vibra Vert há um tempo. Antes de te dar qualquer palpite eu prefiro entender o caso direito, então vou fazer algumas perguntas.`,
        },
        ...ROTEIRO[INICIO].fala.map((texto) => ({ de: "ela" as const, texto })),
      ]);
      setOpcoes(ROTEIRO[INICIO].opcoes ?? []);
    }, 700);
  }



  // O que a Vibrinha já apurou vai junto na mensagem: quem atende do outro
  // lado não precisa refazer as mesmas três perguntas, e quem escreve não
  // precisa contar a história de novo.
  /**
   * A conversa inteira, do jeito que o vendedor precisa ler.
   *
   * Antes ia só uma linha com as opções clicadas. O vendedor abria o WhatsApp
   * sabendo que a pessoa "informou três coisas" e tinha de perguntar tudo de
   * novo · que é exatamente o que a Vibrinha existe para evitar.
   *
   * As falas dela vão encurtadas: o vendedor precisa do fio da conversa, não
   * do texto completo de um roteiro que ele já conhece. O que a pessoa disse
   * vai inteiro, porque é ali que está a informação nova.
   */
  const dialogo = msgs
    .slice(1) // a saudação não informa nada
    .map((m) =>
      m.de === "eu"
        ? `— ${m.texto}`
        : `Vibrinha: ${m.texto.length > 130 ? `${m.texto.slice(0, 130)}…` : m.texto}`,
    )
    .join("\n");

  const contexto = [
    nome ? `Olá! Meu nome é ${nome}.` : "Olá!",
    "Vim pelo site e conversei com a Vibrinha.",
    apurado.length ? `\n\nO que já respondi:\n${apurado.map((a) => `· ${a}`).join("\n")}` : "",
    dialogo ? `\n\n— — — conversa — — —\n${dialogo.slice(0, 1400)}` : "",
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  /**
   * Guarda antes de sair.
   *
   * O clique abre o WhatsApp e a página fica para trás · se o registro
   * dependesse do que acontece depois, se perderia sempre.
   */
  function aoPassarParaVendedor(de: string) {
    void guardarConversa({
      nome: nome || undefined,
      dialogo,
      apurado: apurado.join(" · ") || undefined,
      origem: de,
    });
  }

  return (
    <>
      {aberto && (
        <div className="fixed bottom-24 right-5 z-50 flex h-[min(560px,72vh)] w-[min(370px,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-2xl border border-linha bg-superficie shadow-2xl shadow-black/25">
          <header className="flex items-center gap-3 bg-marca-escuro px-4 py-3 text-white">
            <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full bg-ouro">
              <Image src="/vibrinha.png" alt="" width={44} height={44} className="h-11 w-11 object-contain" />
            </span>
            <span className="leading-tight">
              <span className="block text-[14px] font-extrabold">Vibrinha</span>
              <span className="block text-[11px] text-white/60">atendimento da Vibra Vert</span>
            </span>
            {/* A saída para gente de verdade fica sempre à vista, e não só no
                fim de um caminho. Quem já decidiu que quer falar com alguém
                não deveria ter de responder três perguntas antes · e saber que
                a porta está aberta é o que faz a pessoa aceitar conversar com
                a Vibrinha primeiro. */}
            <a
              href={whatsappLink(contexto)}
              target="_blank"
              rel="noopener"
              onClick={() => aoPassarParaVendedor("cabeçalho")}
              title="Falar agora com um vendedor no WhatsApp"
              className="ml-auto flex items-center gap-1.5 rounded-lg bg-[#25D366] px-2.5 py-1.5 text-[11.5px] font-extrabold text-white transition hover:brightness-110"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
                <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.46 1.32 4.96L2 22l5.25-1.38a9.87 9.87 0 004.79 1.22C17.5 21.84 21.96 17.38 21.96 11.9 21.96 6.45 17.5 2 12.04 2z" />
              </svg>
              Falar com uma pessoa
            </a>
            <button
              onClick={() => setAberto(false)}
              aria-label="Fechar conversa"
              className="rounded-lg p-1.5 text-white/70 hover:bg-white/10 hover:text-white"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
                <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
              </svg>
            </button>
          </header>

          <div className="flex-1 space-y-2.5 overflow-y-auto bg-superficie-2 p-3.5">
            {msgs.map((m, i) => (
              <div key={i} className={m.de === "eu" ? "flex justify-end" : ""}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13.2px] leading-relaxed ${
                    m.de === "eu"
                      ? "rounded-br-sm bg-marca text-white"
                      : "rounded-bl-sm bg-superficie text-tinta shadow-sm"
                  }`}
                >
                  {m.texto}
                  {m.acao && (
                    <Link
                      href={m.acao.href}
                      onClick={() => setAberto(false)}
                      className="mt-2 block rounded-lg bg-marca px-3 py-2 text-center text-[12.5px] font-bold text-white"
                    >
                      {m.acao.rotulo}
                    </Link>
                  )}
                </div>
              </div>
            ))}

            {digitando && (
              <div className="flex gap-1 rounded-2xl rounded-bl-sm bg-superficie px-3.5 py-3 shadow-sm" style={{ width: "fit-content" }}>
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="h-1.5 w-1.5 animate-bounce rounded-full bg-mudo"
                    style={{ animationDelay: `${i * 0.12}s` }}
                  />
                ))}
              </div>
            )}
            <div ref={fim} />
          </div>

          <div className="border-t border-linha bg-superficie p-3">
            {!nome ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  enviarNome(rascunho);
                }}
                className="flex gap-2"
              >
                <input
                  value={rascunho}
                  onChange={(e) => setRascunho(e.target.value)}
                  placeholder="Seu nome"
                  autoFocus
                  className="flex-1 rounded-lg border border-linha-2 px-3 py-2 text-[13.5px] font-semibold"
                />
                <button className="rounded-lg bg-marca px-4 py-2 text-[13px] font-bold text-white">
                  Enviar
                </button>
              </form>
            ) : (
              <>
                {opcoes.length > 0 && (
                  <div className="flex flex-col gap-1.5">
                    {opcoes.map((o) => (
                      <button
                        key={o.proximo + o.rotulo}
                        onClick={() => ir(o.proximo, o.rotulo)}
                        className="rounded-lg border border-linha-2 px-3 py-2 text-left text-[12.5px] font-semibold text-tinta-2 transition hover:border-marca hover:bg-marca-suave hover:text-marca"
                      >
                        {o.rotulo}
                      </button>
                    ))}
                  </div>
                )}

                {!encaminhar && (
                  <p className="mt-3 border-t border-linha pt-2.5 text-center text-[11.5px] leading-snug text-mudo">
                    Prefere falar com uma pessoa?{" "}
                    <a
                      href={whatsappLink(contexto)}
                      target="_blank"
                      rel="noopener"
                      onClick={() => aoPassarParaVendedor("rodapé da resposta")}
                      className="font-bold text-[#128C4A] underline underline-offset-2"
                    >
                      Chame no WhatsApp
                    </a>{" "}
                    · de segunda a sexta-feira, das 08h30 às 17h00.
                  </p>
                )}

                {encaminhar && (
                  <a
                    href={whatsappLink(contexto)}
                    target="_blank"
                    rel="noopener"
                    onClick={() => aoPassarParaVendedor("fim do roteiro")}
                    className="mt-2.5 flex items-center justify-center gap-2 rounded-lg bg-[#25D366] py-2.5 text-[13px] font-extrabold text-white"
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.46 1.32 4.96L2 22l5.25-1.38a9.87 9.87 0 004.79 1.22C17.5 21.84 21.96 17.38 21.96 11.9 21.96 6.45 17.5 2 12.04 2z" />
                    </svg>
                    Falar com um técnico no WhatsApp
                  </a>
                )}
              </>
            )}
          </div>
        </div>
      )}

      <button
        onClick={() => setAberto((a) => !a)}
        aria-expanded={aberto}
        className="group fixed bottom-5 right-5 z-50 flex items-center gap-3 rounded-full bg-[#25D366] py-2.5 pl-2.5 pr-3 shadow-xl shadow-black/25 transition hover:brightness-105 sm:pr-5"
      >
        {/* A mascote no lugar do ícone genérico: é da casa, está na embalagem
            que o cliente já viu na prateleira, e dá rosto ao atendimento. */}
        <span className={`grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full bg-white/20 ${aberto ? "" : "pulso"}`}>
          <Image src="/vibrinha.png" alt="" width={44} height={44} className="h-10 w-10 object-contain" priority />
        </span>
        <span className="hidden leading-tight text-white sm:block">
          <span className="block text-[13.5px] font-extrabold">Falar com um vendedor agora</span>
          <span className="block text-[11px] font-semibold text-white/80">
            a Vibrinha responde na hora
          </span>
        </span>
      </button>
    </>
  );
}
