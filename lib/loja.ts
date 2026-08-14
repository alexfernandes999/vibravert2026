/**
 * Regras comerciais da loja. Vieram do briefing do Alex de 13/08/2026.
 */

/**
 * Frete grátis em toda bomba, sem valor mínimo.
 *
 * O piso de R$ 399 que existia aqui era inalcançável: nenhuma bomba passa de
 * R$ 350, então a promessa da vitrine nunca se cumpria. Peça, kit avulso e
 * qualquer item que não seja bomba pagam frete normal.
 */
export const FRETE_GRATIS_EM_BOMBAS = true;

/** Frete fixo, só quando a transportadora não responde. */
export const FRETE_PADRAO = 39.9;

/** Desconto à vista no PIX. É o meio mais barato para a loja e o que mais converte. */
export const DESCONTO_PIX = 0.1;

/** Parcelas sem juros. Cada parcela a mais custa taxa ao lojista. */
export const PARCELAS_SEM_JUROS = 10;

/**
 * A fábrica não controla quantidade por SKU: produz sob demanda, e o cadastro
 * da VTEX sempre marcou disponibilidade aberta. Decisão do cliente, não
 * pendência.
 *
 * Se um dia houver contagem real vinda do ERP, basta ligar aqui: o carrinho e
 * o checkout já respeitam esta chave.
 */
export const CONTROLA_ESTOQUE = true;
