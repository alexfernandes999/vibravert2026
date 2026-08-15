"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { porNaVitrine, tirarDaVitrine } from "@/lib/acoes-vitrine";
import { brl } from "@/lib/formato";

type Item = {
  id: string;
  nome: string;
  sku: string;
  preco: number;
  vazaoMaxima?: number | null;
  imagens: { url: string; alt: string }[];
};

/**
 * Uma prateleira, com as vagas visíveis.
 *
 * A vaga vazia é o convite: um espaço tracejado escrito "escolher" diz o que
 * fazer sem precisar de instrução. O ícone na ponta de uma linha de tabela não
 * dizia nada, e por isso ninguém achava.
 */
export function Prateleira({
  titulo,
  explica,
  campo,
  vagas,
  escolhidos,
  disponiveis,
}: {
  titulo: string;
  explica: string;
  campo: "destaque" | "naVitrine";
  vagas: number;
  escolhidos: Item[];
  disponiveis: Item[];
}) {
  const [abrindo, setAbrindo] = useState(false);
  const [busca, setBusca] = useState("");
  const [indo, iniciar] = useTransition();

  const noAr = escolhidos.slice(0, vagas);
  const sobrando = escolhidos.slice(vagas);
  const livres = vagas - noAr.length;

  const filtrados = disponiveis.filter((p) =>
    `${p.nome} ${p.sku}`.toLowerCase().includes(busca.toLowerCase()),
  );

  return (
    <section className="mt-8">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className="text-[16px] font-extrabold tracking-tight">{titulo}</h2>
        <span className="num rounded-full bg-superficie-2 px-2.5 py-0.5 text-[11.5px] font-bold text-mudo">
          {noAr.length} de {vagas} vagas
        </span>
      </div>
      <p className="mt-1 max-w-2xl text-[12.8px] leading-relaxed text-mudo">{explica}</p>

      <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {noAr.map((p, i) => (
          <li key={p.id} className="group relative overflow-hidden rounded-caixa border border-linha bg-superficie">
            <span className="num absolute left-2 top-2 z-10 grid h-6 w-6 place-items-center rounded-md bg-marca text-[11.5px] font-extrabold text-white">
              {i + 1}
            </span>
            <button
              onClick={() => iniciar(() => void tirarDaVitrine(p.id, campo))}
              disabled={indo}
              title="Tirar da prateleira"
              className="absolute right-2 top-2 z-10 grid h-6 w-6 place-items-center rounded-md bg-superficie/90 text-[15px] font-bold text-mudo shadow-sm transition hover:bg-critico hover:text-white"
            >
              ×
            </button>
            <span className="relative block aspect-square bg-superficie">
              {p.imagens[0] && (
                <Image src={p.imagens[0].url} alt="" fill sizes="200px" className="object-contain p-3" />
              )}
            </span>
            <span className="block border-t border-linha p-2.5">
              <span className="line-clamp-2 text-[12px] font-bold leading-snug">{p.nome}</span>
              <span className="num mt-1 block text-[12px] font-extrabold text-bom">{brl(p.preco)}</span>
            </span>
          </li>
        ))}

        {Array.from({ length: Math.max(0, livres) }).map((_, i) => (
          <li key={`vaga-${i}`}>
            <button
              onClick={() => setAbrindo(true)}
              className="flex h-full min-h-[190px] w-full flex-col items-center justify-center gap-2 rounded-caixa border-2 border-dashed border-linha-2 text-mudo transition hover:border-marca hover:bg-marca-suave hover:text-marca"
            >
              <span className="grid h-9 w-9 place-items-center rounded-full border-2 border-current text-[19px] leading-none">
                +
              </span>
              <span className="text-[12.5px] font-bold">Escolher produto</span>
              <span className="num text-[11px]">vaga {noAr.length + i + 1}</span>
            </button>
          </li>
        ))}
      </ul>

      {sobrando.length > 0 && (
        <div className="mt-3 rounded-caixa border border-atencao/35 bg-atencao/10 p-3.5">
          <p className="text-[12.8px] font-bold text-tinta-2">
            {sobrando.length} marcado(s) além das {vagas} vagas · não aparecem na loja
          </p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {sobrando.map((p) => (
              <li key={p.id}>
                <button
                  onClick={() => iniciar(() => void tirarDaVitrine(p.id, campo))}
                  disabled={indo}
                  className="rounded-lg border border-linha bg-superficie px-2.5 py-1 text-[11.5px] font-semibold text-tinta-2 hover:border-critico hover:text-critico"
                >
                  {p.nome.slice(0, 34)} ×
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {abrindo && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-tinta/45 p-5" onClick={() => setAbrindo(false)}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-caixa border border-linha bg-superficie shadow-2xl"
          >
            <div className="flex items-center gap-3 border-b border-linha p-4">
              <input
                autoFocus
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por nome ou código"
                className="min-w-0 flex-1 rounded-lg border border-linha-2 bg-superficie px-3 py-2 text-[13.5px] font-semibold"
              />
              <button onClick={() => setAbrindo(false)} className="text-[13px] font-bold text-mudo">
                Fechar
              </button>
            </div>

            <ul className="divide-y divide-linha overflow-y-auto">
              {filtrados.map((p) => (
                <li key={p.id}>
                  <button
                    disabled={indo}
                    onClick={() =>
                      iniciar(async () => {
                        await porNaVitrine(p.id, campo);
                        setAbrindo(false);
                        setBusca("");
                      })
                    }
                    className="flex w-full items-center gap-3 p-3 text-left transition hover:bg-marca-suave"
                  >
                    <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-superficie-2">
                      {p.imagens[0] && (
                        <Image src={p.imagens[0].url} alt="" fill sizes="48px" className="object-contain p-1" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-bold">{p.nome}</span>
                      <span className="num block text-[11.5px] text-mudo">
                        {p.sku}
                        {p.vazaoMaxima ? ` · ${p.vazaoMaxima.toLocaleString("pt-BR")} L/h` : ""}
                      </span>
                    </span>
                    <span className="num shrink-0 text-[13px] font-extrabold">{brl(p.preco)}</span>
                  </button>
                </li>
              ))}
              {filtrados.length === 0 && (
                <li className="p-6 text-center text-[13px] text-mudo">Nada encontrado.</li>
              )}
            </ul>
          </div>
        </div>
      )}
    </section>
  );
}
