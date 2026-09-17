import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Remonta o carrinho a partir do lembrete de checkout abandonado.
 *
 * O carrinho mora num cookie do aparelho onde a pessoa começou a compra. Quem
 * abre o e-mail no celular encontraria um carrinho vazio, e carrinho vazio é
 * o fim da recuperação. O link grava as mesmas linhas neste aparelho e leva
 * direto ao carrinho.
 *
 * O id é um cuid, impossível de adivinhar, e o que ele devolve é só uma lista
 * de produtos · nada da pessoa vai para o navegador.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const destino = new URL("/carrinho", req.url);

  const c = await prisma.contatoCheckout
    .findUnique({ where: { id }, select: { itens: true } })
    .catch(() => null);
  const resposta = NextResponse.redirect(destino);
  const linhas = (Array.isArray(c?.itens) ? c.itens : []) as { id: string; qtd: number }[];
  if (linhas.length) {
    resposta.cookies.set("carrinho", JSON.stringify(linhas.map((l) => ({ id: l.id, qtd: l.qtd }))), {
      maxAge: 60 * 60 * 24 * 30,
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });
  }
  return resposta;
}
