import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

const base = process.env.NEXT_PUBLIC_URL || "https://www.vibravert.com.br";

/**
 * Só entram no sitemap as URLs que queremos indexadas.
 *
 * Das quatro montagens de cada bomba, entra apenas a principal — mandar as
 * quatro seria pedir ao Google exatamente a canibalização que o seletor de
 * versão veio resolver. As páginas de filtro entram só nas combinações com
 * demanda de busca: diâmetro do poço e tensão.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [produtos, pocos, voltagens] = await Promise.all([
    prisma.produto.findMany({
      where: { ativo: true, principalDaFamilia: true },
      select: { slug: true, atualizadoEm: true },
    }),
    prisma.produto.groupBy({ by: ["pocoPolegadas"], where: { ativo: true, pocoPolegadas: { not: null } } }),
    prisma.produto.groupBy({ by: ["voltagem"], where: { ativo: true, voltagem: { not: null } } }),
  ]);

  const fixas: MetadataRoute.Sitemap = [
    { url: base, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/qual-bomba`, changeFrequency: "monthly", priority: 0.9 },
    { url: `${base}/bombas`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/assistencia`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/sobre`, changeFrequency: "yearly", priority: 0.5 },
    { url: `${base}/fale-conosco`, changeFrequency: "yearly", priority: 0.5 },
    // As institucionais entram porque o Decreto 7.962 exige que estejam
    // acessíveis, e porque o Google usa a presença delas como sinal de loja
    // séria ao avaliar confiabilidade.
    ...["politica-de-entrega", "politica-de-troca", "politica-de-privacidade", "termos-de-uso"].map(
      (s) => ({ url: `${base}/${s}`, changeFrequency: "yearly" as const, priority: 0.3 }),
    ),
  ];

  return [
    ...fixas,
    ...pocos.map((p) => ({
      url: `${base}/bombas?poco=${p.pocoPolegadas}`,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...voltagens.map((v) => ({
      url: `${base}/bombas?voltagem=${encodeURIComponent(v.voltagem!)}`,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...produtos.map((p) => ({
      url: `${base}/produto/${p.slug}`,
      lastModified: p.atualizadoEm,
      changeFrequency: "weekly" as const,
      priority: 0.9,
    })),
  ];
}
