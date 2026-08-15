/**
 * Regras comerciais da revenda, definidas pelo Alex em 15/08/2026.
 */

/** Desconto por faixa, sobre o preço à vista no PIX. */
export const FAIXAS = [
  { nome: "Revenda", de: 6, ate: 11, desconto: 0.05 },
  { nome: "Revenda Plus", de: 12, ate: 23, desconto: 0.075 },
  { nome: "Parceiro", de: 24, ate: 47, desconto: 0.1 },
  { nome: "Distribuidor", de: 48, ate: Infinity, desconto: 0.125 },
] as const;

export const MINIMO = FAIXAS[0].de;

/** O desconto incide sobre o preço PIX, não sobre o cheio. */
export const DESCONTO_SOBRE_PIX = true;

/** A revenda tem frete grátis. */
export const B2B_FRETE_GRATIS = true;

/** Liberação depende de conferência. Boleto ainda passa por análise de crédito. */
export const APROVACAO_AUTOMATICA = false;

/**
 * Prazo do boleto faturado, por valor do pedido.
 *
 * "28/42" quer dizer duas parcelas, em 28 e 42 dias. Quanto maior o pedido,
 * mais parcelas · é o crédito que a fábrica dá ao revendedor, e por isso
 * depende de análise.
 */
export const PRAZOS = [
  { acima: 10000, parcelas: [28, 42, 56] },
  { acima: 5000, parcelas: [28, 42] },
  { acima: 1000, parcelas: [28] },
] as const;

export const prazoDe = (valor: number) => PRAZOS.find((p) => valor >= p.acima) ?? null;

/**
 * Cartão de crédito não é liberado na revenda.
 *
 * A taxa do cartão come a margem que o desconto de revenda já reduziu · numa
 * compra de quarenta bombas, a diferença paga um funcionário.
 */
export const B2B_ACEITA_CARTAO = false;

/**
 * Documentos exigidos para o boleto faturado.
 *
 * Faturar é dar crédito. Sem os documentos não há como avaliar risco, e uma
 * inadimplência de dez mil reais em bombas é o lucro de muitas vendas.
 */
export const DOCUMENTOS = [
  { chave: "nota1", r: "Nota fiscal de compra recente", d: "de qualquer fornecedor, últimos 90 dias" },
  { chave: "nota2", r: "Segunda nota fiscal de compra", d: "de outro fornecedor, se possível" },
  { chave: "endereco", r: "Comprovante de endereço", d: "da empresa, últimos 90 dias" },
  { chave: "contrato", r: "Contrato social", d: "com a última alteração" },
] as const;

export const faixaDe = (unidades: number) =>
  FAIXAS.find((f) => unidades >= f.de && unidades <= f.ate) ?? null;

/** Pedido mínimo de peças. Abaixo disso o frete custa mais que o produto. */
export const MINIMO_PECAS = 49.9;
