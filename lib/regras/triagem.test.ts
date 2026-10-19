import { describe, expect, it } from "vitest";
import { triagem, vermelhos, amarelos, type Respostas } from "./triagem";

const verde: Respostas = {
  tensaoBomba: "220",
  tempo: "15a30",
  tempoMinutos: null,
  rede: "220",
  submersa: "sim",
  distancia: "mais40",
  sustentacao: "corda",
  emenda: "autofusao",
  agua: "limpa",
  energia: "nao",
};
const cods = (r: Partial<Respostas>) => triagem({ ...verde, ...r }).map((s) => `${s.nivel}:${s.codigo}`);

describe("triagem", () => {
  it("tudo dentro do manual → nenhum sinal (verde)", () => {
    expect(triagem(verde)).toEqual([]);
  });

  it.each([
    [{ submersa: "nao" }, "vermelho:a_seco"],
    [{ rede: "127" }, "vermelho:tensao_incompativel"],
    [{ rede: "254" }, "vermelho:tensao_incompativel"],
    [{ sustentacao: "cabo" }, "vermelho:sustentacao_pelo_cabo"],
    [{ distancia: "menos20" }, "vermelho:distancia_menos_20"],
    [{ tempo: "mais60", tempoMinutos: 91 }, "vermelho:tempo_muito_acima"],
  ] as [Partial<Respostas>, string][])("vermelho: %o", (r, esperado) => {
    expect(cods(r)).toContain(esperado);
  });

  it.each([
    [{ distancia: "20a40" }, "amarelo:distancia_20_40"],
    [{ agua: "areia" }, "amarelo:agua_areia"],
    [{ emenda: "comum" }, "amarelo:emenda_fita_comum"],
    [{ energia: "sim" }, "amarelo:energia_oscila"],
    [{ tempo: "45a60" }, "amarelo:tempo_pouco_acima"],
    [{ tempo: "mais60", tempoMinutos: 90 }, "amarelo:tempo_pouco_acima"],
    [{ tempo: "mais60", tempoMinutos: null }, "amarelo:tempo_ambiguo"],
    [{ submersa: "ns" }, "amarelo:nao_sei_submersa"],
    [{ emenda: "ns" }, "amarelo:nao_sei_emenda"],
    [{ tempo: "ns" }, "amarelo:nao_sei_tempo"],
  ] as [Partial<Respostas>, string][])("amarelo: %o", (r, esperado) => {
    expect(cods(r)).toContain(esperado);
  });

  it("tensão igual à da rede não sinaliza, inclusive 254 V", () => {
    expect(triagem({ ...verde, tensaoBomba: "254", rede: "254" })).toEqual([]);
  });
  it("tomada 'não sei' é amarelo, não vermelho", () => {
    const s = triagem({ ...verde, rede: "ns" });
    expect(vermelhos(s)).toEqual([]);
    expect(amarelos(s).map((x) => x.codigo)).toEqual(["nao_sei_rede"]);
  });
  it("até 45 min não sinaliza", () => {
    expect(triagem({ ...verde, tempo: "30a45" })).toEqual([]);
  });
});
