/**
 * Matérias sobre água.
 *
 * A loja não tinha nenhuma página de conteúdo. Estas três são o começo: cada
 * uma responde a uma busca que já existe, e fecha levando para o produto que
 * resolve o problema descrito.
 *
 * Todo número aqui tem fonte citada e ano. Dado sobre água circula muito e
 * envelhece mal — publicar sem fonte é o jeito de a loja virar a origem de um
 * número errado, e de perder a confiança de quem confere.
 */
export type Materia = {
  slug: string;
  chapeu: string;
  titulo: string;
  resumo: string;
  metaTitulo: string;
  metaDescricao: string;
  paragrafos: string[];
  fecho: string;
  cta: { rotulo: string; href: string };
  fontes: { nome: string; url?: string }[];
  publicadaEm: string;
  destaques: { valor: string; rotulo: string }[];
};

export const MATERIAS: Materia[] = [
  {
    slug: "perdas-de-agua-no-brasil",
    chapeu: "Saneamento",
    titulo: "O Brasil perde 4 em cada 10 litros de água tratada",
    resumo:
      "Quase 40% da água que sai da estação de tratamento nunca chega à torneira. O que isso significa para quem depende só da rede.",
    metaTitulo: "O Brasil perde 4 de cada 10 litros de água tratada",
    metaDescricao:
      "39,53% da água tratada se perde antes de chegar ao consumidor, segundo o Instituto Trata Brasil. Veja os números por estado e o que isso significa para quem depende da rede.",
    destaques: [
      { valor: "39,53%", rotulo: "da água tratada se perde" },
      { valor: "4,4 bi m³", rotulo: "desperdiçados por ano" },
      { valor: "77 milhões", rotulo: "de pessoas abastecidas com o que se perde" },
    ],
    paragrafos: [
      "O Estudo de Perdas de Água 2026 do Instituto Trata Brasil, feito com a GO Associados sobre dados do SINISA de 2024, aponta que 39,53% da água tratada se perde antes de chegar à torneira do consumidor · o equivalente a 4,4 bilhões de metros cúbicos por ano, enquanto cerca de 33 milhões de brasileiros ainda não têm acesso a água potável.",
      "Esse volume desperdiçado daria para abastecer 77 milhões de pessoas durante um ano. A ineficiência é bem maior no Norte e Nordeste: Alagoas perde 66,90%, Roraima 65,97% e Pará 57,33%, todos muito acima da média nacional.",
    ],
    fecho:
      "Quem depende só da rede está apostando num sistema que perde quase metade do que produz. Poço próprio não é luxo · é garantia de que não vai faltar.",
    cta: { rotulo: "Ver bombas para poço", href: "/bombas" },
    fontes: [
      { nome: "Instituto Trata Brasil · Estudo de Perdas de Água 2026", url: "https://tratabrasil.org.br" },
    ],
    publicadaEm: "2026-08-14",
  },
  {
    slug: "metade-dos-municipios-bebe-agua-de-poco",
    chapeu: "Água subterrânea",
    titulo: "Metade dos municípios brasileiros bebe água de poço",
    resumo:
      "São 2,8 milhões de poços abastecendo 52% das cidades do país. O poço não é exceção rural: é a infraestrutura invisível de metade do Brasil.",
    metaTitulo: "Metade dos municípios brasileiros bebe água de poço",
    metaDescricao:
      "2,8 milhões de poços abastecem 52% dos municípios brasileiros e movimentam mais de R$ 100 bilhões por ano. Entenda por que a bomba submersa vibratória foi feita para eles.",
    destaques: [
      { valor: "52%", rotulo: "dos municípios usam água de poço" },
      { valor: "2,8 milhões", rotulo: "de poços no país" },
      { valor: "90%", rotulo: "dos rios seguem perenes graças aos aquíferos" },
    ],
    paragrafos: [
      "Hoje mais de 624 m³/s de água potável saem de aquíferos por meio de cerca de 2,8 milhões de poços, abastecendo total ou parcialmente 52% dos municípios brasileiros e movimentando mais de R$ 100 bilhões por ano na economia. Desses municípios, 36% são abastecidos exclusivamente por água subterrânea e 16% parcialmente · e o uso é maior justamente nas cidades menores.",
      "Cerca de 35 milhões de brasileiros sem água encanada dependem da água subterrânea. A água dos aquíferos ainda é responsável por manter 90% dos rios brasileiros perenes no período de seca.",
    ],
    fecho:
      "O poço não é exceção rural. É a infraestrutura invisível de metade do país · e é exatamente para ele que a bomba submersa vibratória foi feita.",
    cta: { rotulo: "Qual bomba eu preciso?", href: "/qual-bomba" },
    fontes: [
      { nome: "ABAS · Congresso Brasileiro de Águas Subterrâneas 2026" },
      { nome: "Cepas/IGc-USP para o Instituto Trata Brasil", url: "https://tratabrasil.org.br" },
    ],
    publicadaEm: "2026-08-14",
  },
  {
    slug: "consumo-de-agua-por-pessoa",
    chapeu: "Consumo",
    titulo: "O brasileiro gasta 50% mais água do que precisa",
    resumo:
      "A ONU considera 110 litros por dia suficientes. O consumo médio no Brasil é de 166,3. Onde essa água se perde dentro de casa.",
    metaTitulo: "O brasileiro gasta 50% mais água do que precisa",
    metaDescricao:
      "O consumo médio no Brasil é de 166,3 litros por pessoa ao dia, contra os 110 que a ONU considera suficientes. Veja onde a água se perde dentro de casa e como reduzir.",
    destaques: [
      { valor: "166,3 L", rotulo: "por pessoa ao dia no Brasil" },
      { valor: "110 L", rotulo: "é o que a ONU considera suficiente" },
      { valor: "10 mil L", rotulo: "por mês num vazamento pequeno" },
    ],
    paragrafos: [
      "A ONU considera 110 litros por pessoa por dia suficientes para as necessidades básicas, mas o consumo médio brasileiro é de 166,3 litros · 51% acima do recomendado, segundo o Instituto Trata Brasil.",
      "Dentro de casa, um banho de 5 minutos usa de 45 a 90 litros, uma descarga de 6 a 12 litros, lavar louça com a torneira aberta chega a 100 litros e uma máquina de lavar consome de 100 a 150 litros por ciclo. Um vazamento pequeno pode desperdiçar mais de 10 mil litros por mês.",
    ],
    fecho:
      "Bomba bem dimensionada e instalação sem vazamento é economia de água e de energia. Os 11 erros que a gente lista aqui no site são, na prática, os maiores desperdiçadores.",
    cta: { rotulo: "Ver os 11 erros de instalação", href: "/#erros" },
    fontes: [{ nome: "ONU" }, { nome: "Instituto Trata Brasil", url: "https://tratabrasil.org.br" }],
    publicadaEm: "2026-08-14",
  },
];

export const materiaPorSlug = (slug: string) => MATERIAS.find((m) => m.slug === slug) ?? null;
