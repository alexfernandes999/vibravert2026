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
  imagem: string | null;
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
  /** Litros por hora que o cliente disse precisar. Muda o critério para a mais barata que entrega isso. */
  vazaoMinima?: number;
}): Promise<{ hTotal: number; semSaida: boolean; indicada: BombaNoChat | null; alternativas: BombaNoChat[] }> {
  const altura = Math.min(Math.max(Number(dados.altura) || 0, 0), 500);
  const tubo = Math.min(Math.max(Number(dados.tubo) || 0, 0), 2000);
  const hTotal = alturaTotal(altura, tubo);
  const r = recomendar(await modelosDaCalculadora(), {
    hTotal,
    poco: Number(dados.poco),
    tensao: String(dados.tensao),
    vazaoMinima: dados.vazaoMinima ? Math.max(Number(dados.vazaoMinima) || 0, 0) : undefined,
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
    imagem: m.imagem?.url ?? null,
  });

  return {
    hTotal,
    semSaida: r.semSaida,
    indicada: r.indicada ? resumo(r.indicada) : null,
    alternativas: r.alternativas.map(resumo),
  };
}

export type VersaoChat = "BOIA" | "KIT" | "BOIA_KIT";

/**
 * A mesma bomba com boia, com kit ou com os dois.
 *
 * As quatro montagens são produtos da mesma família, cada um com preço e
 * link próprios. A pessoa escolhe no chat e recebe o link da versão exata,
 * em vez de cair na página e ter de achar o seletor.
 */
export async function versaoNoChat(
  slug: string,
  versao: VersaoChat,
): Promise<{ slug: string; preco: number } | null> {
  const base = await prisma.produto.findUnique({ where: { slug }, select: { familia: true } });
  if (!base?.familia) return null;
  const p = await prisma.produto.findFirst({
    where: { familia: base.familia, versao, ativo: true },
    select: { slug: true, preco: true },
  });
  return p ? { slug: p.slug, preco: Number(p.preco) } : null;
}
