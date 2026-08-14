import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { Calculadora } from "@/components/calculadora";
import { modelosDaCalculadora } from "@/lib/modelos-calculadora";
import { FaixaConfianca } from "@/components/faixa-lider";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Qual bomba o seu poço precisa?",
  description:
    "Informe a altura, o comprimento da tubulação e o diâmetro do poço, e veja qual bomba sapo atende · com a vazão real na sua instalação, não só a vazão máxima do catálogo.",
  alternates: { canonical: "/qual-bomba" },
};

export default async function QualBomba() {
  const modelos = await modelosDaCalculadora();

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
            para PVC nesta faixa de vazão · para instalações com muitas curvas, registros ou
            desnível acentuado, confirme com o técnico da fábrica.
          </p>
        </div>
      </section>

      <FaixaConfianca />
    </>
  );
}
