"use server";

import { prisma } from "@/lib/prisma";

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
