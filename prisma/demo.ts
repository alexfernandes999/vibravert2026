/**
 * Pedidos e tráfego de demonstração.
 *
 * Painel vazio não se avalia: não dá para saber se o funil faz sentido, se o
 * mapa por estado é legível ou se a fila de separação funciona olhando quatro
 * caixas com zero. Isto enche o painel com uma semana plausível de loja.
 *
 * Tudo usa e-mails terminados em @demo.vibravert, e o script `limpar` apaga
 * exatamente esses. Nada de dado inventado se mistura com venda de verdade.
 */
import { PrismaClient, type PedidoStatus, type MetodoPagamento } from "@prisma/client";

const prisma = new PrismaClient();
const MARCA = "@demo.vibravert";

const PESSOAS = [
  ["Marcos Andrade", "GO", "Goiânia", "74000-000", "google / orgânico"],
  ["Hidro Poços Ltda", "MT", "Cuiabá", "78000-000", "google / orgânico"],
  ["José Ferreira", "MT", "Sorriso", "78890-000", "mercado livre / marketplace"],
  ["Rita Nogueira", "TO", "Palmas", "77000-000", "instagram / social"],
  ["Poço Certo Serviços", "BA", "Barreiras", "47800-000", "direto"],
  ["Carlos Batista", "MG", "Uberaba", "38000-000", "google / orgânico"],
  ["Ana Lúcia Prado", "SP", "Ribeirão Preto", "14000-000", "whatsapp / mensagem"],
  ["Diego Fontes", "PR", "Cascavel", "85800-000", "google / orgânico"],
  ["Sebastião Rocha", "MG", "Montes Claros", "39400-000", "direto"],
  ["Irrigação Vale Verde", "GO", "Rio Verde", "75900-000", "instagram / social"],
  ["Paulo Menezes", "SP", "Presidente Prudente", "19000-000", "google / orgânico"],
  ["Fernanda Lima", "MS", "Dourados", "79800-000", "mercado livre / marketplace"],
];

/** Distribuição parecida com a de uma loja real do ramo. */
const SITUACOES: [PedidoStatus, number][] = [
  ["ENTREGUE", 4],
  ["ENVIADO", 3],
  ["SEPARANDO", 2],
  ["PAGO", 2],
  ["AGUARDANDO_PAGAMENTO", 2],
  ["CANCELADO", 1],
];

const METODOS: [MetodoPagamento, number][] = [
  ["PIX", 7],
  ["CARTAO_CREDITO", 5],
  ["BOLETO", 2],
];

const sortear = <T,>(pesos: [T, number][]) => {
  const total = pesos.reduce((s, [, p]) => s + p, 0);
  let n = Math.random() * total;
  for (const [v, p] of pesos) if ((n -= p) <= 0) return v;
  return pesos[0][0];
};

const diasAtras = (d: number) => new Date(Date.now() - d * 864e5 - Math.random() * 6e7);

async function limpar() {
  const clientes = await prisma.cliente.findMany({
    where: { email: { endsWith: MARCA } },
    select: { id: true },
  });
  const ids = clientes.map((c) => c.id);
  if (ids.length) {
    await prisma.pedido.deleteMany({ where: { clienteId: { in: ids } } });
    await prisma.endereco.deleteMany({ where: { clienteId: { in: ids } } });
    await prisma.cliente.deleteMany({ where: { id: { in: ids } } });
  }
  await prisma.evento.deleteMany({ where: { sessao: { startsWith: "demo-" } } });
  console.log(`   removidos: ${ids.length} clientes de demonstração e os eventos`);
}

async function main() {
  const apagar = process.argv.includes("--limpar");
  await limpar();
  if (apagar) return;

  const produtos = await prisma.produto.findMany({
    where: { ativo: true },
    select: { id: true, nome: true, sku: true, preco: true },
  });
  if (!produtos.length) return console.log("   sem produtos: rode o seed antes");

  let n = 0;
  for (const [nome, uf, cidade, cep, origem] of PESSOAS) {
    const email = nome.toLowerCase().replace(/[^a-z]/g, ".").slice(0, 18) + MARCA;
    const cliente = await prisma.cliente.create({
      data: { email, nome, cpfCnpj: "12345678901", telefone: "11999990000" },
    });
    const endereco = await prisma.endereco.create({
      data: {
        clienteId: cliente.id, cep: cep.replace("-", ""), logradouro: "Rua das Palmeiras",
        numero: String(100 + Math.floor(Math.random() * 900)), bairro: "Centro",
        cidade, uf, principal: true,
      },
    });

    // Um a três itens por pedido, como acontece de verdade: bomba, às vezes
    // com kit, raramente três coisas.
    const qtdItens = Math.random() < 0.65 ? 1 : Math.random() < 0.85 ? 2 : 3;
    const escolhidos = [...produtos].sort(() => Math.random() - 0.5).slice(0, qtdItens);
    const itens = escolhidos.map((p) => ({
      produtoId: p.id,
      quantidade: Math.random() < 0.85 ? 1 : 2,
      precoUnitario: p.preco,
      nomeProduto: p.nome,
      skuProduto: p.sku,
    }));

    const subtotal = itens.reduce((s, i) => s + Number(i.precoUnitario) * i.quantidade, 0);
    const frete = subtotal >= 399 ? 0 : 39.9;
    const metodo = sortear(METODOS);
    const desconto = metodo === "PIX" ? (subtotal + frete) * 0.05 : 0;
    const status = sortear(SITUACOES);
    const criadoEm = diasAtras(Math.floor(Math.random() * 26));

    await prisma.pedido.create({
      data: {
        clienteId: cliente.id, enderecoId: endereco.id, status, metodo,
        parcelas: metodo === "CARTAO_CREDITO" ? [1, 3, 6][Math.floor(Math.random() * 3)] : 1,
        subtotal, frete, desconto, total: subtotal + frete - desconto,
        origem, criadoEm,
        pagoEm: status === "AGUARDANDO_PAGAMENTO" || status === "CANCELADO" ? null : criadoEm,
        rastreio: status === "ENVIADO" || status === "ENTREGUE"
          ? "BR" + Math.floor(Math.random() * 9e8 + 1e8) + "BR" : null,
        itens: { create: itens },
      },
    });
    n++;
  }

  // ── funil ────────────────────────────────────────────────────
  // As proporções seguem o que se vê no varejo técnico: muita visita, poucos
  // chegando ao carrinho, e uma parte deles somem no frete.
  const CANAIS = [
    ["google / orgânico", 0.46], ["direto", 0.19], ["mercado livre / marketplace", 0.14],
    ["instagram / social", 0.12], ["whatsapp / mensagem", 0.09],
  ] as const;
  const canal = () => {
    let r = Math.random();
    for (const [c, p] of CANAIS) if ((r -= p) <= 0) return c;
    return CANAIS[0][0];
  };

  const eventos: { sessao: string; etapa: "VISITA" | "PRODUTO" | "CARRINHO" | "CHECKOUT" | "PEDIDO"; origem: string; criadoEm: Date }[] = [];
  for (let i = 0; i < 620; i++) {
    const s = `demo-${i}`;
    const o = canal();
    const quando = diasAtras(Math.random() * 30);
    eventos.push({ sessao: s, etapa: "VISITA", origem: o, criadoEm: quando });
    if (Math.random() < 0.42) eventos.push({ sessao: s, etapa: "PRODUTO", origem: o, criadoEm: quando });
    else continue;
    if (Math.random() < 0.19) eventos.push({ sessao: s, etapa: "CARRINHO", origem: o, criadoEm: quando });
    else continue;
    if (Math.random() < 0.46) eventos.push({ sessao: s, etapa: "CHECKOUT", origem: o, criadoEm: quando });
    else continue;
    if (Math.random() < 0.55) eventos.push({ sessao: s, etapa: "PEDIDO", origem: o, criadoEm: quando });
  }
  await prisma.evento.createMany({ data: eventos });

  const carrinhos = eventos.filter((e) => e.etapa === "CARRINHO").length;
  const pedidos = eventos.filter((e) => e.etapa === "PEDIDO").length;

  console.log(`\n   ${n} pedidos criados`);
  console.log(`   ${eventos.length} eventos de funil · ${carrinhos} carrinhos · ${pedidos} compras`);
  console.log(`   ${carrinhos - pedidos} carrinhos abandonados`);
  console.log(`\n   para apagar tudo: npx tsx prisma/demo.ts --limpar`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
