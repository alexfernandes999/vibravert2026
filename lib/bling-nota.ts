import { prisma } from "@/lib/prisma";
import { chamar } from "@/lib/bling";
import { codigoBling } from "@/lib/bling-mapa";

/**
 * Pedidos da loja dentro do Bling.
 *
 * O que sobe daqui é o **pedido de venda**, nunca a nota fiscal. A diferença
 * importa: o pedido é um registro interno, editável e apagável; a nota vai
 * para a SEFAZ e, uma vez autorizada, só sai de lá com cancelamento formal e
 * prazo. Uma loja que emite nota sozinha erra em silêncio · endereço fora do
 * estado muda o CFOP, cliente com inscrição estadual muda a tributação, e
 * quem descobre é o contador, no mês seguinte.
 *
 * Então a loja entrega o pedido pronto e conferível, e quem responde pelo
 * fiscal aperta o botão de emitir dentro do Bling. É um clique a mais e evita
 * a classe inteira de erro que custa dinheiro.
 */

type Contato = { id: number };

/**
 * Acha o cliente pelo documento, ou cria.
 *
 * A busca é por CPF/CNPJ e não por nome: nome repete, e cadastrar a mesma
 * pessoa duas vezes quebra o histórico de compras dela dentro do Bling.
 */
async function acharOuCriarContato(c: {
  nome: string;
  email: string;
  cpfCnpj: string;
  telefone: string | null;
  endereco: {
    cep: string;
    logradouro: string;
    numero: string;
    complemento: string | null;
    bairro: string;
    cidade: string;
    uf: string;
  };
}): Promise<number> {
  const doc = c.cpfCnpj.replace(/\D/g, "");

  const achado = await chamar<{ data?: Contato[] }>(
    `/contatos?numeroDocumento=${encodeURIComponent(doc)}`,
  ).catch(() => ({ data: [] }));
  if (achado.data?.[0]?.id) return achado.data[0].id;

  // O Bling recusa telefone fora do formato brasileiro, e recusa também
  // string vazia · então ou vai bonito, ou não vai campo nenhum.
  const cel = (c.telefone ?? "").replace(/\D/g, "");
  const celular =
    cel.length === 11
      ? `(${cel.slice(0, 2)}) ${cel.slice(2, 7)}-${cel.slice(7)}`
      : cel.length === 10
        ? `(${cel.slice(0, 2)}) ${cel.slice(2, 6)}-${cel.slice(6)}`
        : null;

  const criado = await chamar<{ data?: Contato }>("/contatos", {
    method: "POST",
    body: JSON.stringify({
      nome: c.nome,
      tipo: doc.length > 11 ? "J" : "F",
      numeroDocumento: doc,
      // "A" de ativo. Sem isto o Bling recusa o cadastro inteiro.
      situacao: "A",
      email: c.email,
      ...(celular ? { celular } : {}),
      // "1" = contribuinte isento. A grande maioria de quem compra bomba pelo
      // site é pessoa física, e marcar contribuinte por engano muda o imposto.
      indicadorInscricaoEstadual: 9,
      endereco: {
        geral: {
          endereco: c.endereco.logradouro,
          numero: c.endereco.numero,
          complemento: c.endereco.complemento ?? "",
          bairro: c.endereco.bairro,
          cep: c.endereco.cep.replace(/\D/g, ""),
          municipio: c.endereco.cidade,
          uf: c.endereco.uf.toUpperCase(),
        },
      },
    }),
  });

  if (!criado.data?.id) throw new Error("o Bling não devolveu o id do contato criado");
  return criado.data.id;
}

/** O id que o Bling usa para um SKU nosso. */
async function acharProduto(sku: string): Promise<number> {
  const cod = codigoBling(sku);
  const r = await chamar<{ data?: { id: number }[] }>(
    `/produtos?codigo=${encodeURIComponent(cod)}`,
  );
  const id = r.data?.[0]?.id;
  if (!id) {
    throw new Error(
      `O produto ${sku} não existe no Bling${cod !== sku ? ` (procurei por ${cod})` : ""}. Cadastre lá antes de enviar o pedido.`,
    );
  }
  return id;
}

/**
 * Manda um pedido nosso para o Bling.
 *
 * Idempotente pelo `blingPedidoId`: chamar duas vezes não duplica. Pedido
 * duplicado no ERP vira nota duplicada, e nota duplicada vira imposto pago
 * duas vezes.
 */
export async function enviarPedido(pedidoId: string) {
  const p = await prisma.pedido.findUnique({
    where: { id: pedidoId },
    include: { cliente: true, endereco: true, itens: true },
  });
  if (!p) throw new Error("pedido não encontrado");
  if (p.blingPedidoId) return { jaEstava: true, blingPedidoId: p.blingPedidoId };

  const contatoId = await acharOuCriarContato({
    nome: p.cliente.nome,
    email: p.cliente.email,
    cpfCnpj: p.cliente.cpfCnpj ?? "",
    telefone: p.cliente.telefone,
    endereco: p.endereco,
  });

  // Em série, de propósito: o Bling limita a três chamadas por segundo e
  // devolve 429 sem dó. Um pedido tem poucos itens · não vale a pena correr.
  const itens = [];
  for (const i of p.itens) {
    itens.push({
      codigo: codigoBling(i.skuProduto),
      descricao: i.nomeProduto.slice(0, 120),
      unidade: "UN",
      quantidade: i.quantidade,
      valor: Number(i.precoUnitario),
      produto: { id: await acharProduto(i.skuProduto) },
    });
  }

  const corpo = {
    // O número da loja é o nosso: é por ele que alguém no Bling acha o pedido
    // quando o cliente liga citando o número que recebeu por e-mail.
    numeroLoja: String(p.numero),
    data: p.criadoEm.toISOString().slice(0, 10),
    contato: { id: contatoId },
    itens,
    ...(Number(p.desconto) > 0 ? { desconto: { valor: Number(p.desconto), unidade: "REAL" } } : {}),
    transporte: {
      frete: Number(p.frete),
      ...(p.freteServico ? { contato: { nome: p.freteServico } } : {}),
      etiqueta: {
        nome: p.cliente.nome,
        endereco: p.endereco.logradouro,
        numero: p.endereco.numero,
        complemento: p.endereco.complemento ?? "",
        bairro: p.endereco.bairro,
        municipio: p.endereco.cidade,
        uf: p.endereco.uf.toUpperCase(),
        cep: p.endereco.cep.replace(/\D/g, ""),
      },
    },
    observacoes: [
      `Pedido ${p.numero} da Loja Oficial Vibra Vert.`,
      `Pagamento: ${p.metodo}${p.parcelas > 1 ? ` em ${p.parcelas}x` : ""}.`,
      p.freteServico ? `Frete: ${p.freteServico}.` : null,
    ]
      .filter(Boolean)
      .join(" "),
  };

  const r = await chamar<{ data?: { id: number } }>("/pedidos/vendas", {
    method: "POST",
    body: JSON.stringify(corpo),
  });

  const id = r.data?.id;
  if (!id) throw new Error("o Bling não devolveu o id do pedido criado");

  await prisma.pedido.update({
    where: { id: p.id },
    data: { blingPedidoId: String(id) },
  });

  return { jaEstava: false, blingPedidoId: String(id) };
}
