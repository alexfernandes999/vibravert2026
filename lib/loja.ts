/**
 * Regras comerciais da loja. Vieram do briefing do Alex de 13/08/2026.
 */

/**
 * Frete grátis em toda bomba, sem valor mínimo.
 *
 * O piso de R$ 399 que existia aqui era inalcançável: nenhuma bomba passa de
 * R$ 350, então a promessa da vitrine nunca se cumpria. Basta uma bomba no
 * carrinho para o pedido inteiro sair grátis; pedido só de peça, kit avulso ou
 * acessório paga frete normal.
 */
export const FRETE_GRATIS_EM_BOMBAS = true;

/**
 * Prazo de despacho, prometido ao cliente. Veio do Gustavo em 07/10/2026,
 * junto com a tabela de preços. Prazo anunciado obriga a ser cumprido: se a
 * fábrica mudar o ritmo, muda aqui e todo lugar que cita acompanha.
 */
export const PRAZO_DESPACHO = "sai da fábrica em até 1 dia útil após a confirmação do pagamento";

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
