"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { registrarAcao } from "@/lib/admin-auth";
import { enviarImagem } from "@/lib/upload";

/**
 * Fotos e cadastro de produto, pelo painel.
 *
 * Os 85 produtos de hoje entraram por importação, e até agora só dava para
 * olhar. Quem vende precisa poder trocar uma foto ruim numa segunda de manhã
 * sem abrir chamado com ninguém.
 */

/** Renova a loja inteira: o produto aparece em muita tela diferente. */
function renovar(id?: string) {
  if (id) revalidatePath(`/admin/produtos/${id}`);
  revalidatePath("/admin/produtos");
  revalidatePath("/", "layout");
}

export async function adicionarFoto(dados: FormData) {
  const produtoId = String(dados.get("produtoId") ?? "");
  if (!produtoId) return { erro: "produto não informado" };

  const p = await prisma.produto.findUnique({
    where: { id: produtoId },
    select: { nome: true, sku: true, _count: { select: { imagens: true } } },
  });
  if (!p) return { erro: "produto não encontrado" };

  dados.set("marca", p.sku);
  dados.set("pasta", "produtos");
  const envio = await enviarImagem(dados);
  if (!envio.ok) return { erro: envio.erro };

  await prisma.imagem.create({
    data: {
      produtoId,
      url: envio.url,
      // O alt cai no nome do produto quando ninguém escreve um. Foto sem alt
      // é foto que o Google não lê e que leitor de tela pula.
      alt: String(dados.get("alt") ?? "").trim() || p.nome,
      ordem: p._count.imagens,
      // A primeira foto de um produto sem foto vira a principal sozinha,
      // senão o produto entra no catálogo sem imagem de capa.
      principal: p._count.imagens === 0,
    },
  });

  await registrarAcao(`adicionou foto em ${p.sku}`);
  renovar(produtoId);
  return { ok: true };
}

export async function removerFoto(id: string) {
  const img = await prisma.imagem.findUnique({
    where: { id },
    select: { produtoId: true, principal: true, produto: { select: { sku: true } } },
  });
  if (!img) return;

  await prisma.imagem.delete({ where: { id } });

  // Apagar a capa deixaria o produto sem foto principal e ele sumiria das
  // listagens. A próxima da fila assume.
  if (img.principal) {
    const proxima = await prisma.imagem.findFirst({
      where: { produtoId: img.produtoId },
      orderBy: { ordem: "asc" },
    });
    if (proxima) {
      await prisma.imagem.update({ where: { id: proxima.id }, data: { principal: true } });
    }
  }

  await registrarAcao(`removeu foto de ${img.produto.sku}`);
  renovar(img.produtoId);
}

export async function tornarPrincipal(id: string) {
  const img = await prisma.imagem.findUnique({
    where: { id },
    select: { produtoId: true, produto: { select: { sku: true } } },
  });
  if (!img) return;

  await prisma.$transaction([
    prisma.imagem.updateMany({ where: { produtoId: img.produtoId }, data: { principal: false } }),
    prisma.imagem.update({ where: { id }, data: { principal: true } }),
  ]);

  await registrarAcao(`trocou a capa de ${img.produto.sku}`);
  renovar(img.produtoId);
}

/** Sobe ou desce uma foto na ordem da galeria. */
export async function moverFoto(id: string, direcao: "sobe" | "desce") {
  const img = await prisma.imagem.findUnique({ where: { id } });
  if (!img) return;

  const vizinha = await prisma.imagem.findFirst({
    where: {
      produtoId: img.produtoId,
      ordem: direcao === "sobe" ? { lt: img.ordem } : { gt: img.ordem },
    },
    orderBy: { ordem: direcao === "sobe" ? "desc" : "asc" },
  });
  if (!vizinha) return;

  await prisma.$transaction([
    prisma.imagem.update({ where: { id: img.id }, data: { ordem: vizinha.ordem } }),
    prisma.imagem.update({ where: { id: vizinha.id }, data: { ordem: img.ordem } }),
  ]);

  renovar(img.produtoId);
}
