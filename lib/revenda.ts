/**
 * Regras comerciais da revenda.
 *
 * ⚠ As três marcadas continuam pendentes de decisão do Alex. Ficam aqui com o
 * padrão mais conservador para a loja, e trocá-las é editar este arquivo · não
 * mexer em tela nenhuma.
 */

/** Desconto por faixa, sobre o preço à vista no PIX. */
export const FAIXAS = [
  { nome: "Revenda", de: 6, ate: 11, desconto: 0.05 },
  { nome: "Revenda Plus", de: 12, ate: 23, desconto: 0.075 },
  { nome: "Parceiro", de: 24, ate: 47, desconto: 0.1 },
  { nome: "Distribuidor", de: 48, ate: Infinity, desconto: 0.125 },
] as const;

export const MINIMO = FAIXAS[0].de;

/** ⚠ PENDENTE · o desconto incide sobre o PIX ou sobre o preço cheio? */
export const DESCONTO_SOBRE_PIX = true;

/** ⚠ PENDENTE · o B2B também tem frete grátis? */
export const B2B_FRETE_GRATIS = false;

/** ⚠ PENDENTE · liberação automática ao validar o CNPJ, ou aprovação manual? */
export const APROVACAO_AUTOMATICA = false;

export const faixaDe = (unidades: number) =>
  FAIXAS.find((f) => unidades >= f.de && unidades <= f.ate) ?? null;
