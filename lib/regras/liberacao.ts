import { cobertura } from "./garantia-modelo";
import type { ResultadoFaixa } from "./faixas";
import { PENDENCIAS } from "./pendencias";
import type { ResumoLista } from "./lista-fechada";
import { amarelos, vermelhos, type Sinal } from "./triagem";
import { documentoPara, type Documento } from "./documentos";
import type { DataISO, Modelo } from "./tipos";

export type Acao =
  | "arrependimento"
  | "orientar_marketplace"
  | "pedir_informacao"
  | "autorizar_troca"
  | "aprovar_envio"
  | "revisar";

/** O que o motor sugere. Negativa e recusa só saem depois de uma pessoa. */
export type Sugestao =
  | "arrependimento"
  | "orientacao_marketplace"
  | "pedido_informacao"
  | "autorizacao"
  | "aprovacao"
  | "negativa"
  | "recusa"
  | "revisar";

export type EntradaLiberacao = {
  faixa: ResultadoFaixa;
  envio: DataISO;
  modelo: Modelo | null;
  /** Emissão com dia exato · só ela confirma a garantia longa. */
  emissaoExata: DataISO | null;
  /** Fotos ou dados que faltam. Vazio = completo. */
  faltando: string[];
  sinais: Sinal[];
  /** Lista fechada vinda das fotos. `null` quando a análise não rodou ou falhou. */
  lista: ResumoLista | null;
  /**
   * Fase de conferência: o operador revisa também as aprovações automáticas
   * antes de liberar a automação total (recomendação do briefing).
   */
  conferirAprovacoes: boolean;
};

export type Decisao = {
  rota: "automatica" | "fila_humana";
  acao: Acao;
  sugestao: Sugestao;
  motivos: string[];
  /** Vai para a bancada como ponto a verificar. */
  pontosAVerificar: Sinal[];
  documento: Documento | null;
};

const fila = (sugestao: Sugestao, motivos: string[], e: EntradaLiberacao, extra: Partial<Decisao> = {}): Decisao => ({
  rota: "fila_humana",
  acao: "revisar",
  sugestao,
  motivos,
  pontosAVerificar: e.sinais,
  documento: null,
  ...extra,
});

/** A análise de fotos é necessária? Fora destes casos, não se chama a IA. */
export function precisaAnaliseDeFotos(faixa: ResultadoFaixa, faltando: string[]): boolean {
  if (faixa.faixa === "arrependimento" || faixa.faixa === "marketplace_30") return false;
  if (faltando.length) return false;
  return faixa.faixa === "troca_expressa" || faixa.faixa === "normal_31_90" || faixa.faixa === "normal_91";
}

export function decidir(e: EntradaLiberacao): Decisao {
  const f = e.faixa;

  // ── desvio cedo: o código resolve sozinho ──────────────────────
  if (f.faixa === "arrependimento")
    return { rota: "automatica", acao: "arrependimento", sugestao: "arrependimento", motivos: ["Até 7 dias do recebimento, sem uso"], pontosAVerificar: [], documento: null };
  if (f.faixa === "marketplace_30")
    return { rota: "automatica", acao: "orientar_marketplace", sugestao: "orientacao_marketplace", motivos: ["Compra em marketplace há até 30 dias"], pontosAVerificar: [], documento: null };

  if (f.pendencia) return fila("revisar", [`Regra não definida: ${PENDENCIAS[f.pendencia]}`], e);

  // ── falta foto ou dado: pede ao cliente ────────────────────────
  if (e.faltando.length)
    return { rota: "automatica", acao: "pedir_informacao", sugestao: "pedido_informacao", motivos: e.faltando.map((x) => `Falta: ${x}`), pontosAVerificar: [], documento: null };

  // ── data e canal precisam estar confirmados ────────────────────
  if (!f.dataConfirmada || f.faixa === "indefinida") return fila("revisar", ["Data da compra não confirmada"], e);
  if (f.faixa === "troca_expressa" && !f.canalConfirmado) return fila("revisar", ["Canal da compra não confirmado"], e);

  // ── garantia longa: motor e carcaça no prazo do modelo ─────────
  if (f.faixa === "normal_91") {
    if (!e.modelo || !e.emissaoExata) return fila("revisar", ["Modelo ou data exata de emissão não confirmados"], e);
    if (!cobertura(e.modelo, e.emissaoExata, e.envio).motorCarcaca)
      return fila("revisar", [`Regra não definida: ${PENDENCIAS.fora_da_garantia_longa}`], e);
  }

  // ── lista fechada ─────────────────────────────────────────────
  if (!e.lista) return fila("revisar", ["Análise das fotos indisponível"], e);

  const troca = f.faixa === "troca_expressa";
  if (e.lista.encontrados.length)
    return fila(troca ? "recusa" : "negativa", e.lista.encontrados.map((i) => `Lista fechada: ${i}`), e, {
      documento: documentoPara(f.faixa, "desfavoravel"),
    });
  if (e.lista.inconclusivos.length)
    return fila("revisar", e.lista.inconclusivos.map((i) => `Identificação inconclusiva: ${i}`), e);

  // ── sinais da triagem ─────────────────────────────────────────
  // Na Troca Expressa o vermelho não nega: vira ponto a verificar na bancada.
  const red = vermelhos(e.sinais);
  if (!troca && red.length)
    return fila("negativa", red.map((s) => s.texto), e, { documento: documentoPara(f.faixa, "desfavoravel") });

  const pontos = troca ? [...red, ...amarelos(e.sinais)] : amarelos(e.sinais);
  return {
    rota: e.conferirAprovacoes ? "fila_humana" : "automatica",
    acao: troca ? "autorizar_troca" : "aprovar_envio",
    sugestao: troca ? "autorizacao" : "aprovacao",
    motivos: e.conferirAprovacoes ? ["Fase de conferência: aprovação revisada pelo operador"] : [],
    pontosAVerificar: pontos,
    documento: documentoPara(f.faixa, "favoravel"),
  };
}
