/** Formatações que se repetem em toda a loja. */

import { DESCONTO_PIX as DESCONTO, PARCELAS_SEM_JUROS as PARCELAS } from "@/lib/loja";

export const brl = (v: number | { toString(): string }) =>
  Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/**
 * Desconto e parcelamento vêm de `lib/loja.ts`, e não daqui.
 *
 * Este arquivo tinha as próprias constantes, com outros valores. O resultado
 * é o pior tipo de erro: a vitrine anunciava um desconto e o checkout cobrava
 * outro, sem nenhum erro aparecer em lugar nenhum. Um número que decide preço
 * só pode existir num lugar.
 */
export { DESCONTO_PIX, PARCELAS_SEM_JUROS as PARCELAS_MAX } from "@/lib/loja";

export const precoPix = (v: number | { toString(): string }) => Number(v) * (1 - DESCONTO);
export const parcela = (v: number | { toString(): string }) => Number(v) / PARCELAS;

export const litros = (n: number) => `${n.toLocaleString("pt-BR")} L/h`;

export const ALTURAS_MCA = [0, 10, 20, 30, 40, 50, 60, 65];

/**
 * Vazão real na instalação do cliente, interpolada na curva do fabricante.
 * É a diferença entre dizer "até 2.500 litros por hora" e dizer quanto essa
 * bomba entrega no poço dele.
 */
export function vazaoNaAltura(curva: number[], altura: number): number | null {
  if (!curva.length) return null;
  if (altura <= 0) return curva[0];
  if (altura >= 65) return curva[curva.length - 1];
  const i = ALTURAS_MCA.findIndex((a) => a > altura);
  const a0 = ALTURAS_MCA[i - 1], a1 = ALTURAS_MCA[i];
  const v0 = curva[i - 1], v1 = curva[i];
  return Math.round(v0 + ((v1 - v0) * (altura - a0)) / (a1 - a0));
}
