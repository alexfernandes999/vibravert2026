import type { StatusChamado } from "@prisma/client";

export const ROTULO_STATUS: Record<StatusChamado, { r: string; cor: string }> = {
  ANALISANDO: { r: "Analisando", cor: "bg-superficie-2 text-tinta-2" },
  PENDENTE_INFORMACAO: { r: "Pendente: falta foto/dado", cor: "bg-atencao/10 text-atencao" },
  EM_ANALISE: { r: "Na fila", cor: "bg-marca-suave text-marca" },
  AGUARDANDO_ENVIO: { r: "Aguardando envio", cor: "bg-bom-suave text-bom" },
  A_CAMINHO: { r: "A caminho", cor: "bg-bom-suave text-bom" },
  NA_BANCADA: { r: "Na bancada", cor: "bg-ouro/20 text-ouro-txt" },
  CONCLUIDO: { r: "Concluído", cor: "bg-superficie-2 text-tinta-2" },
  NEGADO: { r: "Negado", cor: "bg-critico/10 text-critico" },
  RECUSADO: { r: "Recusado", cor: "bg-critico/10 text-critico" },
  ORIENTADO_MARKETPLACE: { r: "Marketplace", cor: "bg-superficie-2 text-tinta-2" },
  ARREPENDIMENTO: { r: "Arrependimento", cor: "bg-superficie-2 text-tinta-2" },
  ENCERRADO: { r: "Encerrado", cor: "bg-superficie-2 text-mudo" },
};

export const ROTULO_SUGESTAO: Record<string, string> = {
  aprovacao: "Aprovar",
  autorizacao: "Autorizar",
  negativa: "Negativa",
  recusa: "Recusa",
  revisar: "Revisar",
  pedido_informacao: "Pedir informação",
  arrependimento: "Arrependimento",
  orientacao_marketplace: "Marketplace",
};

/**
 * SLA da fila: 24 h úteis (um dia útil), segunda a sexta. Entrou na sexta
 * à tarde, vence na segunda à tarde. Feriados ficam de fora por ora.
 */
export function prazoSLA(entrada: Date): Date {
  const d = new Date(entrada);
  let faltam = 1;
  while (faltam > 0) {
    d.setUTCDate(d.getUTCDate() + 1);
    const dia = new Date(d.getTime() - 3 * 3600_000).getUTCDay(); // São Paulo
    if (dia !== 0 && dia !== 6) faltam--;
  }
  return d;
}

export function horasRestantes(prazo: Date, agora = new Date()) {
  return Math.round((prazo.getTime() - agora.getTime()) / 3600_000);
}

/** Bancada: laudo em até 48 h da chegada. */
export const prazoBancada = (recebido: Date) => new Date(recebido.getTime() + 48 * 3600_000);
