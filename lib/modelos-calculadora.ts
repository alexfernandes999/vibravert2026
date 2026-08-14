import { prisma } from "@/lib/prisma";
import type { ModeloCalc } from "@/components/calculadora";

/**
 * Os modelos que alimentam a calculadora.
 *
 * Estava dentro da página `/qual-bomba`. Agora a calculadora aparece também na
 * home, logo abaixo do primeiro bloco, e duas cópias da mesma consulta é o
 * caminho garantido para uma delas ficar para trás quando a regra mudar.
 */
const FAMILIAS = [
  "vibra vert 900",
  "vibra vert 800",
  "rymer 2500",
  "rymer 2000",
  "rymer 1500",
  "vibrinha",
];

const familiaDe = (t: string) =>
  FAMILIAS.find((f) => t.toLowerCase().includes(f)) ?? t.toLowerCase();

export async function modelosDaCalculadora(): Promise<ModeloCalc[]> {
  const produtos = await prisma.produto.findMany({
    where: { ativo: true, pocoPolegadas: { not: null } },
    select: {
      slug: true, nome: true, marca: true, preco: true, sku: true, modelo: true,
      voltagem: true, pocoPolegadas: true, saiaProtecao: true, potenciaWatts: true,
      curvaVazao: true,
      imagens: { where: { principal: true }, select: { url: true, alt: true }, take: 1 },
      especificacoes: {
        where: { nome: { in: ["Garantia", "Saída de recalque"] } },
        select: { nome: true, valor: true },
      },
    },
  });

  // Uma bomba por família e tensão. As quatro montagens são a mesma bomba:
  // mostrar as quatro para quem ainda não sabe o que quer transforma uma
  // recomendação num catálogo. Fica a mais barata de cada família, e o
  // acessório se escolhe depois, na página do produto.
  const vistos = new Set<string>();
  const modelos: ModeloCalc[] = [];

  for (const p of produtos
    .filter((x) => x.curvaVazao.length > 0)
    .sort((a, b) => Number(a.preco) - Number(b.preco))) {
    const chave = `${familiaDe(`${p.modelo ?? ""} ${p.nome}`)}|${p.voltagem}`;
    if (vistos.has(chave)) continue;
    vistos.add(chave);
    modelos.push({
      ...p,
      preco: String(p.preco),
      imagem: p.imagens[0] ?? null,
      garantia: p.especificacoes.find((e) => e.nome === "Garantia")?.valor ?? null,
      recalque: p.especificacoes.find((e) => e.nome === "Saída de recalque")?.valor ?? null,
    });
  }

  return modelos;
}
