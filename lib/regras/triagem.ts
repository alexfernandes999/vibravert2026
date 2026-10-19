import type { Tensao } from "./tipos";

/**
 * Respostas da etapa de instalação.
 *
 * Os códigos não carregam os limites do manual: quem monta a tela escolhe o
 * rótulo, e o motor decide o sinal.
 */
export type Respostas = {
  tensaoBomba: Tensao;
  tempo: "ate15" | "15a30" | "30a45" | "45a60" | "mais60" | "ns";
  /** Só quando `tempo` é "mais60". */
  tempoMinutos: number | null;
  rede: Tensao | "ns";
  submersa: "sim" | "nao" | "ns";
  distancia: "mais40" | "20a40" | "menos20" | "ns";
  sustentacao: "corda" | "cabo" | "ns";
  emenda: "autofusao" | "comum" | "sem" | "ns";
  agua: "limpa" | "areia" | "ns";
  energia: "nao" | "sim" | "ns";
};

export type Sinal = { codigo: string; nivel: "vermelho" | "amarelo"; texto: string };

/** Limite do manual por ciclo. */
export const TEMPO_LIMITE_MIN = 45;
/**
 * A partir daqui é "muito acima" (vermelho). O número vem do protótipo; os
 * documentos só dizem "muito acima" e "um pouco acima".
 */
export const TEMPO_VERMELHO_MIN = 90;

const NAO_SEI: Record<string, string> = {
  tempo: "tempo ligada",
  rede: "tensão da tomada",
  submersa: "submersão",
  distancia: "distância do fundo",
  sustentacao: "sustentação",
  emenda: "emenda do fio",
  agua: "tipo de água",
  energia: "energia do local",
};

/** Sinais da triagem. Verde é a ausência de sinais. */
export function triagem(r: Respostas): Sinal[] {
  const s: Sinal[] = [];
  const v = (codigo: string, texto: string) => s.push({ codigo, nivel: "vermelho", texto });
  const a = (codigo: string, texto: string) => s.push({ codigo, nivel: "amarelo", texto });

  // ── vermelhos ──────────────────────────────────────────────────
  if (r.submersa === "nao") v("a_seco", "Relato de que a bomba às vezes ficava fora d'água (funcionamento a seco)");
  if (r.rede !== "ns" && r.rede !== r.tensaoBomba)
    v("tensao_incompativel", `Bomba de ${r.tensaoBomba} V ligada em rede de ${r.rede} V`);
  if (r.sustentacao === "cabo") v("sustentacao_pelo_cabo", "Bomba pendurada pelo fio elétrico, sem corda de sustentação");
  if (r.distancia === "menos20") v("distancia_menos_20", "Distância do fundo declarada abaixo de 20 cm (mínimo do manual: 40 cm)");
  if (r.tempo === "mais60" && r.tempoMinutos !== null && r.tempoMinutos > TEMPO_VERMELHO_MIN)
    v("tempo_muito_acima", `Uso de cerca de ${r.tempoMinutos} min por vez (limite do manual: ${TEMPO_LIMITE_MIN} min)`);

  // ── amarelos ───────────────────────────────────────────────────
  if (r.distancia === "20a40") a("distancia_20_40", "Distância do fundo entre 20 e 40 cm");
  if (r.agua === "areia") a("agua_areia", "Água com areia ou barro");
  if (r.emenda === "comum") a("emenda_fita_comum", "Emenda feita só com fita isolante comum");
  if (r.energia === "sim") a("energia_oscila", "Relato de queda ou oscilação de energia");
  if (r.tempo === "45a60") a("tempo_pouco_acima", "Uso entre 45 min e 1 hora por vez, acima do limite do manual");
  if (r.tempo === "mais60") {
    if (r.tempoMinutos === null) a("tempo_ambiguo", "Mais de 1 hora por vez, sem os minutos informados");
    else if (r.tempoMinutos <= TEMPO_VERMELHO_MIN)
      a("tempo_pouco_acima", `Uso de cerca de ${r.tempoMinutos} min por vez, acima do limite do manual`);
  }
  for (const [k, rotulo] of Object.entries(NAO_SEI)) {
    if (r[k as keyof Respostas] === "ns") a(`nao_sei_${k}`, `Resposta "não sei" sobre ${rotulo}`);
  }

  return s;
}

export const vermelhos = (s: Sinal[]) => s.filter((x) => x.nivel === "vermelho");
export const amarelos = (s: Sinal[]) => s.filter((x) => x.nivel === "amarelo");
