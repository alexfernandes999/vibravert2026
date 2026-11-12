/**
 * Roteiro da Vibrinha.
 *
 * Ela não diagnostica no escuro. Antes de falar de defeito, pergunta há quanto
 * tempo a bomba trabalha, o que exatamente acontece e se a compra foi conosco —
 * porque a resposta muda inteira conforme isso.
 *
 * Uma bomba de três meses que para é caso de garantia; uma de quatro anos é
 * desgaste normal de peça. Dizer "é o diafragma" antes de saber a idade é
 * chutar, e chute em bomba vira devolução e reclamação.
 *
 * Nada aqui é gerado na hora: cada resposta foi escrita e conferida contra as
 * embalagens do fabricante e as regras da loja.
 */

import { PRAZO_DESPACHO } from "@/lib/loja";

export type Opcao ={ rotulo: string; proximo: string };

export type No = {
  /** O que a Vibrinha fala ao chegar neste ponto. */
  fala: string[];
  /** Caminhos que o visitante pode seguir. */
  opcoes?: Opcao[];
  /** Link útil no fim da fala. */
  acao?: { rotulo: string; href: string };
  /** Encerra sugerindo o vendedor humano, levando o que já foi apurado. */
  encaminha?: boolean;
  /**
   * Abre as quatro perguntas da calculadora dentro da conversa: altura, cano,
   * poço e tensão. A primeira pergunta é a última linha de `fala`.
   */
  calcula?: boolean;
};

export const INICIO = "menu";

/** Saída para o canal de SAC: o formulário da assistência, com protocolo e resposta em 24 h. */
const ACAO_CHAMADO = { rotulo: "Abrir chamado de garantia", href: "/assistencia/garantia" };
const CHAMADO = "Se preferir, já abra o chamado pelo formulário: você recebe o protocolo na hora e a resposta em até 24 horas.";

/**
 * Opções do começo da conversa. Nas páginas da assistência, quem abre o chat
 * quase sempre está com problema: o chamado vem primeiro.
 */
export function opcoesDoInicio(caminho: string | null): Opcao[] {
  const base = ROTEIRO[INICIO].opcoes ?? [];
  if (!caminho?.startsWith("/assistencia")) return base;
  const chamado = base.find((o) => o.proximo === "assistencia");
  return chamado ? [chamado, ...base.filter((o) => o !== chamado)] : base;
}

export const ROTEIRO: Record<string, No> = {
  menu: {
    fala: ["Me conta o que você precisa:"],
    opcoes: [
      { rotulo: "Escolher a bomba certa", proximo: "escolher" },
      { rotulo: "Minha bomba parou", proximo: "parou_tempo" },
      { rotulo: "Abrir chamado na assistência", proximo: "assistencia" },
      { rotulo: "Garantia", proximo: "garantia_onde" },
      { rotulo: "Frete e prazo", proximo: "frete" },
      { rotulo: "Formas de pagamento", proximo: "pagamento" },
      { rotulo: "Peças de reposição", proximo: "pecas" },
    ],
  },

  // ── escolher a bomba ─────────────────────────────────────────
  escolher: {
    fala: [
      "Eu faço a conta com você. São quatro perguntas rápidas, e no fim te digo qual bomba serve e quanto ela entrega de água na sua casa.",
      "Primeiro: quantos metros a água precisa subir, do nível da água no poço até a caixa d'água? Pode ser aproximado.",
    ],
    calcula: true,
  },
  escolher_nao_sei: {
    fala: [
      "Sem problema. Meça a boca do poço com uma trena, por dentro: 6 polegadas dá uns 15 cm, 8 polegadas uns 20 cm.",
      "Se o poço for cacimbão ou cisterna, a boca é larga e qualquer modelo da linha entra.",
      "Se ainda ficar em dúvida, é melhor falar com um vendedor do que arriscar: bomba que não cabe não desce, e a troca depois é trabalhosa.",
    ],
    encaminha: true,
    opcoes: [{ rotulo: "Voltar ao início", proximo: "menu" }],
  },

  // ── bomba parou: qualificar antes de opinar ──────────────────
  parou_tempo: {
    fala: ["Vamos por partes. Há quanto tempo essa bomba está trabalhando?"],
    opcoes: [
      { rotulo: "Menos de 6 meses", proximo: "parou_nova" },
      { rotulo: "Entre 6 meses e 2 anos", proximo: "parou_meia" },
      { rotulo: "Mais de 2 anos", proximo: "parou_velha" },
    ],
  },
  parou_nova: {
    fala: [
      "Com menos de seis meses, isso não é desgaste normal. Pode ser defeito de fabricação, e nesse caso está na garantia.",
      "Me diz uma coisa antes: a compra foi aqui com a gente?",
    ],
    opcoes: [
      { rotulo: "Comprei com vocês", proximo: "parou_sintoma" },
      { rotulo: "Comprei em outro lugar", proximo: "parou_outro_lugar" },
    ],
  },
  parou_meia: {
    fala: [
      "Nessa faixa costuma ser peça de desgaste, não motor queimado. Diafragma e vedação trabalham o tempo todo e são feitos para serem trocados.",
      "A compra foi aqui com a gente?",
    ],
    opcoes: [
      { rotulo: "Comprei com vocês", proximo: "parou_sintoma" },
      { rotulo: "Comprei em outro lugar", proximo: "parou_outro_lugar" },
    ],
  },
  parou_velha: {
    fala: [
      "Com mais de dois anos, quase sempre é peça de desgaste — o que é normal e tem conserto. Fora da garantia de fábrica, mas com solução.",
      "Antes de eu falar besteira, me conta o que exatamente acontece:",
    ],
    opcoes: [
      { rotulo: "Liga, vibra, e não sobe água", proximo: "sintoma_nao_sobe" },
      { rotulo: "Só faz barulho", proximo: "sintoma_barulho" },
      { rotulo: "Não liga de jeito nenhum", proximo: "sintoma_nao_liga" },
    ],
  },
  parou_outro_lugar: {
    fala: [
      "Entendi. A garantia de fábrica vale independente de onde foi comprada, desde que dentro do prazo e com a nota fiscal.",
      "O que a gente não consegue é consultar o seu pedido aqui, porque ele não passou pela nossa loja. Nesse caso o caminho é falar direto com a assistência.",
      "Mas me conta o sintoma, que já adianto o que costuma ser:",
    ],
    opcoes: [
      { rotulo: "Liga, vibra, e não sobe água", proximo: "sintoma_nao_sobe" },
      { rotulo: "Só faz barulho", proximo: "sintoma_barulho" },
      { rotulo: "Não liga de jeito nenhum", proximo: "sintoma_nao_liga" },
    ],
  },
  parou_sintoma: {
    fala: ["Ótimo, aí eu consigo puxar o seu pedido depois. O que exatamente acontece?"],
    opcoes: [
      { rotulo: "Liga, vibra, e não sobe água", proximo: "sintoma_nao_sobe" },
      { rotulo: "Só faz barulho", proximo: "sintoma_barulho" },
      { rotulo: "Não liga de jeito nenhum", proximo: "sintoma_nao_liga" },
    ],
  },
  sintoma_nao_sobe: {
    fala: [
      "Liga e vibra, mas não sobe: na nossa bancada isso costuma ser diafragma gasto ou entrada entupida.",
      "Duas conferidas rápidas antes de qualquer coisa: veja se o nível do poço não baixou abaixo da bomba, e se a mangueira não está dobrada ou furada. Acontece mais do que parece.",
      "Se não for isso, é caso para o técnico ver. Não arrisque abrir sem saber o que procurar.",
      CHAMADO,
    ],
    acao: ACAO_CHAMADO,
    encaminha: true,
  },
  sintoma_barulho: {
    fala: [
      "Barulho sem bombear normalmente é peça interna gasta. O motor costuma estar bom.",
      "Uma pergunta importante: ela chegou a trabalhar sem água em algum momento? Rodar seca é o que mais mata bomba vibratória, e é justamente o que a boia de nível evita.",
      "De qualquer forma, esse caso o técnico precisa ouvir. Ele identifica pelo som na maioria das vezes.",
      CHAMADO,
    ],
    acao: ACAO_CHAMADO,
    encaminha: true,
  },
  sintoma_nao_liga: {
    fala: [
      "Se não liga, comece pela parte elétrica, que é onde está a causa em boa parte dos casos.",
      "Confira a tensão da tomada, se o disjuntor não desarmou, e principalmente a bitola do cabo: cabo fino demais para a distância derruba a tensão e a bomba não parte.",
      "Se a parte elétrica estiver certa e ela continuar sem responder, aí é bancada.",
      CHAMADO,
    ],
    acao: ACAO_CHAMADO,
    encaminha: true,
  },

  // ── assistência: o canal de SAC é o formulário (protocolo, fotos, resposta em 24 h) ──
  assistencia: {
    fala: [
      "A assistência técnica é nossa, na própria fábrica em São Paulo.",
      "Pelo formulário você abre o chamado em poucos minutos: seus dados, a nota fiscal e as fotos da bomba e do local. Você recebe o protocolo na hora e a resposta em até 24 horas, por e-mail.",
    ],
    acao: ACAO_CHAMADO,
    opcoes: [
      { rotulo: "Antes, quero entender o defeito", proximo: "parou_tempo" },
      { rotulo: "Voltar ao início", proximo: "menu" },
    ],
  },

  // ── garantia ─────────────────────────────────────────────────
  garantia_onde: {
    fala: ["Para eu te responder certo: a compra foi aqui na loja?"],
    opcoes: [
      { rotulo: "Comprei aqui no site", proximo: "garantia_aqui" },
      { rotulo: "Comprei em outro lugar", proximo: "garantia_fora" },
    ],
  },
  garantia_aqui: {
    fala: [
      "O prazo aparece na ficha técnica do modelo que você comprou, e vale contra defeito de fabricação no motor e na carcaça.",
      "As borrachas · canopla, ventosa, amortecedor e válvula · são peças de desgaste e têm 90 dias de garantia em todos os modelos.",
      "Para acionar, guarde a nota fiscal e o certificado que vem dentro da caixa: são eles que valem.",
      "O que não entra é mau uso, principalmente rodar sem água.",
      "Se a bomba deu problema, o caminho é o chamado: você preenche o formulário com a nota e as fotos, e a resposta sai em até 24 horas.",
    ],
    acao: ACAO_CHAMADO,
    opcoes: [{ rotulo: "Voltar ao início", proximo: "menu" }],
  },
  garantia_fora: {
    fala: [
      "A garantia de fábrica vale de qualquer forma, desde que dentro do prazo e com a nota fiscal em mãos.",
      "Como a compra não passou por aqui, eu não consigo ver o pedido. O caminho é a assistência, que é nossa e fica na própria fábrica.",
      CHAMADO,
    ],
    acao: ACAO_CHAMADO,
    encaminha: true,
  },

  // ── comercial ────────────────────────────────────────────────
  frete: {
    fala: [
      "O frete é calculado pelo seu CEP e aparece no carrinho antes de você finalizar.",
      "Entregamos nos 27 estados, e o frete é grátis em todas as bombas · sem valor mínimo.",
      `O pedido ${PRAZO_DESPACHO}. O prazo de entrega depende da região e aparece junto com o valor.`,
    ],
    acao: { rotulo: "Ver a linha completa", href: "/bombas" },
    opcoes: [{ rotulo: "Voltar ao início", proximo: "menu" }],
  },
  pagamento: {
    fala: [
      "PIX com 10% de desconto e aprovação na hora, cartão em até 10× sem juros, ou boleto.",
      "No PIX o pedido entra em separação assim que o pagamento cai. No boleto, depois da compensação, que leva até dois dias úteis.",
    ],
    opcoes: [{ rotulo: "Voltar ao início", proximo: "menu" }],
  },
  pecas: {
    fala: [
      "Trabalhamos com peças de reposição das nossas linhas: diafragma, vedação, boia de nível e kit de manutenção.",
      "Hoje o kit vai junto com a bomba nas versões que o incluem. Peça avulsa a gente resolve pelo atendimento, porque depende do modelo e do ano da sua bomba.",
      "Me diz o modelo que está na etiqueta e a gente vê o que serve.",
    ],
    encaminha: true,
  },
};
