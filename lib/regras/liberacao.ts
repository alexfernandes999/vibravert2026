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
   * Conferência humana de tudo: nenhuma resposta sai para o cliente sem o
   * técnico revisar · nem aprovação, nem arrependimento, nem orientação de
   * marketplace, nem pedido de foto (decisão da diretoria, 12/11/2026). O motor
   * continua decidindo na hora; a decisão fica como sugestão na fila.
   */
  conferenciaHumana: boolean;
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
  const d = motor(e);
  if (!e.conferenciaHumana || d.rota === "fila_humana") return d;
  return { ...d, rota: "fila_humana", motivos: [...d.motivos, "Conferência humana: o técnico revisa antes de sair para o cliente"] };
}

function motor(e: EntradaLiberacao): Decisao {
  const f = e.faixa;

  // ── desvio cedo: o código resolve sozinho ──────────────────────
  if (f.faixa === "arrependimento")
    return { rota: "automatica", acao: "arrependimento", sugestao: "arrependimento", motivos: ["Até 7 dias do recebimento, sem uso"], pontosAVerificar: [], documento: null };
  if (f.faixa === "marketplace_30")
    return { rota: "automatica", acao: "orientar_marketplace", sugestao: "orientacao_marketplace", motivos: ["Compra em marketplace há até 30 dias"], pontosAVerificar: [], documento: null };

  if (f.pendencia) return fila("revisar", [`Regra não definida: ${(PENDENCIAS as Record<string, string>)[f.pendencia] ?? f.pendencia}`], e);

  // ── falta foto ou dado: pede ao cliente ────────────────────────
  if (e.faltando.length)
    return { rota: "automatica", acao: "pedir_informacao", sugestao: "pedido_informacao", motivos: e.faltando.map((x) => `Falta: ${x}`), pontosAVerificar: [], documento: null };

  // ── data e canal precisam estar confirmados ────────────────────
  if (!f.dataConfirmada || f.faixa === "indefinida") return fila("revisar", ["Data da compra não confirmada"], e);
  if (f.faixa === "troca_expressa" && !f.canalConfirmado) return fila("revisar", ["Canal da compra não confirmado"], e);

  // ── garantia longa: motor e carcaça no prazo do modelo ─────────
  if (f.faixa === "normal_91") {
    if (!e.modelo || !e.emissaoExata) return fila("revisar", ["Modelo ou data exata de emissão não confirmados"], e);
    // Fora do prazo do motor e da carcaça: sugere negativa por prazo, e uma
    // pessoa confirma (o banco não deixa sair sem ela).
    const cob = cobertura(e.modelo, e.emissaoExata, e.envio);
    if (!cob.motorCarcaca)
      return fila("negativa", [`Fora do prazo de garantia do motor e da carcaça (até ${cob.fimMotorCarcaca.split("-").reverse().join("/")})`], e, {
        documento: documentoPara(f.faixa, "desfavoravel"),
      });
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
    rota: "automatica",
    acao: troca ? "autorizar_troca" : "aprovar_envio",
    sugestao: troca ? "autorizacao" : "aprovacao",
    motivos: [],
    pontosAVerificar: pontos,
    documento: documentoPara(f.faixa, "favoravel"),
  };
}
