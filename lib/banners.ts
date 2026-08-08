import { prisma } from "@/lib/prisma";
import type { BannerPosicao } from "@prisma/client";

/**
 * Banner ativo de uma posição, respeitando o agendamento.
 *
 * A data de início e fim é o que permite deixar a promoção pronta e ela subir
 * sozinha — sem depender de alguém lembrar de ligar o banner às sete da manhã
 * de segunda, e sem depender de programador nenhum.
 */
export async function bannerAtivo(posicao: BannerPosicao) {
  const agora = new Date();
  return prisma.banner.findFirst({
    where: {
      posicao,
      ativo: true,
      OR: [{ inicioEm: null }, { inicioEm: { lte: agora } }],
      AND: [{ OR: [{ fimEm: null }, { fimEm: { gte: agora } }] }],
    },
    orderBy: { ordem: "asc" },
  });
}

export async function bannersAtivos(posicao: BannerPosicao) {
  const agora = new Date();
  return prisma.banner.findMany({
    where: {
      posicao,
      ativo: true,
      OR: [{ inicioEm: null }, { inicioEm: { lte: agora } }],
      AND: [{ OR: [{ fimEm: null }, { fimEm: { gte: agora } }] }],
    },
    orderBy: { ordem: "asc" },
  });
}
