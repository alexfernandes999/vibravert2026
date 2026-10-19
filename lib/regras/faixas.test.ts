import { describe, expect, it } from "vitest";
import { calcularFaixa, type EntradaFaixa } from "./faixas";
import { diasEntre, somarMeses } from "./datas";

const ENVIO = "2026-10-19";
/** Emissão exata N dias antes do envio. */
const antes = (n: number) => {
  const d = new Date(Date.UTC(2026, 9, 19 - n));
  return d.toISOString().slice(0, 10);
};

const base = (o: Partial<EntradaFaixa> = {}): EntradaFaixa => ({
  envio: ENVIO,
  emissao: null,
  recebimento: null,
  canal: "site",
  canalConfirmado: true,
  usou: true,
  ...o,
});

describe("datas", () => {
  it("conta dias corridos, mesmo dia = 0", () => {
    expect(diasEntre("2026-10-19", "2026-10-19")).toBe(0);
    expect(diasEntre("2026-09-19", "2026-10-19")).toBe(30);
    expect(diasEntre("2026-02-28", "2026-03-01")).toBe(1);
  });
  it("soma meses sem transbordar o fim do mês", () => {
    expect(somarMeses("2026-01-31", 1)).toBe("2026-02-28");
    expect(somarMeses("2027-08-31", 6)).toBe("2028-02-29");
    expect(somarMeses("2026-04-10", 24)).toBe("2028-04-10");
  });
  it("recusa data inexistente", () => {
    expect(() => diasEntre("2026-02-30", ENVIO)).toThrow();
  });
});

describe("arrependimento (conta do recebimento)", () => {
  it("dia 7 sem uso, compra no site → arrependimento", () => {
    const r = calcularFaixa(base({ usou: false, recebimento: antes(7), emissao: { tipo: "exata", data: antes(9) } }));
    expect(r.faixa).toBe("arrependimento");
  });
  it("dia 8 sem uso → sai do arrependimento e segue pela NF", () => {
    const r = calcularFaixa(base({ usou: false, recebimento: antes(8), emissao: { tipo: "exata", data: antes(10) } }));
    expect(r.faixa).toBe("troca_expressa");
  });
  it("dia 7 mas já usou → não é arrependimento", () => {
    const r = calcularFaixa(base({ usou: true, recebimento: antes(7), emissao: { tipo: "exata", data: antes(9) } }));
    expect(r.faixa).toBe("troca_expressa");
  });
  it("marketplace até 7 dias sem uso → devolução no marketplace", () => {
    const r = calcularFaixa(base({ usou: false, canal: "ml", recebimento: antes(3) }));
    expect(r.faixa).toBe("marketplace_30");
  });
  it("revenda até 7 dias sem uso → sem arrependimento com a Vibra Vert, segue pela NF", () => {
    const r = calcularFaixa(base({ usou: false, canal: "revenda", recebimento: antes(3), emissao: { tipo: "exata", data: antes(5) } }));
    expect(r.faixa).toBe("normal_31_90");
  });
  it("venda direta fora do site até 7 dias sem uso → arrependimento", () => {
    expect(calcularFaixa(base({ usou: false, canal: "venda_direta_outra", recebimento: antes(3) })).faixa).toBe("arrependimento");
  });
});

describe("faixas pela emissão da NF", () => {
  const exata = (n: number, o: Partial<EntradaFaixa> = {}) =>
    calcularFaixa(base({ emissao: { tipo: "exata", data: antes(n) }, ...o }));

  it.each([
    [0, "troca_expressa"],
    [30, "troca_expressa"],
    [31, "normal_31_90"],
    [90, "normal_31_90"],
    [91, "normal_91"],
    [800, "normal_91"],
  ])("site, dia %i → %s", (n, faixa) => {
    expect(exata(n).faixa).toBe(faixa);
  });

  it("marketplace dia 30 → devolução no marketplace", () => {
    expect(exata(30, { canal: "shopee" }).faixa).toBe("marketplace_30");
  });
  it("marketplace dia 31 → fluxo normal", () => {
    expect(exata(31, { canal: "shopee" }).faixa).toBe("normal_31_90");
  });
  it("revenda até 30 dias → fluxo normal (quem vendeu foi a loja)", () => {
    expect(exata(10, { canal: "revenda" }).faixa).toBe("normal_31_90");
    expect(exata(30, { canal: "revenda" }).faixa).toBe("normal_31_90");
  });
  it("venda direta fora do site até 30 dias → Troca Expressa", () => {
    expect(exata(10, { canal: "venda_direta_outra" }).faixa).toBe("troca_expressa");
  });
  it("revenda com 45 dias → fluxo normal, a revenda não muda nada", () => {
    expect(exata(45, { canal: "revenda" }).faixa).toBe("normal_31_90");
  });
  it("emissão depois do envio → indefinida", () => {
    const r = calcularFaixa(base({ emissao: { tipo: "exata", data: "2026-10-25" } }));
    expect(r.faixa).toBe("indefinida");
    expect(r.dataConfirmada).toBe(false);
  });
  it("sem NF → indefinida, data não confirmada", () => {
    const r = calcularFaixa(base());
    expect(r.faixa).toBe("indefinida");
    expect(r.dataConfirmada).toBe(false);
  });
});

describe("emissão só pelo mês (chave de 44 dígitos)", () => {
  it("mês inteiro dentro da mesma faixa → confirmada", () => {
    const r = calcularFaixa(base({ emissao: { tipo: "mes", ano: 2026, mes: 3 } }));
    expect(r.faixa).toBe("normal_91");
    expect(r.dataConfirmada).toBe(true);
  });
  it("mês que atravessa o dia 30/31 → data não confirmada", () => {
    // setembro: de 18 a 48 dias antes de 19/10
    const r = calcularFaixa(base({ emissao: { tipo: "mes", ano: 2026, mes: 9 } }));
    expect(r.faixa).toBe("indefinida");
    expect(r.dataConfirmada).toBe(false);
  });
  it("mês que atravessa o dia 90/91 → data não confirmada", () => {
    // julho: de 80 a 110 dias
    expect(calcularFaixa(base({ emissao: { tipo: "mes", ano: 2026, mes: 7 } })).dataConfirmada).toBe(false);
  });
});
