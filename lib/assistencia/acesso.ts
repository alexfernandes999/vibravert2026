import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Chave de acesso à página do protocolo.
 *
 * A página mostra nome, laudo e instruções: não pode abrir só por quem chuta
 * um número de protocolo. O link enviado ao cliente leva uma assinatura do
 * protocolo; quem chega sem ela informa protocolo + CPF e recebe o link.
 */
function segredo() {
  const s = process.env.ASSISTENCIA_SEGREDO || process.env.ADMIN_SEGREDO;
  if (!s) throw new Error("ASSISTENCIA_SEGREDO não definido");
  return s;
}

export function chaveProtocolo(protocolo: string): string {
  return createHmac("sha256", segredo()).update(`protocolo:${protocolo}`).digest("base64url").slice(0, 22);
}

export function chaveValida(protocolo: string, chave: string | undefined | null): boolean {
  if (!chave) return false;
  const a = Buffer.from(chaveProtocolo(protocolo));
  const b = Buffer.from(chave);
  return a.length === b.length && timingSafeEqual(a, b);
}

export const linkProtocolo = (protocolo: string) =>
  `/assistencia/protocolo/${protocolo}?k=${chaveProtocolo(protocolo)}`;
