"use server";

import { prisma } from "@/lib/prisma";
import { modelosDaCalculadora } from "@/lib/modelos-calculadora";
import { alturaTotal, recomendar } from "@/lib/recomendacao";

/**
 * Guarda a conversa que vai para o vendedor.
 *
 * Duas razões, e a segunda vale mais no longo prazo. A primeira é a venda: se
 * a pessoa sumir do WhatsApp, o que ela contou continua aqui. A segunda é o
 * roteiro · saber o que perguntam e onde desistem é o que diz qual pergunta
 * falta, e isso não se descobre imaginando.
 *
 * Nunca estoura: se o banco recusar, o cliente ainda tem de conseguir abrir o
 * WhatsApp. Perder o registro é chato; travar o atendimento é grave.
 */
export async function guardarConversa(dados: {
  nome?: string;
  dialogo: string;
  apurado?: string;
  origem?: string;
}) {
  try {
    await prisma.conversa.create({
      data: {
        nome: dados.nome?.slice(0, 80) || null,
        dialogo: dados.dialogo.slice(0, 8000),
        apurado: dados.apurado?.slice(0, 1000) || null,
        origem: dados.origem?.slice(0, 200) || null,
      },
    });
  } catch {
    // silêncio proposital · ver o comentário acima
  }
}

export type BombaNoChat = {
  slug: string;
  nome: string;
  vazao: number;
  vazaoMaxima: number;
  preco: number;
  garantia: string | null;
  saiaProtecao: boolean;
};

/**
 * A recomendação da Vibrinha, com a mesma conta e os mesmos produtos da
 * calculadora.
 *
 * Roda no servidor porque os modelos vêm do banco: preço e garantia mudam no
 * painel, e o chat não pode continuar falando o número de ontem.
 */
export async function recomendarNoChat(dados: {
  altura: number;
  tubo: number;
  poco: number;
  tensao: string;
}): Promise<{ hTotal: number; semSaida: boolean; indicada: BombaNoChat | null; alternativas: BombaNoChat[] }> {
  const altura = Math.min(Math.max(Number(dados.altura) || 0, 0), 500);
  const tubo = Math.min(Math.max(Number(dados.tubo) || 0, 0), 2000);
  const hTotal = alturaTotal(altura, tubo);
  const r = recomendar(await modelosDaCalculadora(), {
    hTotal,
    poco: Number(dados.poco),
    tensao: String(dados.tensao),
  });

  const resumo = ({ m, vazao }: NonNullable<typeof r.indicada>): BombaNoChat => ({
    slug: m.slug,
    // O cadastro guarda o modelo em caixa alta ("RYMER 2000"); numa conversa
    // isso lê como grito.
    nome: (m.modelo ?? m.nome).toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase()),
    vazao,
    vazaoMaxima: m.curvaVazao[0],
    preco: Number(m.preco),
    garantia: m.garantia,
    saiaProtecao: m.saiaProtecao,
  });

  return {
    hTotal,
    semSaida: r.semSaida,
    indicada: r.indicada ? resumo(r.indicada) : null,
    alternativas: r.alternativas.map(resumo),
  };
}
