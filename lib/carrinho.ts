"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { DESCONTO_PIX, FRETE_GRATIS_EM_BOMBAS, FRETE_PADRAO, CONTROLA_ESTOQUE } from "@/lib/loja";
import { MINIMO_PECAS } from "@/lib/revenda";
import { registrar } from "@/lib/analitica";

/**
 * Carrinho de visitante, guardado num cookie.
 *
 * Sem cadastro e sem sessão no banco: o comprador desta loja chega pelo Google
 * com a bomba parada em casa e não vai criar conta antes de ver o frete. O
 * cookie guarda só id e quantidade — nome e preço são sempre lidos do banco na
 * hora, para que uma alteração de preço não fique presa no navegador de
 * ninguém.
 */
const COOKIE = "carrinho";
const UM_MES = 60 * 60 * 24 * 30;

type Linha = { id: string; qtd: number };

async function ler(): Promise<Linha[]> {
  const c = (await cookies()).get(COOKIE)?.value;
  if (!c) return [];
  try {
    const v = JSON.parse(c);
    return Array.isArray(v) ? v.filter((l) => l?.id && l.qtd > 0) : [];
  } catch {
    return [];
  }
}

async function gravar(linhas: Linha[]) {
  (await cookies()).set(COOKIE, JSON.stringify(linhas), {
    maxAge: UM_MES,
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
}

export async function adicionar(produtoId: string, qtd = 1) {
  const linhas = await ler();
  const existente = linhas.find((l) => l.id === produtoId);
  if (existente) existente.qtd += qtd;
  else linhas.push({ id: produtoId, qtd });
  await gravar(linhas);
  await registrar("CARRINHO");
  revalidatePath("/carrinho");
}

export async function alterar(produtoId: string, qtd: number) {
  const linhas = (await ler())
    .map((l) => (l.id === produtoId ? { ...l, qtd } : l))
    .filter((l) => l.qtd > 0);
  await gravar(linhas);
  revalidatePath("/carrinho");
}

export async function remover(produtoId: string) {
  await gravar((await ler()).filter((l) => l.id !== produtoId));
  revalidatePath("/carrinho");
}

export async function quantidadeTotal() {
  return (await ler()).reduce((s, l) => s + l.qtd, 0);
}

/**
 * Resumo para o cabeçalho: quantidade e valor.
 *
 * Mostrar o valor ao lado do ícone é o que o comprador procura para conferir
 * se o carrinho está certo antes de ir ao checkout — e evita a ida e volta só
 * para olhar o total.
 */
export async function resumoCarrinho() {
  const linhas = await ler();
  if (!linhas.length) return { qtd: 0, total: 0 };

  const produtos = await prisma.produto.findMany({
    where: { id: { in: linhas.map((l) => l.id) }, ativo: true },
    select: { id: true, preco: true },
  });

  let qtd = 0, total = 0;
  for (const p of produtos) {
    const n = linhas.find((l) => l.id === p.id)?.qtd ?? 0;
    qtd += n;
    total += Number(p.preco) * n;
  }
  return { qtd, total };
}

/**
 * Monta o carrinho lendo os produtos do banco.
 *
 * Um item que saiu do ar — desativado, sem preço — some do carrinho em vez de
 * quebrar a página. É melhor o comprador perceber a falta na hora do que
 * descobrir no checkout que aquilo não existe mais.
 */
export async function obterCarrinho() {
  const linhas = await ler();
  if (!linhas.length) {
    return {
      itens: [],
      subtotal: 0,
      frete: 0,
      total: 0,
      totalPix: 0,
      economiaPix: 0,
      freteGratis: false,
      soBombas: true,
      abaixoDoMinimo: false,
      faltaParaMinimo: 0,
      minimoPecas: MINIMO_PECAS,
    };
  }

  const produtos = await prisma.produto.findMany({
    where: { id: { in: linhas.map((l) => l.id) }, ativo: true },
    select: {
      id: true, slug: true, nome: true, sku: true, preco: true, voltagem: true,
      pocoPolegadas: true, tipo: true, estoque: { select: { quantidade: true } },
      pesoGramas: true, alturaCm: true, larguraCm: true, comprimentoCm: true,
      imagens: { where: { principal: true }, select: { url: true, alt: true }, take: 1 },
    },
  });

  const itens = produtos.map((p) => {
    const qtdPedida = linhas.find((l) => l.id === p.id)!.qtd;
    const disponivel = CONTROLA_ESTOQUE ? (p.estoque?.quantidade ?? 0) : Infinity;
    const qtd = Math.max(1, Math.min(qtdPedida, disponivel));
    return {
      id: p.id,
      slug: p.slug,
      nome: p.nome,
      sku: p.sku,
      voltagem: p.voltagem,
      pocoPolegadas: p.pocoPolegadas,
      tipo: p.tipo,
      imagem: p.imagens[0] ?? null,
      preco: Number(p.preco),
      qtd,
      limitado: qtd < qtdPedida,
      total: Number(p.preco) * qtd,
      volume: {
        pesoGramas: p.pesoGramas ?? 4000,
        alturaCm: p.alturaCm ?? 30,
        larguraCm: p.larguraCm ?? 17,
        comprimentoCm: p.comprimentoCm ?? 17,
        quantidade: qtd,
      },
    };
  });

  const subtotal = itens.reduce((s, i) => s + i.total, 0);
  // Frete grátis é da bomba, não do valor do pedido. Uma ventosa de trinta
  // reais com frete grátis custaria mais em entrega do que em produto.
  const soBombas = itens.every((i) => i.tipo === "BOMBA");
  const freteGratis = FRETE_GRATIS_EM_BOMBAS && soBombas;

  // Pedido só de peça tem mínimo: abaixo dele o frete custa mais que a peça,
  // e a loja gasta uma etiqueta inteira para vender uma arruela.
  const soPecas = itens.length > 0 && itens.every((i) => i.tipo !== "BOMBA");
  const abaixoDoMinimo = soPecas && subtotal < MINIMO_PECAS;
  const faltaParaMinimo = abaixoDoMinimo ? MINIMO_PECAS - subtotal : 0;
  const frete = freteGratis ? 0 : FRETE_PADRAO;
  const total = subtotal + frete;
  const totalPix = total * (1 - DESCONTO_PIX);

  return {
    itens,
    subtotal,
    frete,
    total,
    totalPix,
    economiaPix: total - totalPix,
    freteGratis,
    soBombas,
    abaixoDoMinimo,
    faltaParaMinimo,
    minimoPecas: MINIMO_PECAS,
  };
}
