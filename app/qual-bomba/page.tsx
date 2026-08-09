import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { Calculadora, type ModeloCalc } from "@/components/calculadora";
import { FaixaConfianca } from "@/components/faixa-lider";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Qual bomba o seu poço precisa?",
  description:
    "Informe a altura, o comprimento da tubulação e o diâmetro do poço, e veja qual bomba sapo atende — com a vazão real na sua instalação, não só a vazão máxima do catálogo.",
  alternates: { canonical: "/qual-bomba" },
};

export default async function QualBomba() {
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

  // Uma bomba por família e tensão. As quatro montagens (só a bomba, + boia,
  // + kit, + boia e kit) são a mesma bomba: mostrar as quatro para quem ainda
  // não sabe o que quer transforma uma recomendação em um catálogo.
  // Fica a mais barata de cada família — o acessório se escolhe depois, na
  // página do produto.
  const FAMILIAS = ["vibra vert 900", "vibra vert 800", "rymer 2500", "rymer 2000", "rymer 1500", "vibrinha"];
  const familiaDe = (t: string) => FAMILIAS.find((f) => t.toLowerCase().includes(f)) ?? t.toLowerCase();

  const vistos = new Set<string>();
  const modelos: ModeloCalc[] = [];
  for (const p of produtos.filter((x) => x.curvaVazao.length > 0).sort((a, b) => Number(a.preco) - Number(b.preco))) {
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

  return (
    <>
      <section className="border-b border-linha bg-gradient-to-br from-marca-suave via-superficie to-superficie">
        <div className="mx-auto max-w-7xl px-5 py-10">
          <h1 className="max-w-2xl text-3xl font-extrabold leading-tight tracking-tight text-balance md:text-4xl">
            Qual bomba o seu poço precisa?
          </h1>
          <p className="mt-2.5 max-w-2xl text-[15px] text-tinta-2">
            Responda quatro perguntas e veja a bomba certa, com foto e preço. E veja o número
            que o catálogo não mostra: <strong>quanto ela entrega na sua instalação</strong>, e
            não a vazão máxima medida a zero metro.
          </p>

          <div className="mt-8">
            <Calculadora modelos={modelos} />
          </div>

          <p className="mt-6 max-w-3xl text-[12.5px] leading-relaxed text-mudo">
            Os dados de vazão vêm da curva de cada modelo, medida pelo fabricante e impressa na
            embalagem. A perda de carga da tubulação é estimada em 4% do comprimento, regra usada
            para PVC nesta faixa de vazão — para instalações com muitas curvas, registros ou
            desnível acentuado, confirme com o técnico da fábrica.
          </p>
        </div>
      </section>

      <FaixaConfianca />
    </>
  );
}
