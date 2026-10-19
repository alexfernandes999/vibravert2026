import { FRASE_ANALISE_FISICA, type Documento } from "@/lib/regras/documentos";
import { NOME_MODELO, type Faixa, type Modelo } from "@/lib/regras/tipos";
import { textoGarantia } from "@/lib/regras/garantia-modelo";
import type { Sinal } from "@/lib/regras/triagem";
import type { Texto } from "./claude";

/**
 * Conteúdo de um laudo, como fica gravado (laudos.conteudo) e como vira PDF.
 *
 * Fica gravado inteiro, e não montado na hora: o laudo liberado não muda (o
 * banco recusa), e o PDF baixado daqui a um ano tem que ser o mesmo de hoje.
 */
export type ConteudoLaudo = {
  tipo: Documento["tipo"] | "bancada";
  banner: "azul" | "vermelho";
  titulo: string;
  protocolo: string;
  dataAnalise: string;
  proprietario: { nome: string; documento: string; telefone: string };
  compra: { nf: string; data: string | null; faixa: string; canal: string };
  produto: { modelo: string; tensao: string | null; serie: string | null; garantia: string | null };
  resultado: string;
  fundamentacao: string;
  conclusao: string;
  frete: string;
  pontosAVerificar: string[];
  anexos: Documento["anexos"];
  frase: string;
};

export const ROTULO_FAIXA: Record<Faixa, string> = {
  arrependimento: "Arrependimento (até 7 dias, sem uso)",
  marketplace_30: "Marketplace até 30 dias",
  troca_expressa: "Troca Expressa (1 a 30 dias, compra no site)",
  normal_31_90: "31 a 90 dias",
  normal_91: "91 dias ou mais",
  indefinida: "A confirmar",
};

const TITULO: Record<ConteudoLaudo["tipo"], string> = {
  autorizacao_troca: "Autorização de Troca Expressa",
  aprovacao_31_90: "Aprovação para envio",
  aprovacao_91: "Aprovação para envio",
  negativa: "Negativa de garantia",
  recusa: "Recusa de Troca Expressa",
  bancada: "Laudo de bancada",
};

const RESULTADO: Record<ConteudoLaudo["tipo"], string> = {
  autorizacao_troca: "Troca Expressa autorizada, sujeita à avaliação técnica na chegada.",
  aprovacao_31_90: "Aprovado para envio à assistência técnica.",
  aprovacao_91: "Aprovado para envio à assistência técnica.",
  negativa: "Garantia negada na análise preliminar.",
  recusa: "Troca Expressa recusada na análise preliminar.",
  bancada: "",
};

export function mascararDocumento(d: string) {
  return d.length === 11
    ? `***.${d.slice(3, 6)}.${d.slice(6, 9)}-**`
    : `${d.slice(0, 2)}.***.***/${d.slice(8, 12)}-**`;
}

const dataBR = (iso: string) => iso.split("-").reverse().join("/");

export function montarLaudo(a: {
  documento: Documento;
  protocolo: string;
  hoje: string;
  chamado: {
    nome: string;
    documento: string;
    telefone: string;
    nfTexto: string;
    emissao: string | null;
    canal: string;
    faixa: Faixa;
    modelo: string | null;
    tensao: string | null;
    serie: string | null;
  };
  texto: Texto;
  pontos: Sinal[];
}): ConteudoLaudo {
  const c = a.chamado;
  const modelo = c.modelo && c.modelo in NOME_MODELO ? (c.modelo as Modelo) : null;
  return {
    tipo: a.documento.tipo,
    banner: a.documento.banner,
    titulo: TITULO[a.documento.tipo],
    protocolo: a.protocolo,
    dataAnalise: dataBR(a.hoje),
    proprietario: { nome: c.nome, documento: mascararDocumento(c.documento), telefone: c.telefone },
    compra: { nf: c.nfTexto, data: c.emissao ? dataBR(c.emissao) : null, faixa: ROTULO_FAIXA[c.faixa], canal: c.canal },
    produto: {
      modelo: modelo ? NOME_MODELO[modelo] : "não informado",
      tensao: c.tensao ? `${c.tensao} V` : null,
      serie: c.serie || null,
      garantia: modelo ? textoGarantia(modelo) : null,
    },
    resultado: RESULTADO[a.documento.tipo],
    fundamentacao: a.texto.fundamentacao,
    conclusao: a.texto.conclusao,
    frete: a.documento.frete,
    pontosAVerificar: a.pontos.map((p) => p.texto),
    anexos: a.documento.anexos,
    frase: FRASE_ANALISE_FISICA,
  };
}
