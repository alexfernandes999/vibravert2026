/**
 * Lista fechada: os únicos quatro itens que geram recusa.
 *
 * A Claude identifica nas fotos; o código decide o que fazer com isso.
 * Inconclusivo nunca é recusa. Item ausente da resposta conta como inconclusivo:
 * o que não foi olhado não pode virar "não encontrado".
 */
export const ITENS_LISTA_FECHADA = [
  "bomba_outra_marca",
  "cabo_cortado",
  "produto_violado",
  "carcaca_quebrada_impacto",
] as const;
export type ItemListaFechada = (typeof ITENS_LISTA_FECHADA)[number];

export const ROTULO_ITEM: Record<ItemListaFechada, string> = {
  bomba_outra_marca: "Bomba de outra marca",
  cabo_cortado: "Cabo cortado ou seccionado",
  produto_violado: "Produto aberto ou violado",
  carcaca_quebrada_impacto: "Carcaça quebrada por impacto ou queda",
};

export type ResultadoItem = "encontrado" | "nao_encontrado" | "inconclusivo";

export type AvaliacaoItem = {
  item: ItemListaFechada;
  resultado: ResultadoItem;
  foto_ref: string | null;
  motivo_inconclusivo: string | null;
};

export type ResumoLista = {
  itens: AvaliacaoItem[];
  encontrados: ItemListaFechada[];
  inconclusivos: ItemListaFechada[];
};

export function resumirLista(avaliacoes: AvaliacaoItem[]): ResumoLista {
  const itens = ITENS_LISTA_FECHADA.map(
    (item): AvaliacaoItem =>
      avaliacoes.find((a) => a.item === item) ?? {
        item,
        resultado: "inconclusivo",
        foto_ref: null,
        motivo_inconclusivo: "item não avaliado",
      },
  );
  return {
    itens,
    encontrados: itens.filter((i) => i.resultado === "encontrado").map((i) => i.item),
    inconclusivos: itens.filter((i) => i.resultado === "inconclusivo").map((i) => i.item),
  };
}
