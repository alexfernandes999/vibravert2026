/**
 * Casos que os documentos da fase 1 não definem.
 *
 * Regra que não está escrita não se inventa: o caso vai para a fila humana com
 * o código da pendência, e quem decide é uma pessoa. Quando a diretoria
 * responder, a regra entra no motor e a pendência sai daqui.
 */
export const PENDENCIAS = {
  // Todas as pendências da fase 1 foram decididas pela diretoria em out/2026:
  // revenda até 30 dias → fluxo normal; venda direta fora do site → Troca
  // Expressa; marketplace sem uso até 7 dias → devolução no marketplace; fora
  // do prazo do motor → sugestão de negativa, confirmada por uma pessoa.
} as const satisfies Record<string, string>;

export type Pendencia = keyof typeof PENDENCIAS | (string & {});
