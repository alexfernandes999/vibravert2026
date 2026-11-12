"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { registrarAcao, usuarioAtual } from "@/lib/admin-auth";

/**
 * Ações da lista de produtos que vêm do componente da tabela (cliente).
 * Cada uma confere a sessão de novo: o botão escondido não protege nada.
 */
async function logado() {
  if (!(await usuarioAtual())) redirect("/admin/entrar");
}

/** Preço de venda (a prazo). O PIX é derivado dele na loja inteira. */
export async function salvarPreco(id: string, valor: number): Promise<{ ok: boolean; erro?: string }> {
  await logado();
  if (!Number.isFinite(valor) || valor <= 0) return { ok: false, erro: "Preço inválido" };
  const p = await prisma.produto.update({
    where: { id },
    data: { preco: Math.round(valor * 100) / 100 },
    select: { sku: true },
  });
  await registrarAcao("alterou o preço", p.sku, valor.toFixed(2));
  revalidatePath("/admin/produtos");
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Código e slug livres para a cópia: "-COPIA", "-COPIA-2"… */
async function livre(base: string, campo: "sku" | "slug") {
  for (let n = 1; ; n++) {
    const tentativa = n === 1 ? base : `${base}-${n}`;
    const existe = await prisma.produto.findFirst({ where: { [campo]: tentativa }, select: { id: true } });
    if (!existe) return tentativa;
  }
}

/**
 * Clona um produto com fotos, especificações e categorias.
 * A cópia nasce inativa, fora da vitrine e sem estoque: só aparece na loja
 * depois que alguém revisa nome, código e preço e liga.
 */
export async function clonarProduto(id: string) {
  await logado();
  const o = await prisma.produto.findUniqueOrThrow({
    where: { id },
    include: { imagens: true, especificacoes: true, categorias: true },
  });
  const {
    id: _id, slug, slugAntigo: _sa, sku, criadoEm: _c, atualizadoEm: _a,
    imagens, especificacoes, categorias, ...campos
  } = o;
  const novo = await prisma.produto.create({
    data: {
      ...campos,
      nome: `${o.nome} (cópia)`,
      sku: await livre(`${sku}-COPIA`, "sku"),
      slug: await livre(`${slug}-copia`, "slug"),
      ativo: false,
      destaque: false,
      naVitrine: false,
      principalDaFamilia: false,
      imagens: { create: imagens.map(({ url, alt, ordem, principal }) => ({ url, alt, ordem, principal })) },
      especificacoes: {
        create: especificacoes.map(({ nome, nomeOriginal, valor, valorNumero, unidade, ordem, filtravel }) => ({
          nome, nomeOriginal, valor, valorNumero, unidade, ordem, filtravel,
        })),
      },
      categorias: { create: categorias.map(({ categoriaId }) => ({ categoriaId })) },
      estoque: { create: { quantidade: 0 } },
    },
    select: { id: true },
  });
  await registrarAcao("clonou o produto", sku);
  revalidatePath("/admin/produtos");
  redirect(`/admin/produtos/${novo.id}`);
}
