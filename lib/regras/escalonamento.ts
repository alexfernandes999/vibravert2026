/**
 * Gatilhos de escalonamento (Garantia_Prazos_e_Faixas.md, seção 4).
 *
 * Havendo qualquer gatilho, a resposta automática fica BLOQUEADA: a IA não
 * argumenta, não repete a regra e passa para uma pessoa. É bloqueio em código,
 * não pedido educado no prompt.
 *
 * Erra de propósito para o lado de escalar: um falso positivo custa um
 * atendente lendo uma mensagem; um falso negativo pode virar processo.
 */
export type Gatilho =
  | "cita_lei"
  | "procon_reclame_aqui"
  | "advogado_juizado"
  | "recusa_frete"
  | "contesta"
  | "reclamacao_anterior"
  | "tom_alterado";

const PADROES: [Gatilho, RegExp][] = [
  ["cita_lei", /\b(c[oó]digo de defesa|cdc|lei\b|leis\b|direito do consumidor|meus direitos|art(igo)?\.? ?\d+|90 dias de garantia|garantia legal)/i],
  ["procon_reclame_aqui", /\b(procon|reclame ?aqui|consumidor\.gov)/i],
  ["advogado_juizado", /\b(advogad[oa]|juizado|pequenas causas|process(o|ar|ando)|justi[cç]a|judicial|a[cç][aã]o judicial)/i],
  ["recusa_frete", /(n[aã]o vou pagar|n[aã]o pago|n[aã]o aceito pagar|recuso.{0,20}pagar|por que (eu )?(tenho|devo) pagar).{0,40}(frete|envio|correio|postagem)|(frete|envio).{0,30}(absurdo|n[aã]o (vou|pago|aceito))/i],
  ["contesta", /\b(n[aã]o concordo|discordo|inaceit[aá]vel|absurdo|isso [eé] um absurdo|que palha[cç]ada|descaso)/i],
  ["tom_alterado", /\b(vou expor|redes sociais|vou (postar|divulgar)|nunca mais compro|lixo|vergonha|ladr[aã]o|ladr[oõ]es|golpe|enganad[oa]|safad)/i],
];

export type EntradaEscalonamento = {
  texto: string;
  /** Já houve chamado anterior para o mesmo produto (série, NF ou CPF + modelo). */
  reclamacaoAnterior: boolean;
};

function gritando(texto: string) {
  const letras = texto.replace(/[^A-Za-zÀ-ÿ]/g, "");
  return letras.length >= 20 && letras === letras.toUpperCase() && /[A-Z]/.test(letras);
}

export function detectarGatilhos(e: EntradaEscalonamento): Gatilho[] {
  const achados = new Set<Gatilho>();
  for (const [g, re] of PADROES) if (re.test(e.texto)) achados.add(g);
  if (gritando(e.texto) || /!{3,}/.test(e.texto)) achados.add("tom_alterado");
  if (e.reclamacaoAnterior) achados.add("reclamacao_anterior");
  return [...achados];
}

export const respostaAutomaticaBloqueada = (e: EntradaEscalonamento) => detectarGatilhos(e).length > 0;

/** O que a IA pode dizer quando escala: nada além disto. */
export const MENSAGEM_ESCALONAMENTO =
  "Entendo. Vou passar o seu caso agora para um atendente da nossa equipe, que vai te retornar ainda hoje.";
