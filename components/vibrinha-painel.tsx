"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { perguntar, type Resposta } from "@/lib/vibrinha-painel";

/**
 * Bater um papo com a Vibrinha sobre a loja.
 *
 * O painel mostra tudo, mas mostrar não é o mesmo que responder. Quem abre com
 * uma pergunta na cabeça · "quanto vendi essa semana?" · não quer procurar o
 * número em quatro blocos: quer perguntar.
 *
 * Os atalhos existem porque campo de texto vazio é uma pergunta em si: ninguém
 * sabe o que pode perguntar. Com três exemplos à mão, a pessoa entende o
 * alcance em dois segundos.
 */
const ATALHOS = [
  "Como foram as vendas hoje?",
  "Quantos carrinhos abandonados?",
  "Como está o funil?",
  "O que está pendente?",
];

type Fala = { de: "eu" | "ela"; texto: string; r?: Resposta };

export function VibrinhaPainel({ nome }: { nome: string }) {
  const [aberto, setAberto] = useState(false);
  const [q, setQ] = useState("");
  const [falas, setFalas] = useState<Fala[]>([]);
  const [indo, iniciar] = useTransition();
  const fim = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fim.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [falas, indo]);

  const mandar = (texto: string) => {
    if (!texto.trim() || indo) return;
    setFalas((f) => [...f, { de: "eu", texto }]);
    setQ("");
    iniciar(async () => {
      const r = await perguntar(texto);
      setFalas((f) => [...f, { de: "ela", texto: r.texto, r }]);
    });
  };

  if (!aberto) {
    return (
      <button
        onClick={() => setAberto(true)}
        className="group flex w-full items-center gap-4 rounded-caixa border border-marca/25 bg-marca-suave p-4 text-left shadow-sm transition hover:border-marca hover:shadow-md"
      >
        {/* A Vibrinha com o balão e o ponto verde: o painel inteiro é número e
            tabela, e sem um sinal de "tem alguém aqui" ninguém descobre que dá
            para perguntar. O verde é a convenção de disponível · não precisa
            de legenda. */}
        <span className="relative shrink-0">
          <Image
            src="/vibrinha.png"
            alt=""
            width={48}
            height={48}
            className="h-12 w-12 rounded-full bg-superficie ring-2 ring-marca/25"
          />
          <span className="absolute -bottom-1 -right-1 grid h-6 w-6 place-items-center rounded-full bg-marca text-white shadow ring-2 ring-marca-suave">
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
              <path d="M12 3C7 3 3 6.3 3 10.4c0 2.3 1.3 4.4 3.3 5.8l-.7 3.3a.6.6 0 00.9.6l3.6-2a11 11 0 001.9.2c5 0 9-3.3 9-7.4S17 3 12 3z" />
            </svg>
          </span>
          <span className="absolute -right-0.5 -top-0.5 flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-bom opacity-70" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-bom ring-2 ring-marca-suave" />
          </span>
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="text-[14.5px] font-extrabold leading-tight">
              Bater um papo com a Vibrinha
            </span>
            <span className="rounded-full bg-bom/15 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-bom">
              online
            </span>
          </span>
          <span className="mt-0.5 block text-[12.5px] text-tinta-2">
            Pergunte sobre vendas, carrinhos parados, estoque ou funil · ela busca no sistema
          </span>
        </span>

        <span
          aria-hidden
          className="ml-auto grid h-8 w-8 shrink-0 place-items-center rounded-full bg-marca text-white transition group-hover:translate-x-0.5"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" className="h-4 w-4">
            <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </button>
    );
  }

  return (
    <div className="rounded-caixa border border-marca/25 bg-superficie">
      <div className="flex items-center gap-3 border-b border-linha p-3.5">
        <span className="relative shrink-0">
          <Image src="/vibrinha.png" alt="" width={38} height={38} className="h-[38px] w-[38px] rounded-full bg-marca-suave" />
          <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-bom ring-2 ring-superficie" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13.5px] font-extrabold leading-tight">Vibrinha</p>
          <p className="text-[11.5px] text-mudo">respondo com o número que está no sistema</p>
        </div>
        <button onClick={() => setAberto(false)} aria-label="Fechar" className="rounded-md p-1 text-mudo hover:text-tinta">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div className="max-h-[330px] overflow-y-auto p-3.5">
        {falas.length === 0 && (
          <p className="text-[13px] leading-relaxed text-tinta-2">
            Oi, {nome.split(" ")[0]}! Me pergunta o que quiser saber da loja. Eu olho no sistema e
            respondo com o número de verdade · nada de chute.
          </p>
        )}

        <ul className="space-y-3">
          {falas.map((f, i) => (
            <li key={i} className={f.de === "eu" ? "text-right" : ""}>
              <span
                className={`inline-block max-w-[85%] whitespace-pre-line rounded-2xl px-3.5 py-2 text-left text-[13px] leading-relaxed ${
                  f.de === "eu"
                    ? "rounded-br-md bg-marca text-white"
                    : "rounded-bl-md bg-superficie-2 text-tinta-2"
                }`}
              >
                {f.texto}
              </span>

              {f.r?.numeros && (
                <dl className="mt-2 inline-grid gap-1.5 rounded-caixa border border-linha bg-superficie-2 p-3 text-left">
                  {f.r.numeros.map((n) => (
                    <div key={n.r} className="flex items-baseline gap-4">
                      <dt className="text-[12px] text-mudo">{n.r}</dt>
                      <dd className="num ml-auto text-[13.5px] font-extrabold">{n.v}</dd>
                    </div>
                  ))}
                </dl>
              )}

              {f.r?.ir && (
                <Link
                  href={f.r.ir.href}
                  className="mt-2 block text-[12.5px] font-bold text-marca underline underline-offset-2"
                >
                  {f.r.ir.r} →
                </Link>
              )}
            </li>
          ))}
          {indo && (
            <li>
              <span className="inline-block rounded-2xl rounded-bl-md bg-superficie-2 px-3.5 py-2 text-[13px] text-mudo">
                olhando aqui…
              </span>
            </li>
          )}
        </ul>
        <div ref={fim} />
      </div>

      <div className="border-t border-linha p-3">
        <ul className="mb-2.5 flex flex-wrap gap-1.5">
          {ATALHOS.map((a) => (
            <li key={a}>
              <button
                onClick={() => mandar(a)}
                disabled={indo}
                className="rounded-full border border-linha bg-superficie-2 px-2.5 py-1 text-[11.5px] font-semibold text-tinta-2 transition hover:border-marca hover:text-marca disabled:opacity-50"
              >
                {a}
              </button>
            </li>
          ))}
        </ul>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            mandar(q);
          }}
          className="flex gap-2"
        >
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Quanto vendi essa semana?"
            className="min-w-0 flex-1 rounded-lg border border-linha-2 bg-superficie px-3 py-2 text-[13px] font-semibold"
          />
          <button
            disabled={indo || !q.trim()}
            className="shrink-0 rounded-lg bg-marca px-3.5 py-2 text-[12.5px] font-bold text-white disabled:opacity-50"
          >
            Perguntar
          </button>
        </form>
      </div>
    </div>
  );
}
