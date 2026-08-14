"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { brl, precoPix, parcela, PARCELAS_MAX, ALTURAS_MCA, vazaoNaAltura, litros } from "@/lib/formato";

export type ModeloCalc = {
  slug: string;
  nome: string;
  marca: string;
  preco: string;
  sku: string;
  modelo: string | null;
  voltagem: string | null;
  pocoPolegadas: number | null;
  saiaProtecao: boolean;
  potenciaWatts: number | null;
  curvaVazao: number[];
  imagem: { url: string; alt: string } | null;
  garantia: string | null;
  recalque: string | null;
};

/**
 * Perda de carga da tubulação, como fração do comprimento.
 *
 * O cálculo exato depende de diâmetro, vazão e material — a fórmula de
 * Hazen-Williams pede dados que o cliente não tem à mão no formulário. Os 4%
 * são a regra de bolso usada no setor para PVC nas vazões desta linha, e é o
 * mesmo critério do briefing. Fica explícito na tela para o instalador poder
 * conferir, em vez de ser um número que sai de lugar nenhum.
 */
const PERDA_POR_METRO = 0.04;

const DIAMETROS = [
  { v: 4, r: "4 polegadas" },
  { v: 6, r: "6 polegadas" },
  { v: 8, r: "8 polegadas ou mais" },
  { v: 99, r: "Cisterna / cacimbão" },
];

export function Calculadora({ modelos }: { modelos: ModeloCalc[] }) {
  const [altura, setAltura] = useState(25);
  const [tubo, setTubo] = useState(40);
  const [poco, setPoco] = useState(6);
  const [tensao, setTensao] = useState("220V");

  const hTotal = Math.round(altura + tubo * PERDA_POR_METRO);

  const { indicada, alternativas, semSaida } = useMemo(() => {
    // A bomba precisa caber no poço antes de qualquer outra coisa: a errada
    // simplesmente não desce. Depois, a tensão da rede.
    const cabem = modelos.filter(
      (m) => m.pocoPolegadas != null && m.pocoPolegadas <= poco && m.voltagem === tensao,
    );

    const comVazao = cabem
      .map((m) => ({ m, vazao: vazaoNaAltura(m.curvaVazao, hTotal) }))
      .filter((x): x is { m: ModeloCalc; vazao: number } => x.vazao != null && x.vazao > 0)
      // mais vazão na altura real da instalação; empate desempata pelo preço
      .sort((a, b) => b.vazao - a.vazao || Number(a.m.preco) - Number(b.m.preco));

    return {
      indicada: comVazao[0] ?? null,
      alternativas: comVazao.slice(1, 4),
      semSaida: hTotal > 65,
    };
  }, [modelos, poco, tensao, hTotal]);

  // `items-start` porque o formulário é curto e o resultado é alto: sem isso a
  // coluna da esquerda estica até a altura da direita e deixa um vazio branco
  // enorme embaixo dos campos.
  return (
    <div className="grid items-start gap-7 lg:grid-cols-[minmax(0,380px)_1fr]">
      <form className="rounded-caixa border border-marca-linha bg-superficie p-5 shadow-lg shadow-marca/5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo
            rotulo="Altura até a caixa d'água"
            unidade="metros"
            valor={altura}
            aoMudar={setAltura}
          />
          <Campo
            rotulo="Comprimento da tubulação"
            unidade="metros"
            valor={tubo}
            aoMudar={setTubo}
          />
          <label className="block">
            <span className="mb-1.5 block text-[12.5px] font-bold">Diâmetro do poço</span>
            <select
              value={poco}
              onChange={(e) => setPoco(Number(e.target.value))}
              className="num w-full rounded-lg border border-linha-2 bg-superficie px-3 py-2.5 text-[14px] font-semibold"
            >
              {DIAMETROS.map((d) => (
                <option key={d.v} value={d.v}>{d.r}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[12.5px] font-bold">Tensão da rede</span>
            <select
              value={tensao}
              onChange={(e) => setTensao(e.target.value)}
              className="num w-full rounded-lg border border-linha-2 bg-superficie px-3 py-2.5 text-[14px] font-semibold"
            >
              <option value="110/127V">110V / 127V</option>
              <option value="220V">220V</option>
            </select>
          </label>
        </div>

        <div className="mt-5 rounded-lg bg-marca-suave px-4 py-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-marca">
            Altura manométrica total
          </p>
          <p className="num mt-1 text-2xl font-extrabold tracking-tight text-marca-escuro">
            {hTotal} metros
          </p>
          <p className="mt-1 text-[11.5px] leading-snug text-mudo">
            {altura} m de altura + {Math.round(tubo * PERDA_POR_METRO)} m de perda na tubulação
            (4% de {tubo} m, regra usada para PVC nesta faixa de vazão).
          </p>
        </div>
      </form>

      <div>
        {semSaida ? (
          <Aviso
            titulo="Nenhuma bomba vibratória atende essa altura"
            texto={`${hTotal} metros passa do limite de 65 m.c.a. de toda a linha. Para essa instalação o caminho é uma bomba multiestágio ou submersa tipo caneta · fale com o técnico da fábrica antes de comprar.`}
          />
        ) : !indicada ? (
          <Aviso
            titulo="Nenhum modelo com esses filtros"
            texto={`Não temos bomba de ${tensao} que entre num poço de ${poco === 99 ? "cisterna" : `${poco} polegadas`}. Ajuste a tensão ou fale com o técnico.`}
          />
        ) : (
          <>
            <Ficha item={indicada} hTotal={hTotal} />
            {alternativas.length > 0 && (
              <div className="mt-5">
                <h3 className="mb-2.5 text-[12.5px] font-extrabold uppercase tracking-[0.12em] text-mudo">
                  Também servem
                </h3>
                <ul className="grid gap-2.5 sm:grid-cols-3">
                  {alternativas.map(({ m, vazao }) => (
                    <li key={m.slug}>
                      <Link
                        href={`/produto/${m.slug}`}
                        className="block h-full rounded-caixa border border-linha bg-superficie p-3 hover:border-marca-linha"
                      >
                        <p className="text-[12.5px] font-bold leading-tight">{m.modelo ?? m.nome}</p>
                        <p className="num mt-1 text-[12px] font-bold text-marca">{litros(vazao)}</p>
                        <p className="num text-[12px] font-semibold text-mudo">{brl(Number(m.preco))}</p>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Campo({
  rotulo,
  unidade,
  valor,
  aoMudar,
}: {
  rotulo: string;
  unidade: string;
  valor: number;
  aoMudar: (n: number) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12.5px] font-bold">
        {rotulo} <span className="font-medium text-mudo">({unidade})</span>
      </span>
      <input
        type="number"
        min={1}
        value={valor}
        onChange={(e) => aoMudar(Math.max(0, Number(e.target.value)))}
        className="num w-full rounded-lg border border-linha-2 bg-superficie px-3 py-2.5 text-[14px] font-semibold"
      />
    </label>
  );
}

function Aviso({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <div className="rounded-caixa border border-linha bg-superficie p-6">
      <h3 className="text-lg font-extrabold tracking-tight">{titulo}</h3>
      <p className="mt-2 max-w-prose text-[14px] text-tinta-2">{texto}</p>
      <Link
        href="/fale-conosco"
        className="mt-4 inline-block rounded-lg bg-marca px-5 py-2.5 text-[13.5px] font-bold text-white"
      >
        Falar com o técnico
      </Link>
    </div>
  );
}

/**
 * O resultado é a ficha inteira, não uma linha dizendo o nome do modelo.
 * Quem chegou sem saber o que comprar sai com o produto escolhido — com foto,
 * preço e botão — sem navegar por página nenhuma.
 */
function Ficha({ item, hTotal }: { item: { m: ModeloCalc; vazao: number }; hTotal: number }) {
  const { m, vazao } = item;
  const preco = Number(m.preco);
  const perda = Math.round((1 - vazao / m.curvaVazao[0]) * 100);

  return (
    <article className="overflow-hidden rounded-caixa border-2 border-marca bg-superficie">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-marca px-5 py-2.5 text-white">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-ouro">
          Bomba indicada para a sua instalação
        </p>
        <p className="num text-[12.5px] font-semibold text-white/80">
          altura manométrica total: {hTotal} m
        </p>
      </div>

      <div className="grid gap-6 p-5 sm:grid-cols-[220px_1fr]">
        <div className="flex items-center justify-center rounded-lg border border-linha bg-superficie-2 p-4">
          {m.imagem && (
            <Image
              src={m.imagem.url}
              alt={m.imagem.alt}
              width={320}
              height={320}
              className="h-48 w-auto object-contain"
            />
          )}
        </div>

        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-marca">{m.marca}</p>
          <h3 className="mt-1 text-xl font-extrabold leading-snug tracking-tight">
            {m.modelo ?? m.nome}
          </h3>
          <p className="num mt-1 text-[11.5px] font-semibold text-mudo">
            cód. {m.sku} · {m.voltagem} · fabricação própria Vibra Vert
          </p>

          {/* O número que importa não é a vazão máxima do catálogo · é quanto
              esta bomba entrega no poço deste cliente. */}
          <div className="mt-4 rounded-lg border border-ouro/40 bg-ouro/10 px-4 py-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-ouro-txt">
              Na sua instalação
            </p>
            <p className="num mt-0.5 text-2xl font-extrabold tracking-tight text-ouro-txt">
              {litros(vazao)}
            </p>
            {perda > 0 && (
              <p className="mt-0.5 text-[11.5px] text-ouro-txt/80">
                {perda}% abaixo da vazão máxima de {litros(m.curvaVazao[0])}, por causa dos {hTotal} m
                de altura
              </p>
            )}
          </div>

          <dl className="mt-4 border-t border-linha text-[13px]">
            {[
              ["vazão máxima", litros(m.curvaVazao[0])],
              ["elevação máxima", "65 m"],
              m.potenciaWatts && ["potência", `${m.potenciaWatts} W`],
              m.recalque && ["saída de recalque", m.recalque],
              ["poço", `${m.pocoPolegadas} polegadas${m.saiaProtecao ? " · com saia de proteção" : ""}`],
              m.garantia && ["garantia", m.garantia],
            ]
              .filter(Boolean)
              .map((linha) => {
                const [k, v] = linha as [string, string];
                return (
                  <div key={k} className="flex justify-between border-b border-linha py-1.5">
                    <dt className="text-mudo">{k}</dt>
                    <dd className="num font-bold">{v}</dd>
                  </div>
                );
              })}
          </dl>

          <div className="mt-4">
            <p className="num text-2xl font-extrabold tracking-tight">{brl(preco)}</p>
            <p className="num text-[12.5px] font-bold text-bom">{brl(precoPix(preco))} no PIX</p>
            <p className="num text-[12.5px] font-semibold text-mudo">
              ou {PARCELAS_MAX}× de {brl(parcela(preco))} sem juros
            </p>
          </div>

          <div className="mt-4 flex flex-wrap gap-2.5">
            <Link
              href={`/produto/${m.slug}`}
              className="flex-1 rounded-lg bg-ouro px-5 py-3 text-center text-[13.5px] font-extrabold text-ouro-txt"
            >
              Ver e comprar
            </Link>
            <Link
              href="/fale-conosco"
              className="flex-1 rounded-lg bg-marca-escuro px-5 py-3 text-center text-[13.5px] font-extrabold text-white"
            >
              Falar com o técnico
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
