/**
 * Carga inicial do catálogo das marcas próprias.
 *
 * O trabalho pesado aqui não é inserir — é normalizar. O catálogo da VTEX foi
 * cadastrado por mãos diferentes em épocas diferentes, e o mesmo dado aparece
 * com dois nomes ("RECALQUE (pol)" e "Saída de Recalque"). Se isso subisse como
 * está, a listagem mostraria dois filtros para o mesmo conceito, cada um com
 * metade dos produtos.
 */
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const prisma = new PrismaClient();

type ProdutoBruto = {
  slug: string;
  slugAntigo: string;
  nome: string;
  marca: string;
  sku: string;
  ean: string | null;
  modelo: string | null;
  descricao: string;
  metaDescricao: string;
  preco: number;
  precoDe: number | null;
  estoque: number;
  categorias: string[];
  especificacoes: { nome: string; valor: string }[];
  imagens: { arquivo: string; alt: string; principal: boolean }[];
};

/** Nome da VTEX → nome canônico. Os pares que se repetiam foram unificados. */
const CANONICO: Record<string, string> = {
  "VAZÃO MÁXIMA": "Vazão máxima",
  "ALTURA MIN (m.c.a) / VAZÃO LITROS POR HORA": "Altura manométrica mínima",
  "ALTURA MÁX (m.c.a) / VAZÃO LITROS POR HORA": "Altura manométrica máxima",
  Voltagem: "Voltagem",
  "ENERGIA FASES": "Voltagem",
  "RECALQUE (pol)": "Saída de recalque",
  "Saída de Recalque": "Saída de recalque",
  Potência: "Potência",
  FREQUÊNCIA: "Frequência",
  FABRICANTE: "Fabricante",
  "MARCA MOTOR": "Marca do motor",
  MODELO: "Modelo",
  "TIPO DE MOTOR": "Tipo de motor",
  GARANTIA: "Garantia",
  APLICAÇÃO: "Aplicação",
  Altura: "Altura",
  Largura: "Largura",
  Comprimento: "Comprimento",
  Peso: "Peso",
};

/** Ordem em que a ficha técnica é exibida — do que decide a compra ao resto. */
const ORDEM = [
  "Vazão máxima",
  "Altura manométrica máxima",
  "Altura manométrica mínima",
  "Voltagem",
  "Potência",
  "Frequência",
  "Saída de recalque",
  "Tipo de motor",
  "Modelo",
  "Fabricante",
  "Marca do motor",
  "Aplicação",
  "Garantia",
  "Peso",
  "Altura",
  "Largura",
  "Comprimento",
];

const FILTRAVEIS = new Set(["Vazão máxima", "Altura manométrica máxima", "Voltagem", "Potência"]);

/**
 * O catálogo usa os dois separadores de milhar: "1.650" e "1,650" aparecem no
 * mesmo campo. Um parse ingênuo transforma "1,650 litros" em 1,65 — foi o que
 * aconteceu na primeira versão. Só se remove o separador quando ele é seguido
 * de exatamente três dígitos; caso contrário é vírgula decimal de verdade.
 */
const num = (s: string): number | null => {
  const limpo = s.replace(/(\d)[.,](\d{3})(?!\d)/g, "$1$2");
  const m = limpo.match(/(\d+(?:[.,]\d+)?)/);
  return m ? Number(m[1].replace(",", ".")) : null;
};

const unidade = (nome: string): string | null =>
  nome.startsWith("Vazão") ? "L/h"
  : nome.startsWith("Altura manométrica") ? "m.c.a."
  : nome === "Potência" ? "W"
  : nome === "Peso" ? "kg"
  : ["Altura", "Largura", "Comprimento"].includes(nome) ? "cm"
  : null;

/**
 * A mesma tensão aparece como "110/125V", "125V", "127V" e "110/127V".
 * No Brasil a rede de 127 V é chamada de 110 V, 125 V e 127 V sem distinção —
 * tudo isso é a mesma coisa e vira uma única opção de filtro.
 * Retorna null quando o valor não é tensão (ex.: "Monofásico", que estava
 * cadastrado no mesmo campo).
 */
function voltagem(valor: string): string | null {
  const v = valor.toLowerCase();
  if (v.includes("bivolt")) return "Bivolt";
  if (!/\d/.test(v)) return null; // "Monofásico" e afins não são tensão
  const baixa = /1[012]\d|127/.test(v);
  const alta = /2[23]\d/.test(v);
  if (baixa && alta) return "Bivolt";
  if (baixa) return "110/127V";
  if (alta) return "220V";
  return null;
}

/**
 * Metade dos produtos são combos ("Rymer 2500 + Boia + Kit") cadastrados sem
 * ficha técnica. As especificações são herdadas do modelo base pelo nome.
 *
 * ⚠ Os dados de origem se contradizem: "Rymer 1500" aparece com 850 e com
 * 1.650 L/h, e Rymer 2000 e 2500 têm vazão idêntica. Herdamos o valor mais
 * frequente de cada família e marcamos o produto para conferência — não
 * inventamos número nenhum. Pendente de validação com a fábrica.
 */
const FAMILIAS = ["vibra vert 900", "vibra vert 800", "rymer 2500", "rymer 2000", "rymer 1500", "vibrinha"];

const familiaDe = (texto: string): string | null =>
  FAMILIAS.find((f) => texto.toLowerCase().includes(f)) ?? null;

async function main() {
  const brutos: ProdutoBruto[] = JSON.parse(
    readFileSync(join(process.cwd(), "data", "produtos.json"), "utf8"),
  );

  console.log(`→ ${brutos.length} produtos a carregar\n`);

  // ── categorias ──────────────────────────────────────────────
  const nomesCategoria = new Map<string, string>();
  for (const p of brutos) {
    for (const c of p.categorias) {
      const partes = c.split("/").filter(Boolean);
      if (partes.length === 1) {
        const nome = partes[0].replace(/-/g, " ");
        nomesCategoria.set(partes[0].toLowerCase(), nome);
      }
    }
  }

  const categorias = new Map<string, string>();
  for (const [slug, nome] of nomesCategoria) {
    const cat = await prisma.categoria.upsert({
      where: { slug },
      update: { nome },
      create: {
        slug,
        nome,
        metaTitulo: `${nome} Vibra Vert — direto da fábrica`,
        metaDescricao: `${nome} das linhas Vibra Vert e Rymer, com garantia de fábrica de 2 anos e assistência técnica própria.`,
      },
    });
    categorias.set(slug, cat.id);
  }
  console.log(`   ${categorias.size} categorias`);

  // ── normalizar especificações de todos, antes de inserir ────
  const normalizar = (p: ProdutoBruto) => {
    const porNome = new Map<string, { valor: string; original: string }>();
    for (const e of p.especificacoes) {
      let nome = CANONICO[e.nome] ?? e.nome;
      let valor: string | null = e.valor;

      if (nome === "Voltagem") {
        valor = voltagem(e.valor);
        // "Monofásico" estava cadastrado no campo de tensão — é número de fases
        if (valor === null) {
          nome = "Fases";
          valor = e.valor;
        }
      }
      if (!valor) continue;
      // primeiro a chegar vence: a VTEX devolve na ordem de cadastro
      if (!porNome.has(nome)) porNome.set(nome, { valor, original: e.nome });
    }
    return porNome;
  };

  // valor mais frequente por família, para herdar nos combos sem ficha técnica
  const porFamilia = new Map<string, Map<string, Map<string, number>>>();
  for (const p of brutos) {
    const fam = familiaDe(p.nome) ?? familiaDe(p.modelo ?? "");
    if (!fam) continue;
    const specs = normalizar(p);
    if (!specs.has("Vazão máxima")) continue;
    const alvo = porFamilia.get(fam) ?? new Map();
    for (const [nome, { valor }] of specs) {
      if (nome === "Voltagem" || nome === "Modelo") continue; // variam dentro da família
      const contagem = alvo.get(nome) ?? new Map<string, number>();
      contagem.set(valor, (contagem.get(valor) ?? 0) + 1);
      alvo.set(nome, contagem);
    }
    porFamilia.set(fam, alvo);
  }

  const herdadas = (fam: string) => {
    const out = new Map<string, string>();
    for (const [nome, contagem] of porFamilia.get(fam) ?? []) {
      const [melhor] = [...contagem.entries()].sort((a, b) => b[1] - a[1]);
      if (melhor) out.set(nome, melhor[0]);
    }
    return out;
  };

  // ── produtos ────────────────────────────────────────────────
  const semNumero: string[] = [];
  const conferir: string[] = [];

  for (const p of brutos) {
    const porNome = normalizar(p);

    // combo sem ficha técnica herda do modelo base
    if (!porNome.has("Vazão máxima")) {
      const fam = familiaDe(p.nome) ?? familiaDe(p.modelo ?? "");
      if (fam) {
        for (const [nome, valor] of herdadas(fam)) {
          if (!porNome.has(nome)) porNome.set(nome, { valor, original: `herdado de ${fam}` });
        }
        if (porNome.has("Vazão máxima")) conferir.push(p.nome);
      }
    }

    const especificacoes = [...porNome.entries()]
      .map(([nome, { valor, original }]) => ({
        nome,
        nomeOriginal: original === nome ? null : original,
        valor,
        valorNumero: num(valor),
        unidade: unidade(nome),
        filtravel: FILTRAVEIS.has(nome),
        ordem: ORDEM.indexOf(nome) === -1 ? 99 : ORDEM.indexOf(nome),
      }))
      .sort((a, b) => a.ordem - b.ordem);

    const valorDe = (n: string) => especificacoes.find((e) => e.nome === n);
    const vazao = valorDe("Vazão máxima")?.valorNumero ?? null;
    const altura = valorDe("Altura manométrica máxima")?.valorNumero ?? null;
    const potencia = valorDe("Potência")?.valorNumero ?? null;
    // 14 produtos não têm o campo de tensão preenchido, mas trazem "220V" ou
    // "110/127V" no próprio nome — que é, aliás, como o comprador procura.
    const volt = valorDe("Voltagem")?.valor ?? voltagem(p.nome);

    if (!vazao || !altura) semNumero.push(p.nome);

    const nomeMin = p.nome.toLowerCase();

    const produto = await prisma.produto.upsert({
      where: { slug: p.slug },
      update: {},
      create: {
        slug: p.slug,
        slugAntigo: p.slugAntigo,
        nome: p.nome,
        marca: p.marca,
        sku: p.sku,
        ean: p.ean,
        modelo: p.modelo,
        descricao: p.descricao,
        metaTitulo: `${p.nome} | Loja Oficial Vibra Vert`,
        metaDescricao:
          p.metaDescricao ||
          `${p.nome}. ${vazao ? `Vazão de até ${vazao.toLocaleString("pt-BR")} litros por hora. ` : ""}Garantia de fábrica de 2 anos e envio em 24h úteis.`,
        preco: p.preco,
        precoDe: p.precoDe && p.precoDe > p.preco ? p.precoDe : null,
        vazaoMaxima: vazao ? Math.round(vazao) : null,
        alturaMaxima: altura ? Math.round(altura) : null,
        potenciaWatts: potencia ? Math.round(potencia) : null,
        voltagem: volt,
        acompanhaBoia: nomeMin.includes("boia"),
        acompanhaKit: nomeMin.includes("kit"),
        especificacoes: { create: especificacoes },
        imagens: {
          create: p.imagens.map((img, i) => ({
            url: `/produtos/${img.arquivo}`,
            alt: img.alt,
            ordem: i,
            principal: img.principal,
          })),
        },
        // o estoque da VTEX vem como 99.999 — placeholder, não quantidade real.
        // Entra como zero para o alerta do painel não nascer mentindo.
        estoque: { create: { quantidade: 0, minimo: 5 } },
      },
    });

    // categorias do produto
    for (const c of p.categorias) {
      const raiz = c.split("/").filter(Boolean)[0]?.toLowerCase();
      const catId = raiz && categorias.get(raiz);
      if (catId) {
        await prisma.produtoCategoria.upsert({
          where: { produtoId_categoriaId: { produtoId: produto.id, categoriaId: catId } },
          update: {},
          create: { produtoId: produto.id, categoriaId: catId },
        });
      }
    }

    // links antigos seguem circulando em anúncios e no WhatsApp dos revendedores
    await prisma.redirecionamento.upsert({
      where: { de: `/${p.slugAntigo}/p` },
      update: { para: `/produto/${p.slug}` },
      create: { de: `/${p.slugAntigo}/p`, para: `/produto/${p.slug}` },
    });
  }

  console.log(`   ${brutos.length} produtos`);

  // ── vitrine inicial ─────────────────────────────────────────
  const destaques = await prisma.produto.findMany({
    orderBy: { preco: "desc" },
    take: 4,
    select: { id: true },
  });

  const prateleira = await prisma.prateleira.upsert({
    where: { slug: "mais-vendidas" },
    update: {},
    create: { slug: "mais-vendidas", titulo: "Mais vendidas", ordem: 0 },
  });
  for (const [i, d] of destaques.entries()) {
    await prisma.prateleiraProduto.upsert({
      where: { prateleiraId_produtoId: { prateleiraId: prateleira.id, produtoId: d.id } },
      update: { ordem: i },
      create: { prateleiraId: prateleira.id, produtoId: d.id, ordem: i },
    });
  }

  await prisma.banner.upsert({
    where: { id: "banner-principal-inicial" },
    update: {},
    create: {
      id: "banner-principal-inicial",
      titulo: "Potência e qualidade para sua necessidade",
      alt: "Bombas submersas vibratórias Vibra Vert e Rymer",
      posicao: "PRINCIPAL",
      ativo: true,
      ordem: 0,
    },
  });

  console.log(`   1 prateleira · 1 banner\n`);

  if (conferir.length) {
    console.log(`ℹ  ${conferir.length} combos herdaram a ficha técnica do modelo base.`);
    console.log(`   Confirmar com a fábrica antes de publicar o feed do Shopping.\n`);
  }
  if (semNumero.length) {
    console.log(`⚠  ${semNumero.length} produtos seguem sem vazão ou altura — ficam fora dos filtros por faixa:`);
    semNumero.slice(0, 8).forEach((n) => console.log(`     · ${n.slice(0, 66)}`));
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
