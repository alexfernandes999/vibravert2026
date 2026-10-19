import type { DataISO } from "./tipos";

const RE = /^(\d{4})-(\d{2})-(\d{2})$/;

function partes(d: DataISO): [number, number, number] {
  const m = RE.exec(d);
  if (!m) throw new Error(`Data fora do formato AAAA-MM-DD: "${d}"`);
  const [a, mes, dia] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const t = new Date(Date.UTC(a, mes - 1, dia));
  if (t.getUTCFullYear() !== a || t.getUTCMonth() !== mes - 1 || t.getUTCDate() !== dia) {
    throw new Error(`Data inexistente: "${d}"`);
  }
  return [a, mes, dia];
}

export function dataValida(d: string): boolean {
  try {
    partes(d);
    return true;
  } catch {
    return false;
  }
}

/** Dias corridos de `de` até `ate`. Mesmo dia = 0. */
export function diasEntre(de: DataISO, ate: DataISO): number {
  const [a1, m1, d1] = partes(de);
  const [a2, m2, d2] = partes(ate);
  return Math.round((Date.UTC(a2, m2 - 1, d2) - Date.UTC(a1, m1 - 1, d1)) / 86_400_000);
}

/**
 * Soma meses de calendário. 31/01 + 1 mês = 28/02 (ou 29): o fim do mês não
 * transborda para março.
 */
export function somarMeses(d: DataISO, meses: number): DataISO {
  const [a, m, dia] = partes(d);
  const alvo = new Date(Date.UTC(a, m - 1 + meses, 1));
  const ultimo = new Date(Date.UTC(alvo.getUTCFullYear(), alvo.getUTCMonth() + 1, 0)).getUTCDate();
  alvo.setUTCDate(Math.min(dia, ultimo));
  return alvo.toISOString().slice(0, 10);
}
