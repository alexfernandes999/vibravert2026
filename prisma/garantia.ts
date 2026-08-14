/**
 * Garantia por linha, do briefing de 13/08/2026.
 *
 * A base tinha 1 ano em toda a Vibra Vert, valor lido nas embalagens durante a
 * migração. O briefing do fabricante define 2 anos para essa linha · e quem
 * define prazo de garantia é quem fabrica, não a embalagem em estoque.
 *
 * A Rymer não é tocada: o briefing fala só da Vibra Vert, e estender por conta
 * própria seria anunciar cobertura que ninguém autorizou.
 *
 * O corte é pelo prefixo do SKU, e não pelo campo `marca`: a marca ficou
 * inconsistente na migração da VTEX, com produtos Rymer gravados como Vibra
 * Vert. VT* é a linha Vibra Vert, RY* é a Rymer.
 *
 *   npx tsx --env-file=.env.local prisma/garantia.ts            confere
 *   npx tsx --env-file=.env.local prisma/garantia.ts --aplicar  grava
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const NOVA = "2 anos";

async function main() {
  const aplicar = process.argv.includes("--aplicar");
  const alvos = await prisma.produto.findMany({
    where: { sku: { startsWith: "VT" } },
    select: { id: true, sku: true, especificacoes: { where: { nome: "Garantia" }, select: { id: true, valor: true } } },
    orderBy: { sku: "asc" },
  });

  let n = 0;
  for (const p of alvos) {
    const atual = p.especificacoes[0];
    if (atual?.valor === NOVA) continue;
    n++;
    console.log(`  ${p.sku.padEnd(12)} ${(atual?.valor ?? "sem ficha").padEnd(10)} → ${NOVA}`);
    if (!aplicar) continue;

    if (atual) {
      await prisma.especificacao.update({ where: { id: atual.id }, data: { valor: NOVA } });
    } else {
      await prisma.especificacao.create({
        data: { produtoId: p.id, nome: "Garantia", valor: NOVA, ordem: 90 },
      });
    }
  }

  console.log(`\n  ${alvos.length} SKUs da linha Vibra Vert · ${n} a mudar`);
  console.log(aplicar ? "  gravado.\n" : "  simulação · rode com --aplicar para gravar.\n");

  if (aplicar) {
    const conferir = await prisma.produto.findMany({
      where: { sku: { startsWith: "VT" } },
      select: { sku: true, especificacoes: { where: { nome: "Garantia" }, select: { valor: true } } },
    });
    const errados = conferir.filter((c) => c.especificacoes[0]?.valor !== NOVA);
    console.log(errados.length ? `  ✗ ficaram fora: ${errados.map((e) => e.sku).join(", ")}` : "  ✓ os 24 SKUs Vibra Vert com 2 anos");
    const rymer = await prisma.especificacao.count({ where: { nome: "Garantia", valor: NOVA, produto: { sku: { startsWith: "RY" } } } });
    console.log(rymer ? `  ✗ ${rymer} SKUs Rymer foram alterados por engano` : "  ✓ a Rymer ficou intacta");
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
