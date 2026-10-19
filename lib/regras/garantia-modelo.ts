import { diasEntre, somarMeses } from "./datas";
import type { DataISO, Modelo } from "./tipos";

/**
 * Garantia longa: só motor (caneca) e furo na carcaça.
 * Borrachas (canopla, ventosa, amortecedor, válvula): 90 dias em todo modelo.
 */
export const MESES_MOTOR_CARCACA: Record<Modelo, number> = {
  r1500: 6,
  r2000: 12,
  r2500: 12,
  vibrinha: 24,
  vv800: 24,
  vv900: 24,
};

export const BORRACHAS_DIAS = 90;

export type Cobertura = {
  /** Borrachas ainda na garantia de 90 dias. */
  borrachas: boolean;
  /** Motor e carcaça ainda no prazo do modelo. */
  motorCarcaca: boolean;
  /** Último dia da garantia do motor e da carcaça. */
  fimMotorCarcaca: DataISO;
};

/** Cobertura na data do envio, contada da emissão da NF. */
export function cobertura(modelo: Modelo, emissao: DataISO, envio: DataISO): Cobertura {
  const fimMotorCarcaca = somarMeses(emissao, MESES_MOTOR_CARCACA[modelo]);
  return {
    borrachas: diasEntre(emissao, envio) <= BORRACHAS_DIAS,
    motorCarcaca: diasEntre(envio, fimMotorCarcaca) >= 0,
    fimMotorCarcaca,
  };
}

/** Frase obrigatória sempre que a garantia longa aparece num texto. */
export function textoGarantia(modelo: Modelo): string {
  const m = MESES_MOTOR_CARCACA[modelo];
  const prazo = m >= 12 ? `${m / 12} ${m === 12 ? "ano" : "anos"}` : `${m} meses`;
  return `${prazo} no motor e na carcaça · borrachas 90 dias`;
}
