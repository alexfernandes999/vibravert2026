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
        className="flex w-full items-center gap-3 rounded-caixa border border-linha bg-superficie p-3.5 text-left transition hover:border-marca hover:bg-marca-suave"
      >
        <Image src="/vibrinha.png" alt="" width={38} height={38} className="h-[38px] w-[38px] shrink-0 rounded-full bg-marca-suave" />
        <span className="min-w-0">
          <span className="block text-[13.5px] font-extrabold leading-tight">
            Bater um papo com a Vibrinha
          </span>
          <span className="block text-[12px] text-mudo">
            Pergunte sobre vendas, carrinhos parados, estoque ou funil
          </span>
        </span>
        <span aria-hidden className="ml-auto text-[18px] text-marca">›</span>
      </button>
    );
  }

  return (
    <div className="rounded-caixa border border-marca/25 bg-superficie">
      <div className="flex items-center gap-3 border-b border-linha p-3.5">
        <Image src="/vibrinha.png" alt="" width={36} height={36} className="h-9 w-9 rounded-full bg-marca-suave" />
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
