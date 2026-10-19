import { describe, expect, it } from "vitest";
import { cpfValido, cnpjValido, decomporChave, lerNF, rastreioValido, CNPJS_PROPRIOS } from "./nf";

/** Monta uma chave com DV calculado aqui, independente da implementação. */
function chaveCom(base43: string) {
  let soma = 0;
  let peso = 2;
  for (let i = 42; i >= 0; i--) {
    soma += Number(base43[i]) * peso;
    peso = peso === 9 ? 2 : peso + 1;
  }
  const r = soma % 11;
  return base43 + (r < 2 ? 0 : 11 - r);
}
// 35 (SP) · 2607 (jul/2026) · CNPJ ARF · 55 · série 001 · nº 000119876 · 1 · código 00011987
const BASE = "35" + "2607" + "20550456000132" + "55" + "001" + "000119876" + "1" + "00011987";
const CHAVE = chaveCom(BASE);

describe("CPF e CNPJ", () => {
  it("valida dígitos", () => {
    expect(cpfValido("529.982.247-25")).toBe(true);
    expect(cpfValido("529.982.247-24")).toBe(false);
    expect(cpfValido("111.111.111-11")).toBe(false);
    for (const c of CNPJS_PROPRIOS) expect(cnpjValido(c)).toBe(true);
    expect(cnpjValido("20.550.456/0001-33")).toBe(false);
  });
});

describe("chave de 44 dígitos", () => {
  it("decompõe ano, mês, emitente, série e número", () => {
    const c = decomporChave(CHAVE)!;
    expect(c).toMatchObject({ uf: "35", ano: 2026, mes: 7, cnpjEmitente: "20550456000132", serie: 1, numero: 119876, propria: true });
  });
  it("recusa chave com dígito verificador errado", () => {
    const errada = CHAVE.slice(0, 43) + ((Number(CHAVE[43]) + 1) % 10);
    expect(decomporChave(errada)).toBeNull();
  });
});

describe("campo da NF", () => {
  it("aceita número de até 9 dígitos", () => {
    expect(lerNF("119876")).toEqual({ tipo: "numero", numero: 119876 });
  });
  it("aceita a chave com espaços", () => {
    expect(lerNF(CHAVE.replace(/(\d{4})/g, "$1 ")).tipo).toBe("chave");
  });
  it("recusa o CPF digitado no campo da NF", () => {
    expect(lerNF("529.982.247-25")).toEqual({ tipo: "invalida", motivo: "cpf" });
  });
  it("recusa o documento do próprio cliente", () => {
    expect(lerNF("20550456000132", "20.550.456/0001-32")).toEqual({ tipo: "invalida", motivo: "documento_do_cliente" });
  });
  it("recusa lixo", () => {
    expect(lerNF("abc").tipo).toBe("invalida");
    expect(lerNF("1234567890").tipo).toBe("invalida");
  });
});

describe("rastreio", () => {
  it("2 letras, 9 números, 2 letras", () => {
    expect(rastreioValido("qb123456789br")).toBe(true);
    expect(rastreioValido("QB12345678BR")).toBe(false);
  });
});
