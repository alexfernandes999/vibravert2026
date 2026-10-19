import { describe, expect, it } from "vitest";
import { decidir, precisaAnaliseDeFotos, type EntradaLiberacao } from "./liberacao";
import { resumirLista, ITENS_LISTA_FECHADA, type AvaliacaoItem } from "./lista-fechada";
import type { ResultadoFaixa } from "./faixas";
import type { Sinal } from "./triagem";

const limpa = resumirLista(
  ITENS_LISTA_FECHADA.map((item): AvaliacaoItem => ({ item, resultado: "nao_encontrado", foto_ref: "frente", motivo_inconclusivo: null })),
);
const com = (item: AvaliacaoItem["item"], resultado: AvaliacaoItem["resultado"]) =>
  resumirLista(limpa.itens.map((i) => (i.item === item ? { ...i, resultado } : i)));

const faixa = (f: ResultadoFaixa["faixa"], o: Partial<ResultadoFaixa> = {}): ResultadoFaixa => ({
  faixa: f,
  dias: { min: 10, max: 10 },
  dataConfirmada: true,
  canalConfirmado: true,
  ...o,
});
const VERMELHO: Sinal = { codigo: "a_seco", nivel: "vermelho", texto: "a seco" };
const AMARELO: Sinal = { codigo: "agua_areia", nivel: "amarelo", texto: "areia" };

const e = (o: Partial<EntradaLiberacao> = {}): EntradaLiberacao => ({
  faixa: faixa("normal_31_90"),
  envio: "2026-10-19",
  modelo: "vv900",
  emissaoExata: "2026-08-01",
  faltando: [],
  sinais: [],
  lista: limpa,
  conferirAprovacoes: false,
  ...o,
});

describe("liberação automática", () => {
  it("31–90 sem sinal vermelho e lista limpa → aprova sozinho", () => {
    const d = decidir(e({ sinais: [AMARELO] }));
    expect(d.rota).toBe("automatica");
    expect(d.sugestao).toBe("aprovacao");
    expect(d.pontosAVerificar).toEqual([AMARELO]);
    expect(d.documento?.tipo).toBe("aprovacao_31_90");
    expect(d.documento?.anexos).toEqual(["frete", "termo"]);
  });
  it("Troca Expressa limpa → autoriza, anexo só o Termo", () => {
    const d = decidir(e({ faixa: faixa("troca_expressa") }));
    expect(d.rota).toBe("automatica");
    expect(d.acao).toBe("autorizar_troca");
    expect(d.documento?.anexos).toEqual(["termo"]);
  });
  it("fase de conferência manda até a aprovação para a fila", () => {
    expect(decidir(e({ conferirAprovacoes: true })).rota).toBe("fila_humana");
  });
  it("falta foto → pede ao cliente, automático", () => {
    const d = decidir(e({ faltando: ["foto do cabo e emenda"] }));
    expect(d.rota).toBe("automatica");
    expect(d.acao).toBe("pedir_informacao");
  });
  it("marketplace e arrependimento → saem sem análise e sem IA", () => {
    expect(decidir(e({ faixa: faixa("marketplace_30"), lista: null })).acao).toBe("orientar_marketplace");
    expect(decidir(e({ faixa: faixa("arrependimento"), lista: null })).acao).toBe("arrependimento");
    expect(precisaAnaliseDeFotos(faixa("marketplace_30"), [])).toBe(false);
    expect(precisaAnaliseDeFotos(faixa("arrependimento"), [])).toBe(false);
    expect(precisaAnaliseDeFotos(faixa("normal_31_90"), ["foto"])).toBe(false);
    expect(precisaAnaliseDeFotos(faixa("normal_31_90"), [])).toBe(true);
  });
});

describe("fila humana: negativa e recusa nunca saem sozinhas", () => {
  it("31–90 com sinal vermelho → fila, sugestão negativa", () => {
    const d = decidir(e({ sinais: [VERMELHO] }));
    expect(d.rota).toBe("fila_humana");
    expect(d.sugestao).toBe("negativa");
    expect(d.documento?.banner).toBe("vermelho");
  });
  it("Troca Expressa com sinal vermelho → NÃO nega: autoriza e leva para a bancada", () => {
    const d = decidir(e({ faixa: faixa("troca_expressa"), sinais: [VERMELHO, AMARELO] }));
    expect(d.rota).toBe("automatica");
    expect(d.sugestao).toBe("autorizacao");
    expect(d.pontosAVerificar).toEqual([VERMELHO, AMARELO]);
  });
  it("Troca Expressa com item da lista encontrado → fila, sugestão recusa, só Termo", () => {
    const d = decidir(e({ faixa: faixa("troca_expressa"), lista: com("cabo_cortado", "encontrado") }));
    expect(d.rota).toBe("fila_humana");
    expect(d.sugestao).toBe("recusa");
    expect(d.documento?.anexos).toEqual(["termo"]);
  });
  it("31–90 com item encontrado → fila, sugestão negativa", () => {
    const d = decidir(e({ lista: com("bomba_outra_marca", "encontrado") }));
    expect(d.rota).toBe("fila_humana");
    expect(d.sugestao).toBe("negativa");
  });
  it("inconclusivo nunca vira recusa: fila para revisar", () => {
    const d = decidir(e({ faixa: faixa("troca_expressa"), lista: com("produto_violado", "inconclusivo") }));
    expect(d.rota).toBe("fila_humana");
    expect(d.sugestao).toBe("revisar");
  });
  it("item que a IA não devolveu conta como inconclusivo", () => {
    const parcial = resumirLista(limpa.itens.filter((i) => i.item !== "carcaca_quebrada_impacto"));
    expect(parcial.inconclusivos).toEqual(["carcaca_quebrada_impacto"]);
    expect(decidir(e({ lista: parcial })).sugestao).toBe("revisar");
  });
  it("análise de fotos falhou → fila, nunca inventa resultado", () => {
    const d = decidir(e({ lista: null }));
    expect(d.rota).toBe("fila_humana");
    expect(d.motivos).toContain("Análise das fotos indisponível");
  });
  it("data não confirmada → fila", () => {
    expect(decidir(e({ faixa: faixa("indefinida", { dataConfirmada: false }) })).rota).toBe("fila_humana");
  });
  it("Troca Expressa com canal não confirmado → fila", () => {
    expect(decidir(e({ faixa: faixa("troca_expressa", { canalConfirmado: false }) })).rota).toBe("fila_humana");
  });
  it("pendência de regra → fila com o motivo", () => {
    const d = decidir(e({ faixa: faixa("indefinida", { pendencia: "regra_futura" }) }));
    expect(d.rota).toBe("fila_humana");
    expect(d.motivos[0]).toMatch(/Regra não definida/);
  });
});

describe("91+ dias: garantia longa do modelo", () => {
  it("Vibra Vert 900 com 1 ano → dentro do motor e carcaça, aprova", () => {
    const d = decidir(e({ faixa: faixa("normal_91"), modelo: "vv900", emissaoExata: "2025-10-19" }));
    expect(d.rota).toBe("automatica");
    expect(d.documento?.tipo).toBe("aprovacao_91");
  });
  it("Rymer 1500 com 8 meses → fora do prazo do motor: sugere negativa, só uma pessoa confirma", () => {
    const d = decidir(e({ faixa: faixa("normal_91"), modelo: "r1500", emissaoExata: "2026-02-10" }));
    expect(d.rota).toBe("fila_humana");
    expect(d.sugestao).toBe("negativa");
    expect(d.motivos[0]).toMatch(/Fora do prazo/);
    expect(d.documento?.tipo).toBe("negativa");
  });
  it("sem data exata de emissão → fila", () => {
    expect(decidir(e({ faixa: faixa("normal_91"), emissaoExata: null })).rota).toBe("fila_humana");
  });
});
