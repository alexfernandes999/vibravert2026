/**
 * Troca a foto principal pelas fotos novas da bomba sozinha.
 *
 * As antigas mostravam a bomba ao lado da caixa, e no resultado da calculadora
 * · onde a foto é grande e decide a compra · metade do espaço era embalagem.
 * Estas são a bomba de frente, em fundo branco, com a etiqueta legível.
 *
 * A foto entra em primeiro lugar e as antigas ficam na galeria: a da caixa
 * ainda serve para quem quer ver o que chega.
 *
 *   npx tsx --env-file=.env.local prisma/fotos-bombas.ts --aplicar
 */
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

/** O prefixo do SKU diz a família, e é o único campo confiável da base. */
const POR_FAMILIA: { prefixo: RegExp; arquivo: string; alt: string }[] = [
  { prefixo: /^VT(BO|KIT|BOKIT)?-8[AB]$/, arquivo: "vibra-vert-800", alt: "Bomba submersa vibratória Vibra Vert 800" },
  { prefixo: /^VT(BO|KIT|BOKIT)?-9[AB]$/, arquivo: "vibra-vert-900", alt: "Bomba submersa vibratória Vibra Vert 900" },
  { prefixo: /^VT(BO|KIT|BOKIT)?-6[AB]$/, arquivo: "vibrinha", alt: "Bomba submersa vibratória Vibrinha" },
  { prefixo: /^RY(BO|KIT|BOKIT)?-15[AB]$/, arquivo: "rymer-1500", alt: "Bomba submersa vibratória Rymer 1500" },
  { prefixo: /^RY(BO|KIT|BOKIT)?-20[AB]$/, arquivo: "rymer-2000", alt: "Bomba submersa vibratória Rymer 2000" },
  { prefixo: /^RY(BO|KIT|BOKIT)?-25[AB]$/, arquivo: "rymer-2500", alt: "Bomba submersa vibratória Rymer 2500 com saia de proteção" },
];

(async () => {
  const aplicar = process.argv.includes("--aplicar");
  const produtos = await prisma.produto.findMany({
    where: { ativo: true, tipo: "BOMBA" },
    select: { id: true, sku: true, imagens: { select: { id: true, url: true, principal: true }, orderBy: { ordem: "asc" } } },
    orderBy: { sku: "asc" },
  });

  let trocadas = 0, semFamilia: string[] = [];

  for (const p of produtos) {
    const f = POR_FAMILIA.find((x) => x.prefixo.test(p.sku));
    if (!f) { semFamilia.push(p.sku); continue; }

    const url = `/bombas/${f.arquivo}.jpg`;
    if (p.imagens[0]?.url === url) continue;
    trocadas++;
    if (!aplicar) continue;

    // As antigas descem uma posição em vez de sumir: a foto da caixa ainda
    // mostra o que chega, e a do kit mostra as peças que acompanham.
    await prisma.$transaction([
      prisma.imagem.updateMany({
        where: { produtoId: p.id },
        data: { principal: false },
      }),
      ...p.imagens.map((im, i) =>
        prisma.imagem.update({ where: { id: im.id }, data: { ordem: i + 1 } }),
      ),
      prisma.imagem.create({
        data: { produtoId: p.id, url, alt: f.alt, ordem: 0, principal: true },
      }),
    ]);
  }

  console.log(`  ${produtos.length} bombas · ${trocadas} com foto nova`);
  if (semFamilia.length) console.log(`  ⚠ sem família: ${semFamilia.join(", ")}`);
  console.log(aplicar ? "  gravado.\n" : "  simulação · rode com --aplicar\n");
})().catch(console.error).finally(() => prisma.$disconnect());
