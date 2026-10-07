import { vazaoNaAltura } from "@/lib/formato";
import type { ModeloCalc } from "@/components/calculadora";

/**
 * A conta que escolhe a bomba.
 *
 * Estava dentro da calculadora. Agora a Vibrinha também recomenda no chat, e
 * duas cópias da mesma regra é o caminho garantido para a página dizer uma
 * bomba e o chat dizer outra. As duas chamam esta função.
 */

/**
 * Perda de carga da tubulação, como fração do comprimento.
 *
 * O cálculo exato depende de diâmetro, vazão e material — a fórmula de
 * Hazen-Williams pede dados que o cliente não tem à mão no formulário. Os 4%
 * são a regra de bolso usada no setor para PVC nas vazões desta linha, e é o
 * mesmo critério do briefing. Fica explícito na tela para o instalador poder
 * conferir, em vez de ser um número que sai de lugar nenhum.
 */
export const PERDA_POR_METRO = 0.04;

/** Altura manométrica máxima de toda a linha vibratória. */
export const ALTURA_LIMITE = 65;

export const alturaTotal = (altura: number, tubo: number) =>
  Math.round(altura + tubo * PERDA_POR_METRO);

export type Recomendacao = {
  indicada: { m: ModeloCalc; vazao: number } | null;
  alternativas: { m: ModeloCalc; vazao: number }[];
  semSaida: boolean;
};

export function recomendar(
  modelos: ModeloCalc[],
  {
    hTotal,
    poco,
    tensao,
    vazaoMinima,
  }: { hTotal: number; poco: number; tensao: string; vazaoMinima?: number },
): Recomendacao {
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

  // Quem já sabe quanta água precisa não quer a bomba que mais entrega, quer a
  // mais barata que dá conta: das que alcançam a vazão pedida, a de menor preço.
  if (vazaoMinima) {
    const servem = comVazao
      .filter((x) => x.vazao >= vazaoMinima)
      .sort((a, b) => Number(a.m.preco) - Number(b.m.preco) || b.vazao - a.vazao);
    return { indicada: servem[0] ?? null, alternativas: servem.slice(1, 4), semSaida: hTotal > ALTURA_LIMITE };
  }

  return {
    indicada: comVazao[0] ?? null,
    alternativas: comVazao.slice(1, 4),
    semSaida: hTotal > ALTURA_LIMITE,
  };
}
