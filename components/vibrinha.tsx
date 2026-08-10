"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";

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

type Resposta = { texto: string[]; acao?: { rotulo: string; href: string } };

const PERGUNTAS: { p: string; r: Resposta }[] = [
  {
    p: "Qual bomba serve no meu poço?",
    r: {
      texto: [
        "A primeira coisa é o diâmetro do poço: bomba que não cabe não desce, por mais vazão que tenha.",
        "Poço de 6 polegadas pede a linha Rymer. De 8 polegadas ou mais, a Vibra Vert 900 ou a Vibrinha.",
        "Se você souber a altura até a caixa d'água e o comprimento da tubulação, a calculadora mostra quanto cada bomba entrega na sua instalação, não só a vazão máxima do catálogo.",
      ],
      acao: { rotulo: "Abrir a calculadora", href: "/qual-bomba" },
    },
  },
  {
    p: "Minha bomba não puxa água",
    r: {
      texto: [
        "Na maioria das vezes não queimou. As causas mais comuns são o diafragma gasto ou entupimento na entrada.",
        "Se ela liga e vibra mas nada sobe, costuma ser peça de desgaste. Se só faz barulho, também.",
        "Quem conserta somos nós, na própria fábrica, sem posto terceirizado.",
      ],
      acao: { rotulo: "Ver a assistência técnica", href: "/assistencia" },
    },
  },
  {
    p: "Qual é a garantia?",
    r: {
      texto: [
        "É garantia de fábrica contra defeito de fabricação, e o prazo aparece na ficha técnica de cada modelo.",
        "O que ela não cobre é mau uso, principalmente deixar a bomba trabalhar sem água. É o que mais queima motor, e é justamente o que a boia de nível evita.",
        "Guarde a nota fiscal e o certificado que vem na caixa: são eles que valem na hora de acionar.",
      ],
      acao: { rotulo: "Ver as bombas com boia", href: "/bombas?acompanha=boia" },
    },
  },
  {
    p: "Quanto custa o frete?",
    r: {
      texto: [
        "O frete é calculado pelo seu CEP e aparece no carrinho antes de finalizar a compra.",
        "Entregamos nos 27 estados. Acima de R$ 399 o frete sai de graça.",
      ],
      acao: { rotulo: "Ver a linha completa", href: "/bombas" },
    },
  },
  {
    p: "Como posso pagar?",
    r: {
      texto: [
        "PIX com 5% de desconto e aprovação na hora, cartão de crédito parcelado sem juros, ou boleto.",
        "O PIX é o mais rápido: assim que o pagamento cai, o pedido entra em separação.",
      ],
    },
  },
  {
    p: "Qual a diferença entre a Rymer 2000 e a 2500?",
    r: {
      texto: [
        "A hidráulica das duas é igual: mesma vazão, mesma potência, mesma altura.",
        "A diferença é física. A 2500 tem saia de proteção lateral, uma peça de borracha que envolve o corpo e permite trabalhar dentro de um poço de 6 polegadas sem bater nas paredes.",
        "Se o seu poço é justo, vale a 2500. Se é folgado, a 2000 resolve.",
      ],
      acao: { rotulo: "Comparar as duas", href: "/bombas?poco=6" },
    },
  },
  {
    p: "Vocês entregam na minha cidade?",
    r: {
      texto: [
        "Entregamos nos 27 estados do Brasil.",
        "O prazo depende da região e aparece no carrinho assim que você informa o CEP.",
      ],
    },
  },
];

type Msg = { de: "ela" | "eu"; texto: string; acao?: Resposta["acao"] };

const OI = "Oi! Eu sou a Vibrinha, da Vibra Vert. Como posso te chamar?";

export function Vibrinha() {
  const [aberto, setAberto] = useState(false);
  const [nome, setNome] = useState("");
  const [rascunho, setRascunho] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([{ de: "ela", texto: OI }]);
  const [digitando, setDigitando] = useState(false);
  const fim = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fim.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [msgs, digitando, aberto]);

  /** Pequeno atraso antes de responder: resposta instantânea denuncia robô. */
  function responder(itens: Msg[]) {
    setDigitando(true);
    setTimeout(() => {
      setDigitando(false);
      setMsgs((m) => [...m, ...itens]);
    }, 650);
  }

  function enviarNome(valor: string) {
    const n = valor.trim();
    if (!n) return;
    setNome(n);
    setRascunho("");
    setMsgs((m) => [...m, { de: "eu", texto: n }]);
    responder([
      {
        de: "ela",
        texto: `Prazer, ${n.split(" ")[0]}! Sou eu que atendo aqui. Me diz o que você precisa e eu resolvo, ou te passo para um vendedor no WhatsApp.`,
      },
    ]);
  }

  function perguntar(p: string, r: Resposta) {
    setMsgs((m) => [...m, { de: "eu", texto: p }]);
    responder(r.texto.map((t, i) => ({ de: "ela" as const, texto: t, acao: i === r.texto.length - 1 ? r.acao : undefined })));
  }

  const contexto = encodeURIComponent(
    nome
      ? `Olá! Meu nome é ${nome}. Vim pelo site e preciso falar com um vendedor.`
      : "Olá! Vim pelo site e preciso falar com um vendedor.",
  );
  const numero = (process.env.NEXT_PUBLIC_WHATSAPP || "1140002440").replace(/\D/g, "");

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
            <button
              onClick={() => setAberto(false)}
              aria-label="Fechar conversa"
              className="ml-auto rounded-lg p-1.5 text-white/70 hover:bg-white/10 hover:text-white"
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
                <p className="mb-2 text-[10.5px] font-bold uppercase tracking-[0.1em] text-mudo">
                  Perguntas frequentes
                </p>
                <div className="flex max-h-28 flex-wrap gap-1.5 overflow-y-auto">
                  {PERGUNTAS.map((q) => (
                    <button
                      key={q.p}
                      onClick={() => perguntar(q.p, q.r)}
                      className="rounded-full border border-linha-2 px-2.5 py-1.5 text-left text-[11.5px] font-semibold text-tinta-2 hover:border-marca hover:text-marca"
                    >
                      {q.p}
                    </button>
                  ))}
                </div>
                <a
                  href={`https://wa.me/55${numero}?text=${contexto}`}
                  target="_blank"
                  rel="noopener"
                  className="mt-2.5 flex items-center justify-center gap-2 rounded-lg bg-[#25D366] py-2.5 text-[13px] font-extrabold text-white"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                    <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.46 1.32 4.96L2 22l5.25-1.38a9.87 9.87 0 004.79 1.22C17.5 21.84 21.96 17.38 21.96 11.9 21.96 6.45 17.5 2 12.04 2z" />
                  </svg>
                  Falar com um vendedor no WhatsApp
                </a>
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
