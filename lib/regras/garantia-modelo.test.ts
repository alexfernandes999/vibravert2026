import { describe, expect, it } from "vitest";
import { cobertura, textoGarantia } from "./garantia-modelo";
import { MODELOS } from "./tipos";

const EMISSAO = "2026-01-15";

describe("borrachas: 90 dias em todos os modelos", () => {
  it.each(MODELOS)("%s · dia 90 cobre, dia 91 não", (m) => {
    expect(cobertura(m, EMISSAO, "2026-04-15").borrachas).toBe(true); // 90 dias
    expect(cobertura(m, EMISSAO, "2026-04-16").borrachas).toBe(false); // 91 dias
  });
});

describe("motor e carcaça: prazo por modelo", () => {
  it.each([
    ["r1500", "2026-07-15", "2026-07-16"],
    ["r2000", "2027-01-15", "2027-01-16"],
    ["r2500", "2027-01-15", "2027-01-16"],
    ["vibrinha", "2028-01-15", "2028-01-16"],
    ["vv800", "2028-01-15", "2028-01-16"],
    ["vv900", "2028-01-15", "2028-01-16"],
  ] as const)("%s · cobre até %s, não cobre em %s", (m, ultimo, depois) => {
    expect(cobertura(m, EMISSAO, ultimo).motorCarcaca).toBe(true);
    expect(cobertura(m, EMISSAO, depois).motorCarcaca).toBe(false);
  });

  it("Rymer 1500 com 5 meses: motor coberto, borracha não", () => {
    const c = cobertura("r1500", EMISSAO, "2026-06-20");
    expect(c.motorCarcaca).toBe(true);
    expect(c.borrachas).toBe(false);
  });
});

describe("texto da garantia", () => {
  it("nunca sai sem a ressalva das borrachas", () => {
    expect(textoGarantia("vv900")).toBe("2 anos no motor e na carcaça · borrachas 90 dias");
    expect(textoGarantia("r2000")).toBe("1 ano no motor e na carcaça · borrachas 90 dias");
    expect(textoGarantia("r1500")).toBe("6 meses no motor e na carcaça · borrachas 90 dias");
  });
});
