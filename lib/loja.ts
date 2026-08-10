/**
 * Regras comerciais da loja.
 *
 * ⚠ Os valores marcados como PROVISÓRIO saíram do mockup, não de uma decisão
 * do cliente. Precisam ser confirmados antes de a loja receber o primeiro
 * pedido de verdade — frete e parcelamento saem direto da margem.
 */

/** PROVISÓRIO — a partir de quanto o frete é grátis. */
export const FRETE_GRATIS_ACIMA = 399;

/** PROVISÓRIO — frete fixo enquanto não há integração com transportadora. */
export const FRETE_PADRAO = 39.9;

/** Desconto à vista no PIX. É o meio mais barato para a loja e o que mais converte. */
export const DESCONTO_PIX = 0.05;

/** PROVISÓRIO — parcelas sem juros. Cada parcela a mais custa taxa ao lojista. */
export const PARCELAS_SEM_JUROS = 6;

/**
 * A fábrica não controla quantidade por SKU: produz sob demanda, e o cadastro
 * da VTEX sempre marcou disponibilidade aberta. Decisão do cliente, não
 * pendência.
 *
 * Se um dia houver contagem real vinda do ERP, basta ligar aqui: o carrinho e
 * o checkout já respeitam esta chave.
 */
export const CONTROLA_ESTOQUE = false;
