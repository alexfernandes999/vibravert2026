/**
 * Documentos: CPF, CNPJ e nota fiscal.
 *
 * O campo da NF recebe de tudo · número, chave de 44 dígitos, texto, e com
 * frequência o próprio CPF do cliente. O CPF é recusado: com ele, a consulta no
 * Bling volta vazia e o chamado fica sem data.
 */
const so = (s: string) => s.replace(/\D/g, "");

export function cpfValido(v: string): boolean {
  const c = so(v);
  if (c.length !== 11 || /^(\d)\1{10}$/.test(c)) return false;
  for (const n of [9, 10]) {
    let soma = 0;
    for (let i = 0; i < n; i++) soma += Number(c[i]) * (n + 1 - i);
    if (((soma * 10) % 11) % 10 !== Number(c[n])) return false;
  }
  return true;
}

export function cnpjValido(v: string): boolean {
  const c = so(v);
  if (c.length !== 14 || /^(\d)\1{13}$/.test(c)) return false;
  const dv = (base: string) => {
    let peso = base.length - 7;
    let soma = 0;
    for (const d of base) {
      soma += Number(d) * peso--;
      if (peso < 2) peso = 9;
    }
    const r = soma % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return dv(c.slice(0, 12)) === Number(c[12]) && dv(c.slice(0, 13)) === Number(c[13]);
}

export const documentoValido = (v: string) => cpfValido(v) || cnpjValido(v);

/** CNPJs da Vibra Vert e da ARF: só as NFs deles são consultadas no Bling. */
export const CNPJS_PROPRIOS = ["21276576000156", "20550456000132"];

export type ChaveNF = {
  chave: string;
  uf: string;
  ano: number;
  mes: number;
  cnpjEmitente: string;
  modelo: string;
  serie: number;
  numero: number;
  propria: boolean;
};

/** Dígito verificador da chave: módulo 11, pesos de 2 a 9 da direita para a esquerda. */
function dvChave(base43: string): number {
  let soma = 0;
  let peso = 2;
  for (let i = base43.length - 1; i >= 0; i--) {
    soma += Number(base43[i]) * peso;
    peso = peso === 9 ? 2 : peso + 1;
  }
  const r = soma % 11;
  return r < 2 ? 0 : 11 - r;
}

export function decomporChave(v: string): ChaveNF | null {
  const c = so(v);
  if (c.length !== 44 || dvChave(c.slice(0, 43)) !== Number(c[43])) return null;
  const mes = Number(c.slice(4, 6));
  if (mes < 1 || mes > 12) return null;
  const cnpjEmitente = c.slice(6, 20);
  return {
    chave: c,
    uf: c.slice(0, 2),
    ano: 2000 + Number(c.slice(2, 4)),
    mes,
    cnpjEmitente,
    modelo: c.slice(20, 22),
    serie: Number(c.slice(22, 25)),
    numero: Number(c.slice(25, 34)),
    propria: CNPJS_PROPRIOS.includes(cnpjEmitente),
  };
}

export type LeituraNF =
  | { tipo: "chave"; chave: ChaveNF }
  | { tipo: "numero"; numero: number }
  | { tipo: "invalida"; motivo: "cpf" | "documento_do_cliente" | "formato" };

/** Lê o que o cliente digitou no campo da NF. */
export function lerNF(v: string, documentoCliente?: string): LeituraNF {
  const c = so(v);
  if (documentoCliente && c && c === so(documentoCliente)) return { tipo: "invalida", motivo: "documento_do_cliente" };
  if (c.length === 44) {
    const chave = decomporChave(c);
    return chave ? { tipo: "chave", chave } : { tipo: "invalida", motivo: "formato" };
  }
  if (c.length === 11 && cpfValido(c)) return { tipo: "invalida", motivo: "cpf" };
  if (c.length >= 1 && c.length <= 9 && Number(c) > 0) return { tipo: "numero", numero: Number(c) };
  return { tipo: "invalida", motivo: "formato" };
}

/** Rastreio dos Correios: 2 letras, 9 números, 2 letras. */
export const rastreioValido = (v: string) => /^[A-Z]{2}\d{9}[A-Z]{2}$/.test(v.trim().toUpperCase());
