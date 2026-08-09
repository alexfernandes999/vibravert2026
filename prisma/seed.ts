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

/**
 * A slug vira a URL do produto, então acento tem de virar letra e não sumir.
 * A primeira versão gerava "bomba-submersa-de-po-o", porque limpava o "ç"
 * em vez de convertê-lo — uma URL que não diz nada a quem lê nem ao Google.
 */
const slugificar = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");

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
  "Poço",                        // primeiro critério de compra: a bomba errada não entra
  "Saia de proteção lateral",
  "Vazão máxima",
  "Curva de vazão",
  "Altura manométrica máxima",
  "Altura manométrica mínima",
  "Voltagem",
  "Potência",
  "Frequência",
  "Fases",
  "Saída de recalque",
  "Diâmetro do corpo",
  "Tipo de motor",
  "Modelo",
  "Fabricante",
  "Marca do motor",
  "Acompanha",
  "Aplicação",
  "Garantia",
  "Peso",
  "Altura",
  "Largura",
  "Comprimento",
];

const FILTRAVEIS = new Set([
  "Poço",
  "Vazão máxima",
  "Altura manométrica máxima",
  "Voltagem",
  "Potência",
]);

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

/**
 * Fichas oficiais, lidas das embalagens do fabricante. Onde existirem, elas
 * mandam — o cadastro da VTEX estava com a garantia errada em toda a linha e,
 * na Rymer 1500, com a vazão de 30 metros no lugar da vazão máxima.
 */
type Ficha = {
  nome: string;
  potenciaWatts: number;
  saidaRecalque: string;
  vazaoPorAltura: number[];
  pocoTubularMinimoPolegadas?: number;
  pocoDiametroMaximoMm?: number;
  diametroCorpoMm: number;
  saiaProtecaoLateral?: boolean;
  kitIncluso: string;
  garantiaMeses: number;
};

const FICHAS: Record<string, Ficha> = JSON.parse(
  readFileSync(join(process.cwd(), "data", "fichas-tecnicas.json"), "utf8"),
).modelos;

const ALTURAS = [0, 10, 20, 30, 40, 50, 60, 65];

/**
 * As fotos vivem no Storage do Supabase, não em public/.
 *
 * A primeira versão gravava o caminho local e dependia de um script separado
 * reapontar tudo para o CDN depois — então toda recarga do catálogo derrubava
 * as imagens da loja em produção, em silêncio. Agora a URL definitiva sai
 * daqui, e recarregar o seed deixou de ser destrutivo.
 */
const CDN = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/produtos/`
  : "/produtos/";

/** "rymer 2500" → chave "rymer-2500" do arquivo de fichas */
const fichaDe = (fam: string | null): Ficha | null =>
  fam ? (FICHAS[fam.replace(/ /g, "-")] ?? null) : null;

/**
 * As quatro montagens da mesma bomba viram versões de um produto só.
 * A família agrupa por modelo e tensão: 220V e 110V são bombas diferentes de
 * verdade, não uma escolha de acessório como a boia ou o kit.
 */
function versaoDe(nome: string): "BOMBA" | "BOIA" | "KIT" | "BOIA_KIT" {
  const n = nome.toLowerCase();
  const boia = n.includes("boia");
  const kit = n.includes("kit");
  return boia && kit ? "BOIA_KIT" : boia ? "BOIA" : kit ? "KIT" : "BOMBA";
}

const familiaDeProduto = (nome: string, modelo: string | null, volt: string | null) => {
  const fam = familiaDe(`${modelo ?? ""} ${nome}`);
  return fam ? `${fam.replace(/ /g, "-")}-${(volt ?? "sv").replace(/[/]/g, "")}`.toLowerCase() : null;
};

/**
 * Peso e medidas da caixa.
 *
 * Onde o cadastro traz o dado, ele manda. Onde falta, a caixa é estimada a
 * partir do diâmetro do corpo da bomba mais folga de embalagem: 4 cm em cada
 * dimensão lateral e 6 cm na altura, que é o que uma caixa de papelão com
 * calço consome. É estimativa declarada, não medição — o frete cobrado a menos
 * sai da margem, então isto precisa ser conferido com uma balança antes de
 * ligar o cálculo dos Correios.
 */
function medidas(ficha: Ficha | null, specs: Map<string, { valor: string }>) {
  const n = (nome: string) => {
    const v = specs.get(nome)?.valor;
    if (!v) return null;
    const m = v.replace(",", ".").match(/([\d.]+)/);
    const x = m ? Number(m[1]) : NaN;
    return Number.isFinite(x) && x > 0 ? x : null;
  };

  const pesoKg = n("Peso");
  const alt = n("Altura");
  const lar = n("Largura");
  const comp = n("Comprimento");

  const corpoCm = ficha ? ficha.diametroCorpoMm / 10 : null;
  const estimado = !pesoKg || !alt || !lar || !comp;

  return {
    // sem peso cadastrado, usa o do corpo: 138 mm é a linha de 4 kg, 175 mm a de 5 kg
    pesoGramas: Math.round((pesoKg ?? (corpoCm && corpoCm > 15 ? 5 : 4)) * 1000),
    alturaCm: Math.round(alt ?? (corpoCm ? corpoCm * 2 + 6 : 36)),
    larguraCm: Math.round(lar ?? (corpoCm ? corpoCm + 4 : 18)),
    comprimentoCm: Math.round(comp ?? (corpoCm ? corpoCm + 4 : 18)),
    medidasEstimadas: estimado,
  };
}

const garantiaTexto = (meses: number) =>
  meses === 12 ? "1 ano" : meses % 12 === 0 ? `${meses / 12} anos` : `${meses} meses`;

async function main() {
  const brutos: ProdutoBruto[] = JSON.parse(
    readFileSync(join(process.cwd(), "data", "produtos.json"), "utf8"),
  );

  console.log(`→ ${brutos.length} produtos a carregar\n`);

  // Recarga limpa do catálogo. Só é permitida enquanto não houver pedido —
  // depois disso, apagar produto levaria junto o histórico de vendas.
  // Precisa vir antes das categorias: apagar depois deixaria os ids em memória
  // apontando para linhas que já não existem.
  const pedidos = await prisma.pedido.count();
  if (pedidos === 0) {
    await prisma.produto.deleteMany();
    await prisma.categoria.deleteMany();
    await prisma.redirecionamento.deleteMany();
  } else {
    console.log(`   ${pedidos} pedidos existentes — recarga completa bloqueada\n`);
  }

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
  const semGarantia: string[] = [];
  const semPrecoLista: string[] = [];

  for (const p of brutos) {
    const porNome = normalizar(p);

    const fam = familiaDe(p.nome) ?? familiaDe(p.modelo ?? "");
    const ficha = fichaDe(fam);

    if (ficha) {
      // a embalagem manda: sobrescreve o que veio da VTEX
      const vaz = ficha.vazaoPorAltura;
      porNome.set("Vazão máxima", { valor: `${vaz[0].toLocaleString("pt-BR")} litros por hora`, original: "embalagem" });
      porNome.set("Altura manométrica máxima", { valor: `65 m.c.a. · ${vaz.at(-1)!.toLocaleString("pt-BR")} L/h`, original: "embalagem" });
      porNome.set("Potência", { valor: `${ficha.potenciaWatts} watts`, original: "embalagem" });
      porNome.set("Saída de recalque", { valor: ficha.saidaRecalque, original: "embalagem" });
      porNome.set("Garantia", { valor: garantiaTexto(ficha.garantiaMeses), original: "embalagem" });
      porNome.set("Diâmetro do corpo", { valor: `${ficha.diametroCorpoMm} mm`, original: "embalagem" });
      porNome.set("Acompanha", { valor: ficha.kitIncluso, original: "embalagem" });
      porNome.set("Poço", {
        valor: ficha.pocoDiametroMaximoMm
          ? `Até ${ficha.pocoDiametroMaximoMm} mm — cabe em poço de 6 polegadas`
          : `Tubular, no mínimo ${ficha.pocoTubularMinimoPolegadas} polegadas`,
        original: "embalagem",
      });
      if (ficha.saiaProtecaoLateral) {
        porNome.set("Saia de proteção lateral", { valor: "Sim", original: "embalagem" });
      }
      // curva completa: é o que alimenta o seletor "qual bomba eu preciso"
      porNome.set("Curva de vazão", {
        valor: ALTURAS.map((a, i) => `${a} m: ${vaz[i]} L/h`).join(" · "),
        original: "embalagem",
      });
    } else if (!porNome.has("Vazão máxima") && fam) {
      // sem ficha oficial, o combo herda do modelo base do próprio catálogo
      for (const [nome, valor] of herdadas(fam)) {
        if (!porNome.has(nome)) porNome.set(nome, { valor, original: `herdado de ${fam}` });
      }
      if (porNome.has("Vazão máxima")) conferir.push(p.nome);
    }

    if (ficha) {
      // com a curva oficial em mãos, o campo antigo de altura mínima vira ruído
      porNome.delete("Altura manométrica mínima");
    } else if (porNome.has("Garantia")) {
      // Sem ficha da fábrica não publicamos prazo de garantia. O cadastro
      // antigo dizia "2 anos" em toda a linha e a embalagem desmente isso em
      // todos os modelos conferidos — anunciar prazo que não se pode honrar é
      // infração ao CDC. Melhor omitir e cobrar a ficha ao fabricante.
      // Vai depois da herança: senão o combo reinjeta a garantia do irmão.
      porNome.delete("Garantia");
      semGarantia.push(p.nome);
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
    // O nome tem precedência sobre o campo de tensão, e não o contrário.
    // O RYKIT-20A chama-se "em 110/127V" e traz "220V" na especificação; o
    // sufixo A do código segue a convenção da linha (A=110V, B=220V), então
    // são dois sinais contra um. E o nome é o que o comprador lê antes de
    // clicar em comprar — divergir dele é entregar a bomba que não liga na
    // tomada dele.
    const volt = voltagem(p.nome) ?? valorDe("Voltagem")?.valor ?? null;

    if (!vazao || !altura) semNumero.push(p.nome);

    const nomeMin = p.nome.toLowerCase();

    // Produto sem preço não vai para a loja. O RY-15B veio com R$ 0 e estoque
    // zerado — descontinuado que ficou publicado. Um preço zero numa vitrine
    // é um produto de graça, não uma pendência de cadastro.
    const semPreco = !p.preco || p.preco <= 0;
    if (semPreco) semPrecoLista.push(`${p.sku} · ${p.nome}`);

    const produto = await prisma.produto.upsert({
      where: { slug: slugificar(p.nome) },
      update: {},
      create: {
        slug: slugificar(p.nome),
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
        ativo: !semPreco,
        vazaoMaxima: ficha ? ficha.vazaoPorAltura[0] : vazao ? Math.round(vazao) : null,
        alturaMaxima: 65,
        potenciaWatts: ficha ? ficha.potenciaWatts : potencia ? Math.round(potencia) : null,
        voltagem: volt,
        acompanhaBoia: nomeMin.includes("boia"),
        acompanhaKit: nomeMin.includes("kit"),
        familia: familiaDeProduto(p.nome, p.modelo, volt),
        versao: versaoDe(p.nome),
        pocoPolegadas: ficha ? (ficha.pocoDiametroMaximoMm ? 6 : (ficha.pocoTubularMinimoPolegadas ?? null)) : null,
        ...medidas(ficha, porNome),
        saiaProtecao: ficha?.saiaProtecaoLateral ?? false,
        curvaVazao: ficha?.vazaoPorAltura ?? [],
        especificacoes: { create: especificacoes },
        imagens: {
          create: p.imagens.map((img, i) => ({
            url: `${CDN}${img.arquivo}`,
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
      update: { para: `/produto/${slugificar(p.nome)}` },
      create: { de: `/${p.slugAntigo}/p`, para: `/produto/${slugificar(p.nome)}` },
    });
  }

  console.log(`   ${brutos.length} produtos`);

  // Medida estimada é o último recurso. Se um irmão da mesma família já tem a
  // caixa cadastrada, ela vale para todos: é a mesma bomba, na mesma caixa —
  // e o dado medido ganha de qualquer fórmula.
  for (const { familia } of await prisma.produto.groupBy({ by: ["familia"], where: { familia: { not: null } } })) {
    const medido = await prisma.produto.findFirst({
      where: { familia, medidasEstimadas: false, pesoGramas: { not: null } },
      select: { pesoGramas: true, alturaCm: true, larguraCm: true, comprimentoCm: true },
    });
    if (!medido) continue;
    await prisma.produto.updateMany({
      where: { familia, medidasEstimadas: true },
      data: { ...medido, medidasEstimadas: false },
    });
  }

  // A URL canônica de cada família é a da versão mais simples e barata: é a
  // que responde à busca genérica ("bomba rymer 2000 220v"), e é nela que os
  // links e as avaliações vão se concentrar.
  const familias = await prisma.produto.groupBy({ by: ["familia"], where: { familia: { not: null } } });
  for (const { familia } of familias) {
    const base = await prisma.produto.findFirst({
      where: { familia },
      orderBy: [{ versao: "asc" }, { preco: "asc" }],
      select: { id: true },
    });
    if (base) await prisma.produto.update({ where: { id: base.id }, data: { principalDaFamilia: true } });
  }
  console.log(`   ${familias.length} famílias de produto`);

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

  /**
   * A tarja do topo é o espaço mais visto da loja e o único lugar onde cabe
   * prova social antes de o visitante rolar a página.
   *
   * ⚠ "Marca nº 1 em vendas" é alegação publicitária: pelo CDC e pelo CONAR
   * ela precisa ser comprovável a qualquer momento, com a fonte e o recorte
   * declarados. Por isso o texto nomeia a origem (Mercado Livre) e a categoria
   * (bombas sapo) em vez de dizer apenas "a nº 1 do Brasil" — que seria
   * impossível de sustentar. Guardar o print do ranking com data.
   */
  await prisma.banner.upsert({
    where: { id: "tarja-topo-inicial" },
    update: {},
    create: {
      id: "tarja-topo-inicial",
      titulo: "A bomba sapo mais vendida do Mercado Livre · Frete grátis acima de R$ 399 · 5% de desconto no PIX",
      alt: "Vibra Vert, a bomba sapo mais vendida do Mercado Livre",
      posicao: "TARJA_TOPO",
      ativo: true,
      ordem: 0,
    },
  });

  // ── vídeos ──────────────────────────────────────────────────
  // Já existiam no tema antigo, escondidos numa vitrine da home com título
  // "Vitrine Destaques". São vídeos de produto do canal oficial: entram na
  // ficha do modelo a que se referem, onde ajudam a decidir a compra.
  const VIDEOS = [
    { youtubeId: "TsiuUbc5N5A", titulo: "Bomba Vibra Vert 900", familia: "vibra-vert-900" },
    { youtubeId: "DIZJtewGi1w", titulo: "Bomba Submersa Rymer 1500", familia: "rymer-1500" },
    { youtubeId: "_SB36kDC-vA", titulo: "Bomba Vibra Vert — modelo Vibrinha", familia: "vibrinha" },
    // O 700 não tem produto correspondente no catálogo atual: fica cadastrado
    // e inativo até a fábrica dizer se o modelo saiu de linha.
    { youtubeId: "6HRuRVpXnh0", titulo: "Bomba Vibra Vert 700", familia: null, ativo: false },
  ];

  for (const [i, v] of VIDEOS.entries()) {
    await prisma.video.upsert({
      where: { youtubeId: v.youtubeId },
      update: {},
      create: { ...v, ordem: i, tipo: "PRODUTO", ativo: v.ativo ?? true },
    });
  }

  for (const [i, b] of [
    { titulo: "Direto da fábrica, sem intermediário", alt: "Compre direto da fábrica Vibra Vert" },
    { titulo: "Não sabe qual bomba serve no seu poço?", alt: "Calculadora: qual bomba o seu poço precisa", link: "/qual-bomba" },
  ].entries()) {
    await prisma.banner.upsert({
      where: { id: `faixa-dupla-${i}` },
      update: {},
      create: { id: `faixa-dupla-${i}`, posicao: "FAIXA_DUPLA", ordem: i, ativo: true, ...b },
    });
  }

  await prisma.banner.upsert({
    where: { id: "faixa-meio-inicial" },
    update: {},
    create: {
      id: "faixa-meio-inicial",
      titulo: "Espaço para campanha — dia das mães, black friday, lançamento",
      alt: "Faixa promocional",
      posicao: "FAIXA_MEIO",
      ativo: true,
      ordem: 0,
    },
  });

  console.log(`   1 prateleira · 5 banners · ${VIDEOS.length} vídeos\n`);

  if (semPrecoLista.length) {
    console.log(`⚠  ${semPrecoLista.length} produto(s) sem preço — desativados, não vão para a vitrine:`);
    semPrecoLista.forEach((n) => console.log(`     · ${n.slice(0, 70)}`));
    console.log();
  }
  if (semGarantia.length) {
    console.log(`⚠  ${semGarantia.length} produtos ficaram SEM prazo de garantia publicado.`);
    console.log(`   O cadastro antigo dizia "2 anos" e a embalagem desmente isso em todos`);
    console.log(`   os modelos conferidos. Pedir a ficha da Vibra Vert 800 à fábrica.\n`);
  }
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
