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
 * Enquanto o estoque não vier do ERP, todos os produtos estão com quantidade
 * zero — o cadastro da VTEX marcava 99.999 em tudo, que é o mesmo que não
 * controlar. Bloquear a venda por esse número impediria qualquer compra;
 * ignorá-lo sem avisar levaria a vender o que não existe.
 *
 * A trava fica desligada e explícita: quando houver quantidade real, é só
 * ligar aqui.
 */
export const CONTROLA_ESTOQUE = false;
