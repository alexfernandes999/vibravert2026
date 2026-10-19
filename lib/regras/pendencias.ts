/**
 * Casos que os documentos da fase 1 não definem.
 *
 * Regra que não está escrita não se inventa: o caso vai para a fila humana com
 * o código da pendência, e quem decide é uma pessoa. Quando a diretoria
 * responder, a regra entra no motor e a pendência sai daqui.
 */
export const PENDENCIAS = {
  revenda_ate_30: "Compra em loja/revenda até 30 dias: o fluxo não está definido (só venda direta tem Troca Expressa).",
  venda_direta_fora_do_site: "Venda direta fora do site (telefone, WhatsApp): não está definido se conta como Troca Expressa.",
  marketplace_arrependimento: "Marketplace até 7 dias e sem uso: arrependimento pela Vibra Vert ou devolução no marketplace?",
  fora_da_garantia_longa: "Fora do prazo do motor e da carcaça do modelo: o destino (negativa, fila, orçamento) não está definido.",
} as const;

export type Pendencia = keyof typeof PENDENCIAS;
