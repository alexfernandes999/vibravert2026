import { describe, expect, it } from "vitest";
import { detectarGatilhos, respostaAutomaticaBloqueada } from "./escalonamento";

const g = (texto: string, reclamacaoAnterior = false) => detectarGatilhos({ texto, reclamacaoAnterior });

describe("escalonamento bloqueia a resposta automática", () => {
  it.each([
    ["A lei me garante 90 dias de garantia", "cita_lei"],
    ["pelo código de defesa do consumidor vocês têm que pagar", "cita_lei"],
    ["vou abrir reclamação no Procon", "procon_reclame_aqui"],
    ["vou colocar no Reclame Aqui", "procon_reclame_aqui"],
    ["meu advogado vai entrar em contato", "advogado_juizado"],
    ["vou entrar no juizado de pequenas causas", "advogado_juizado"],
    ["não vou pagar o frete de jeito nenhum", "recusa_frete"],
    ["não concordo com isso", "contesta"],
    ["vou expor vocês nas redes sociais", "tom_alterado"],
    ["ISSO É UM ABSURDO QUERO MEU DINHEIRO DE VOLTA", "tom_alterado"],
  ])('"%s" → %s', (texto, gatilho) => {
    expect(g(texto)).toContain(gatilho);
  });

  it("reclamação anterior do mesmo produto escala mesmo com texto educado", () => {
    expect(g("Bom dia, a bomba parou de novo", true)).toEqual(["reclamacao_anterior"]);
  });

  it("mensagem comum não escala", () => {
    expect(respostaAutomaticaBloqueada({ texto: "Bom dia, gostaria de saber o status do meu chamado AT-2026-000123", reclamacaoAnterior: false })).toBe(false);
    expect(g("A bomba liga mas não puxa água, o leite de casa até azedou")).toEqual([]);
  });
});
