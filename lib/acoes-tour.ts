"use server";

import { prisma } from "@/lib/prisma";
import { usuarioAtual } from "@/lib/admin-auth";

/** Marca que a pessoa já viu o tour · vale também para quem pula. */
export async function marcarTourVisto() {
  const eu = await usuarioAtual();
  if (!eu) return;
  await prisma.usuario.update({ where: { id: eu.id }, data: { viuTour: true } });
}

/** Ver de novo, a pedido. Fica num link discreto no rodapé do painel. */
export async function repetirTour() {
  const eu = await usuarioAtual();
  if (!eu) return;
  await prisma.usuario.update({ where: { id: eu.id }, data: { viuTour: false } });
}
