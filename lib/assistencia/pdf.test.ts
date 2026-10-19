import { describe, expect, it } from "vitest";
import { gerarPdfLaudo } from "./pdf";
import { montarLaudo } from "./laudo";
import { documentoPara } from "@/lib/regras/documentos";

const chamado = { nome: "Cliente Exemplo", documento: "52998224725", telefone: "11999990000", nfTexto: "119876", emissao: "2026-08-20", canal: "site", faixa: "normal_31_90" as const, modelo: "vv900", tensao: "220", serie: "25271/19" };
const texto = { fundamentacao: "Respostas dentro do manual e fotos sem itens da lista fechada.", conclusao: "Aprovado o envio para avaliação técnica na fábrica.", mensagem_cliente: "x" };

describe("PDF do laudo", () => {
  it("aprovação 31–90: laudo, envio, frete e termo (4 páginas)", async () => {
    const l = montarLaudo({ documento: documentoPara("normal_31_90", "favoravel")!, protocolo: "AT-2026-000123", hoje: "2026-10-19", chamado, texto, pontos: [{ codigo: "agua_areia", nivel: "amarelo", texto: "Água com areia ou barro" }] });
    const pdf = await gerarPdfLaudo(l);
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect((pdf.toString("latin1").match(/\/Type \/Page\b/g) ?? []).length).toBe(4);
    if (process.env.PDF_SAIDA) (await import("node:fs")).writeFileSync(process.env.PDF_SAIDA, pdf);
  }, 30_000);

  it("recusa na Troca Expressa: faixa vermelha, só o Termo (3 páginas)", async () => {
    const l = montarLaudo({ documento: documentoPara("troca_expressa", "desfavoravel")!, protocolo: "AT-2026-000124", hoje: "2026-10-19", chamado: { ...chamado, faixa: "troca_expressa" }, texto, pontos: [] });
    expect(l.banner).toBe("vermelho");
    const pdf = await gerarPdfLaudo(l);
    expect((pdf.toString("latin1").match(/\/Type \/Page\b/g) ?? []).length).toBe(3);
  }, 30_000);
});
