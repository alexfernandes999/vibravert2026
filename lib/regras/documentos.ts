import type { Faixa } from "./tipos";

export type TipoDocumento = "autorizacao_troca" | "aprovacao_31_90" | "aprovacao_91" | "negativa" | "recusa";
export type Anexo = "frete" | "termo";

export type Documento = {
  tipo: TipoDocumento;
  anexos: Anexo[];
  banner: "azul" | "vermelho";
  /** O que o laudo diz sobre o frete. */
  frete: string;
};

/**
 * Documento de cada desfecho (Guia, seção 9).
 * Laudo de bancada não passa por aqui: não leva anexos.
 */
export function documentoPara(faixa: Faixa, desfecho: "favoravel" | "desfavoravel"): Documento | null {
  if (desfecho === "favoravel") {
    if (faixa === "troca_expressa")
      return { tipo: "autorizacao_troca", anexos: ["termo"], banner: "azul", frete: "Envio por conta da Vibra Vert, pela etiqueta de logística reversa." };
    if (faixa === "normal_31_90")
      return { tipo: "aprovacao_31_90", anexos: ["frete", "termo"], banner: "azul", frete: "Envio por conta do proprietário. Constatado defeito de fabricação, o reparo e o frete de volta são da Vibra Vert." };
    if (faixa === "normal_91")
      return { tipo: "aprovacao_91", anexos: ["frete", "termo"], banner: "azul", frete: "Envio e retorno por conta do proprietário. Constatado defeito de fabricação, o reparo é da Vibra Vert." };
    return null;
  }
  if (faixa === "troca_expressa")
    return { tipo: "recusa", anexos: ["termo"], banner: "vermelho", frete: "Caso queira a análise física, o envio é por conta do proprietário." };
  if (faixa === "normal_31_90" || faixa === "normal_91")
    return { tipo: "negativa", anexos: ["frete", "termo"], banner: "vermelho", frete: "Caso queira a análise física, o envio é por conta do proprietário." };
  return null;
}

/** Frase obrigatória em todo laudo. */
export const FRASE_ANALISE_FISICA =
  "Caso o proprietário discorde, pode enviar a bomba para análise física definitiva.";
