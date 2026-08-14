"use server";

import { prisma } from "@/lib/prisma";
import { autenticado } from "@/lib/admin-auth";
import { brl } from "@/lib/formato";

/**
 * A Vibrinha respondendo sobre a loja, dentro do painel.
 *
 * Não usa modelo de linguagem, e isso é decisão, não limitação. Duas razões:
 *
 * 1. Custa dinheiro por pergunta, e a loja ainda não vendeu a primeira bomba.
 * 2. Pergunta sobre número é o pior caso para um modelo de linguagem. Ele
 *    responde com a mesma confiança quando sabe e quando inventa · e um
 *    faturamento inventado no painel é pior que nenhum painel.
 *
 * Aqui cada resposta é uma consulta ao banco. Se a Vibrinha não entende a
 * pergunta, ela diz que não entendeu e mostra o que sabe responder · o que é
 * mais útil que uma resposta plausível e errada.
 *
 * Trocar por um modelo de verdade depois é fácil: as funções abaixo já são as
 * ferramentas que ele chamaria.
 */
export type Resposta = { texto: string; numeros?: { r: string; v: string }[]; ir?: { r: string; href: string } };

const PAGOS = ["PAGO", "SEPARANDO", "ENVIADO", "ENTREGUE"] as const;

const sem = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Quantos dias a pergunta pede. "Hoje" é 1, "semana" é 7, o padrão é 30. */
function periodo(q: string) {
  if (/\bhoje\b/.test(q)) return { dias: 1, r: "hoje" };
  if (/\bontem\b/.test(q)) return { dias: 2, r: "nos últimos 2 dias" };
  if (/\bsemana\b/.test(q)) return { dias: 7, r: "nos últimos 7 dias" };
  if (/\b(mes|mês)\b/.test(q)) return { dias: 30, r: "nos últimos 30 dias" };
  if (/\b(ano|anual)\b/.test(q)) return { dias: 365, r: "nos últimos 12 meses" };
  const n = q.match(/(\d{1,3})\s*dias?/);
  if (n) return { dias: Number(n[1]), r: `nos últimos ${n[1]} dias` };
  return { dias: 30, r: "nos últimos 30 dias" };
}

async function vendas(dias: number, rotulo: string): Promise<Resposta> {
  const desde = new Date(Date.now() - dias * 864e5);
  const where = { status: { in: [...PAGOS] }, criadoEm: { gte: desde } };
  const [agg, qtd] = await Promise.all([
    prisma.pedido.aggregate({ where, _sum: { total: true }, _avg: { total: true } }),
    prisma.pedido.count({ where }),
  ]);

  if (!qtd) {
    return {
      texto: `Nenhuma venda paga ${rotulo}. Assim que o primeiro pedido for confirmado, ele aparece aqui.`,
      ir: { r: "Ver os pedidos", href: "/admin/pedidos" },
    };
  }

  return {
    texto: `${rotulo === "hoje" ? "Hoje" : `Foram ${qtd} ${qtd === 1 ? "venda" : "vendas"} ${rotulo}`}${rotulo === "hoje" ? ` foram ${qtd} ${qtd === 1 ? "venda" : "vendas"}` : ""}.`,
    numeros: [
      { r: "Faturamento", v: brl(Number(agg._sum.total ?? 0)) },
      { r: "Pedidos pagos", v: String(qtd) },
      { r: "Ticket médio", v: brl(Number(agg._avg.total ?? 0)) },
    ],
    ir: { r: "Abrir o painel", href: "/admin" },
  };
}

async function abandonados(dias: number, rotulo: string): Promise<Resposta> {
  const desde = new Date(Date.now() - dias * 864e5);
  const [parados, carrinhos, compras] = await Promise.all([
    prisma.pedido.findMany({
      where: { status: "AGUARDANDO_PAGAMENTO", criadoEm: { gte: desde } },
      select: { total: true },
    }),
    prisma.evento.findMany({
      where: { etapa: "CARRINHO", criadoEm: { gte: desde } },
      select: { sessao: true },
      distinct: ["sessao"],
    }),
    prisma.evento.findMany({
      where: { etapa: "PEDIDO", criadoEm: { gte: desde } },
      select: { sessao: true },
      distinct: ["sessao"],
    }),
  ]);

  const semContato = Math.max(0, carrinhos.length - compras.length - parados.length);
  const valor = parados.reduce((s, p) => s + Number(p.total), 0);

  if (!parados.length && !semContato) {
    return { texto: `Nenhum carrinho abandonado ${rotulo}. Nada parado para recuperar.` };
  }

  return {
    texto:
      `${rotulo === "hoje" ? "Hoje" : `${rotulo[0].toUpperCase()}${rotulo.slice(1)}`}, ` +
      `${parados.length} ${parados.length === 1 ? "pessoa parou" : "pessoas pararam"} na hora de pagar · essas dá para chamar, ` +
      `porque já deixaram nome e telefone.` +
      (semContato ? ` Outras ${semContato} montaram carrinho e saíram antes de se identificar.` : ""),
    numeros: [
      { r: "Dá para chamar", v: String(parados.length) },
      { r: "Valor parado", v: brl(valor) },
      { r: "Sem contato", v: String(semContato) },
    ],
    ir: { r: "Recuperar essas vendas", href: "/admin/recuperar-vendas" },
  };
}

async function funil(dias: number, rotulo: string): Promise<Resposta> {
  const desde = new Date(Date.now() - dias * 864e5);
  const etapas = await prisma.evento.groupBy({
    by: ["etapa"],
    where: { criadoEm: { gte: desde } },
    _count: { sessao: true },
  });
  const n = (e: string) => etapas.find((x) => x.etapa === e)?._count.sessao ?? 0;
  const v = n("VISITA");

  if (!v) return { texto: `Ninguém visitou a loja ${rotulo}. O funil começa a encher com a primeira visita.` };

  return {
    texto:
      `${rotulo[0].toUpperCase()}${rotulo.slice(1)}, ${v} ${v === 1 ? "pessoa entrou" : "pessoas entraram"} na loja. ` +
      `Dessas, ${n("CARRINHO")} montaram carrinho e ${n("PEDIDO")} fecharam pedido.`,
    numeros: [
      { r: "Visitas", v: String(v) },
      { r: "Viram produto", v: String(n("PRODUTO")) },
      { r: "Carrinho", v: String(n("CARRINHO")) },
      { r: "Compraram", v: String(n("PEDIDO")) },
    ],
    ir: { r: "Ver o funil", href: "/admin" },
  };
}

async function maisVendida(dias: number, rotulo: string): Promise<Resposta> {
  const desde = new Date(Date.now() - dias * 864e5);
  const itens = await prisma.pedidoItem.groupBy({
    by: ["nomeProduto"],
    where: { pedido: { status: { in: [...PAGOS] }, criadoEm: { gte: desde } } },
    _sum: { quantidade: true },
    orderBy: { _sum: { quantidade: "desc" } },
    take: 3,
  });

  if (!itens.length) {
    return { texto: `Ainda não houve venda paga ${rotulo}, então não dá para dizer qual bomba sai mais.` };
  }

  return {
    texto: `A que mais saiu ${rotulo} foi a ${itens[0].nomeProduto}.`,
    numeros: itens.map((i) => ({ r: i.nomeProduto.slice(0, 40), v: `${i._sum.quantidade} un` })),
    ir: { r: "Ver os produtos", href: "/admin/produtos" },
  };
}

async function estoque(): Promise<Resposta> {
  const baixo = await prisma.estoque.findMany({
    where: { quantidade: { lte: 5 } },
    include: { produto: { select: { nome: true } } },
    take: 5,
  });
  const total = await prisma.estoque.aggregate({ _sum: { quantidade: true } });

  if (!baixo.length) {
    return {
      texto: `Nenhuma bomba com estoque baixo. No total são ${total._sum.quantidade ?? 0} unidades cadastradas.`,
      ir: { r: "Ver o estoque", href: "/admin/estoque" },
    };
  }

  return {
    texto: `${baixo.length} ${baixo.length === 1 ? "produto está" : "produtos estão"} com estoque baixo.`,
    numeros: baixo.map((b) => ({ r: b.produto.nome.slice(0, 40), v: `${b.quantidade} un` })),
    ir: { r: "Ver o estoque", href: "/admin/estoque" },
  };
}

async function origem(dias: number, rotulo: string): Promise<Resposta> {
  const desde = new Date(Date.now() - dias * 864e5);
  const por = await prisma.evento.groupBy({
    by: ["origem"],
    where: { criadoEm: { gte: desde }, etapa: "VISITA" },
    _count: { sessao: true },
    orderBy: { _count: { sessao: "desc" } },
    take: 5,
  });

  if (!por.length) return { texto: `Sem visitas registradas ${rotulo}.` };

  return {
    texto: `De onde vieram as visitas ${rotulo}:`,
    numeros: por.map((p) => ({ r: p.origem ?? "direto", v: String(p._count.sessao) })),
    ir: { r: "Ver o painel", href: "/admin" },
  };
}

async function pendencias(): Promise<Resposta> {
  const [aSeparar, aguardando, semCurva] = await Promise.all([
    prisma.pedido.count({ where: { status: { in: ["PAGO", "SEPARANDO"] } } }),
    prisma.pedido.count({ where: { status: "AGUARDANDO_PAGAMENTO" } }),
    prisma.produto.count({ where: { ativo: true, curvaVazao: { isEmpty: true } } }),
  ]);

  const linhas = [
    aSeparar && `${aSeparar} ${aSeparar === 1 ? "pedido esperando" : "pedidos esperando"} para separar e despachar`,
    aguardando && `${aguardando} ${aguardando === 1 ? "pedido parado" : "pedidos parados"} no pagamento`,
    semCurva && `${semCurva} ${semCurva === 1 ? "produto" : "produtos"} sem curva de vazão · ficam fora da calculadora`,
  ].filter(Boolean) as string[];

  return {
    texto: linhas.length ? `O que precisa de atenção agora:\n· ${linhas.join("\n· ")}` : "Nada pendente por aqui. Tudo em dia.",
    ir: aSeparar ? { r: "Ver os pedidos", href: "/admin/pedidos" } : undefined,
  };
}

const NAO_ENTENDI: Resposta = {
  texto:
    "Não peguei essa. Eu respondo sobre:\n" +
    "· como foram as vendas · hoje, na semana, no mês\n" +
    "· quantos carrinhos abandonados\n" +
    "· como está o funil de vendas\n" +
    "· qual bomba mais vendeu\n" +
    "· como está o estoque\n" +
    "· de onde vêm as visitas\n" +
    "· o que está pendente",
};

export async function perguntar(pergunta: string): Promise<Resposta> {
  if (!(await autenticado())) return { texto: "Sua sessão expirou. Entre de novo." };

  const q = sem(pergunta);
  const { dias, r } = periodo(q);

  // A ordem importa: "carrinho abandonado" também casa com "venda", e quem
  // pergunta por abandono quer o abandono, não o faturamento.
  if (/abandon|parad|nao pagou|nao comprou|desistiu|carrinho/.test(q)) return abandonados(dias, r);
  if (/funil|etapa|conversao|converte|visita.*compr|quantos entraram/.test(q)) return funil(dias, r);
  if (/mais vend|mais sai|campea|top|melhor produto|qual bomba/.test(q)) return maisVendida(dias, r);
  if (/estoque|acabando|reposicao|quantas tem|sobrou/.test(q)) return estoque();
  if (/origem|de onde|canal|trafego|google|instagram|vieram/.test(q)) return origem(dias, r);
  if (/pendent|falta|atencao|precisa|fazer agora|separar/.test(q)) return pendencias();
  if (/venda|vendeu|faturament|fatur|receita|ganhei|ticket|pedido/.test(q)) return vendas(dias, r);

  return NAO_ENTENDI;
}
