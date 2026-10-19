import { diasEntre } from "./datas";
import type { Pendencia } from "./pendencias";
import { ehMarketplace, type Canal, type DataISO, type Faixa } from "./tipos";

/**
 * Emissão da NF como ela chegou.
 *
 * `exata`: Bling ou operador. `mes`: só a chave de 44 dígitos, que traz ano e
 * mês, nunca o dia. Com o mês, a faixa só é confirmada quando o primeiro e o
 * último dia do mês caem na mesma faixa.
 */
export type Emissao =
  | { tipo: "exata"; data: DataISO }
  | { tipo: "mes"; ano: number; mes: number }
  | null;

export type EntradaFaixa = {
  /** Dia em que o formulário foi enviado. */
  envio: DataISO;
  emissao: Emissao;
  /** Data de recebimento declarada pelo cliente · conta o arrependimento. */
  recebimento: DataISO | null;
  canal: Canal | null;
  /** Canal conferido no Bling ou pelo CNPJ da NF, e não só declarado. */
  canalConfirmado: boolean;
  usou: boolean;
};

export type ResultadoFaixa = {
  faixa: Faixa;
  /** Dias da emissão ao envio. Com emissão por mês, o intervalo possível. */
  dias: { min: number; max: number } | null;
  dataConfirmada: boolean;
  canalConfirmado: boolean;
  pendencia?: Pendencia;
};

export const ARREPENDIMENTO_DIAS = 7;
export const TROCA_EXPRESSA_DIAS = 30;
export const LEGAL_DIAS = 90;

function ultimoDia(ano: number, mes: number) {
  return new Date(Date.UTC(ano, mes, 0)).getUTCDate();
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/** Faixa só pelos dias, para quem já passou do desvio cedo. */
function porDias(dias: number, canal: Canal | null): { faixa: Faixa; pendencia?: Pendencia } {
  if (dias > LEGAL_DIAS) return { faixa: "normal_91" };
  if (dias > TROCA_EXPRESSA_DIAS) return { faixa: "normal_31_90" };
  if (canal === null) return { faixa: "indefinida" };
  if (ehMarketplace(canal)) return { faixa: "marketplace_30" };
  if (canal === "site") return { faixa: "troca_expressa" };
  if (canal === "venda_direta_outra") return { faixa: "indefinida", pendencia: "venda_direta_fora_do_site" };
  return { faixa: "indefinida", pendencia: "revenda_ate_30" };
}

/**
 * Faixa do chamado.
 *
 * Ordem: arrependimento primeiro (conta do recebimento), depois os dias da
 * emissão da NF até o envio do formulário.
 */
export function calcularFaixa(e: EntradaFaixa): ResultadoFaixa {
  const base = { canalConfirmado: e.canalConfirmado };

  // ── arrependimento: até 7 dias do recebimento, sem uso ────────────
  if (!e.usou && e.recebimento) {
    const d = diasEntre(e.recebimento, e.envio);
    if (d >= 0 && d <= ARREPENDIMENTO_DIAS) {
      if (e.canal && ehMarketplace(e.canal)) {
        return { ...base, faixa: "indefinida", dias: null, dataConfirmada: false, pendencia: "marketplace_arrependimento" };
      }
      if (e.canal === "revenda") {
        return { ...base, faixa: "indefinida", dias: null, dataConfirmada: false, pendencia: "revenda_ate_30" };
      }
      if (e.canal === "site" || e.canal === "venda_direta_outra") {
        return { ...base, faixa: "arrependimento", dias: { min: d, max: d }, dataConfirmada: true };
      }
    }
  }

  // ── da emissão da NF ao envio ─────────────────────────────────────
  if (!e.emissao) return { ...base, faixa: "indefinida", dias: null, dataConfirmada: false };

  let min: number;
  let max: number;
  if (e.emissao.tipo === "exata") {
    min = max = diasEntre(e.emissao.data, e.envio);
  } else {
    const { ano, mes } = e.emissao;
    // O último dia do mês dá o menor número de dias, o primeiro dá o maior.
    min = diasEntre(`${ano}-${pad(mes)}-${pad(ultimoDia(ano, mes))}`, e.envio);
    max = diasEntre(`${ano}-${pad(mes)}-01`, e.envio);
  }

  // Emissão depois do envio é dado errado, não faixa.
  if (max < 0) return { ...base, faixa: "indefinida", dias: { min, max }, dataConfirmada: false };
  min = Math.max(0, min);

  const a = porDias(min, e.canal);
  const b = porDias(max, e.canal);
  const dataConfirmada = a.faixa === b.faixa && a.pendencia === b.pendencia;
  const r = dataConfirmada ? a : { faixa: "indefinida" as Faixa };

  return { ...base, ...r, dias: { min, max }, dataConfirmada };
}
