/**
 * Tabela de preços do briefing de 13/08/2026.
 *
 * A regra é uma só: o briefing dá o preço no PIX, e o preço cheio é
 * `PIX ÷ 0,9`. O cheio é o que fica gravado em `preco`, porque é dele que
 * saem as duas coisas que a vitrine mostra — o valor riscado e a parcela
 * (cheio ÷ 10). O PIX volta a aparecer aplicando os 10% de desconto.
 *
 * Guardar o PIX em vez do cheio pareceria mais direto e estaria errado: o
 * cartão cobraria o valor com desconto, e a loja venderia 10% abaixo do
 * combinado sem ninguém perceber.
 *
 * O mapeamento vai pelo SKU, que é a referência do fabricante e é o único
 * campo sistemático da base: `RY`/`VT` + `BO`/`KIT`/`BOKIT` + modelo + `A`
 * para 110/127V ou `B` para 220V. Nome e modelo estão inconsistentes desde a
 * migração da VTEX, e casar por eles erraria produto.
 *
 *   npx tsx --env-file=.env.local prisma/precos.ts          confere
 *   npx tsx --env-file=.env.local prisma/precos.ts --aplicar grava
 */
import { PrismaClient, type Versao } from "@prisma/client";

const prisma = new PrismaClient();

/** Preço no PIX, por modelo e montagem. Copiado do briefing. */
const PIX: Record<string, Record<Versao, number>> = {
  "15": { BOMBA: 199.9, BOIA: 249.9, KIT: 249.9, BOIA_KIT: 289.9 }, // Rymer 1500
  "20": { BOMBA: 219.9, BOIA: 269.9, KIT: 269.9, BOIA_KIT: 309.9 }, // Rymer 2000
  "25": { BOMBA: 239.9, BOIA: 289.9, KIT: 289.9, BOIA_KIT: 329.9 }, // Rymer 2500
  "6": { BOMBA: 289.9, BOIA: 339.9, KIT: 339.9, BOIA_KIT: 379.9 }, //  Vibrinha
  "8": { BOMBA: 329.9, BOIA: 379.9, KIT: 379.9, BOIA_KIT: 419.9 }, //  Vibra Vert 800
  "9": { BOMBA: 349.9, BOIA: 399.9, KIT: 399.9, BOIA_KIT: 439.9 }, //  Vibra Vert 900
};

const DESCONTO = 0.9;
const cheio = (pix: number) => Math.round((pix / DESCONTO) * 100) / 100;

/** `RYBOKIT-15A` → modelo 15. O sufixo A/B é tensão, e não muda preço. */
function modeloDoSku(sku: string) {
  const m = sku.match(/-(\d+)[AB]$/);
  return m ? m[1] : null;
}

/**
 * Acentuação que veio errada da VTEX.
 *
 * "Vibratoria" aparece em nome, descrição e meta de doze produtos. Corrigir
 * card a card no painel deixaria a busca do Google com a versão errada, que é
 * onde o texto mais custa caro.
 */
const acentuar = (s: string) =>
  s
    .replace(/Vibratoria/g, "Vibratória")
    .replace(/vibratoria/g, "vibratória")
    .replace(/\bde Agua\b/g, "de Água")
    .replace(/\bNivel\b/g, "Nível");

async function main() {
  const aplicar = process.argv.includes("--aplicar");
  const produtos = await prisma.produto.findMany({
    orderBy: { sku: "asc" },
    select: { id: true, sku: true, nome: true, descricao: true, metaTitulo: true,
              metaDescricao: true, versao: true, preco: true, ativo: true },
  });

  let mudancas = 0;
  let semTabela = 0;
  const linhas: string[] = [];

  for (const p of produtos) {
    const modelo = modeloDoSku(p.sku);
    const pix = modelo ? PIX[modelo]?.[p.versao] : undefined;

    if (!pix) {
      semTabela++;
      linhas.push(`  ⚠ ${p.sku.padEnd(12)} sem preço na tabela · ${p.nome.slice(0, 44)}`);
      continue;
    }

    const novo = cheio(pix);
    const antigo = Number(p.preco);
    const nome = acentuar(p.nome);
    const trocaTexto = nome !== p.nome;
    const trocaPreco = Math.abs(novo - antigo) > 0.001;
    // Produto sem preço tinha sido desativado no seed. Com preço na tabela, volta.
    const reativa = !p.ativo && novo > 0;

    if (!trocaPreco && !trocaTexto && !reativa) continue;
    mudancas++;

    linhas.push(
      `  ${p.sku.padEnd(12)} ${antigo.toFixed(2).padStart(7)} → ${novo.toFixed(2).padStart(7)}` +
        `  PIX ${pix.toFixed(2).padStart(6)}  10× ${(novo / 10).toFixed(2)}` +
        (reativa ? "  REATIVA" : "") +
        (trocaTexto ? "  +acento" : ""),
    );

    if (aplicar) {
      await prisma.produto.update({
        where: { id: p.id },
        data: {
          preco: novo,
          // O "de" riscado é o próprio preço cheio, então não há preço antigo
          // a manter: deixar um precoDe herdado da VTEX inventaria desconto.
          precoDe: null,
          ativo: true,
          nome,
          descricao: acentuar(p.descricao),
          metaTitulo: p.metaTitulo ? acentuar(p.metaTitulo) : null,
          metaDescricao: p.metaDescricao ? acentuar(p.metaDescricao) : null,
        },
      });
    }
  }

  console.log(linhas.join("\n"));
  console.log(`\n  ${produtos.length} produtos · ${mudancas} a mudar · ${semTabela} fora da tabela`);
  console.log(aplicar ? "  gravado.\n" : "  simulação · rode com --aplicar para gravar.\n");

  // Conferência contra o briefing: as quatro montagens de cada modelo, nas
  // duas tensões, precisam existir e bater. Faltar um SKU aqui é faltar um
  // produto na vitrine.
  if (aplicar) {
    const depois = await prisma.produto.findMany({ select: { sku: true, preco: true, versao: true, ativo: true } });
    const problemas: string[] = [];
    for (const [modelo, versoes] of Object.entries(PIX)) {
      for (const [versao, pix] of Object.entries(versoes)) {
        const prefixo = { BOMBA: "", BOIA: "BO", KIT: "KIT", BOIA_KIT: "BOKIT" }[versao as Versao];
        const marca = ["15", "20", "25"].includes(modelo) ? "RY" : "VT";
        for (const tensao of ["A", "B"]) {
          const sku = `${marca}${prefixo}-${modelo}${tensao}`;
          const achado = depois.find((d) => d.sku === sku);
          if (!achado) problemas.push(`${sku} não existe`);
          else if (Math.abs(Number(achado.preco) - cheio(pix)) > 0.001)
            problemas.push(`${sku} está ${achado.preco}, esperado ${cheio(pix)}`);
          else if (!achado.ativo) problemas.push(`${sku} está inativo`);
        }
      }
    }
    console.log(problemas.length ? "  ✗ " + problemas.join("\n  ✗ ") : "  ✓ os 48 SKUs conferem com o briefing");
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
