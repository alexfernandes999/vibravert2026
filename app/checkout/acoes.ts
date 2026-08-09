"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { obterCarrinho } from "@/lib/carrinho";
import { buscarCep, soDigitos } from "@/lib/cep";
import { cobrar, configurado } from "@/lib/mercadopago";
import { pedidoRecebido } from "@/lib/email";
import { DESCONTO_PIX } from "@/lib/loja";

export async function consultarCep(cep: string) {
  return buscarCep(cep);
}

const Formulario = z.object({
  nome: z.string().trim().min(3, "Informe o nome completo"),
  email: z.string().trim().email("E-mail inválido"),
  cpf: z.string().transform(soDigitos).refine((v) => v.length === 11 || v.length === 14, "CPF ou CNPJ inválido"),
  telefone: z.string().transform(soDigitos).refine((v) => v.length >= 10, "Telefone inválido"),
  cep: z.string().transform(soDigitos).refine((v) => v.length === 8, "CEP inválido"),
  logradouro: z.string().trim().min(3, "Informe o endereço"),
  numero: z.string().trim().min(1, "Informe o número"),
  complemento: z.string().trim().optional(),
  bairro: z.string().trim().min(2, "Informe o bairro"),
  cidade: z.string().trim().min(2, "Informe a cidade"),
  uf: z.string().trim().length(2, "UF inválida"),
  metodo: z.enum(["PIX", "CARTAO_CREDITO", "BOLETO"]),
  parcelas: z.coerce.number().int().min(1).max(6).default(1),
  tokenCartao: z.string().optional(),
});

export type EstadoCheckout = { erro?: string; campos?: Record<string, string> };

/**
 * Fecha o pedido.
 *
 * O pedido é gravado ANTES de cobrar. Se a cobrança falhar, fica um pedido
 * aguardando pagamento — recuperável, com o cliente e o endereço já
 * registrados. O contrário, cobrar antes de gravar, produz dinheiro recebido
 * sem pedido correspondente, que é o pior estado possível para quem atende.
 */
export async function finalizar(_estado: EstadoCheckout, dados: FormData): Promise<EstadoCheckout> {
  const bruto = Object.fromEntries(dados.entries());
  const v = Formulario.safeParse(bruto);

  if (!v.success) {
    const campos: Record<string, string> = {};
    for (const e of v.error.issues) campos[String(e.path[0])] = e.message;
    return { erro: "Confira os campos destacados.", campos };
  }

  const carrinho = await obterCarrinho();
  if (!carrinho.itens.length) return { erro: "Seu carrinho está vazio." };

  const d = v.data;
  // O desconto do PIX só existe no PIX. Cobrar o valor com desconto no cartão
  // seria vender abaixo do combinado sem ninguém perceber.
  const total = d.metodo === "PIX" ? carrinho.total * (1 - DESCONTO_PIX) : carrinho.total;

  const cliente = await prisma.cliente.upsert({
    where: { email: d.email },
    update: { nome: d.nome, cpfCnpj: d.cpf, telefone: d.telefone },
    create: { email: d.email, nome: d.nome, cpfCnpj: d.cpf, telefone: d.telefone },
  });

  const endereco = await prisma.endereco.create({
    data: {
      clienteId: cliente.id,
      cep: d.cep,
      logradouro: d.logradouro,
      numero: d.numero,
      complemento: d.complemento || null,
      bairro: d.bairro,
      cidade: d.cidade,
      uf: d.uf.toUpperCase(),
      principal: true,
    },
  });

  const pedido = await prisma.pedido.create({
    data: {
      clienteId: cliente.id,
      enderecoId: endereco.id,
      metodo: d.metodo,
      parcelas: d.metodo === "CARTAO_CREDITO" ? d.parcelas : 1,
      subtotal: carrinho.subtotal,
      frete: carrinho.frete,
      desconto: carrinho.total - total,
      total,
      itens: {
        create: carrinho.itens.map((i) => ({
          produtoId: i.id,
          quantidade: i.qtd,
          precoUnitario: i.preco,
          // Nome e preço ficam congelados no item: o pedido tem de continuar
          // legível daqui a um ano, mesmo que o produto mude ou saia do ar.
          nomeProduto: i.nome,
          skuProduto: i.sku,
        })),
      },
    },
  });

  const cobranca = await cobrar({
    metodo: d.metodo,
    valor: total,
    parcelas: pedido.parcelas,
    comprador: { nome: d.nome, email: d.email, cpf: d.cpf, telefone: d.telefone },
    itens: carrinho.itens.map((i) => ({
      titulo: i.nome,
      quantidade: i.qtd,
      precoUnitario: i.preco,
      sku: i.sku,
    })),
    pedidoNumero: pedido.numero,
  });

  if (cobranca.ok) {
    await prisma.pedido.update({
      where: { id: pedido.id },
      data: { mpPagamentoId: cobranca.pagamentoId, mpStatus: cobranca.status },
    });
  } else if (cobranca.erro !== "sem-credencial") {
    await prisma.pedido.update({
      where: { id: pedido.id },
      data: { mpDetalhe: cobranca.erro?.slice(0, 400) },
    });
  }

  // O e-mail vai depois de tudo gravado e nunca bloqueia o pedido: se o envio
  // falhar, o cliente ainda tem a página de acompanhamento.
  const completo = await prisma.pedido.findUnique({
    where: { id: pedido.id },
    include: { itens: true, endereco: true, cliente: true },
  });
  if (completo) await pedidoRecebido(completo);

  (await cookies()).delete("carrinho");
  redirect(`/pedido/${pedido.numero}`);
}

export async function pagamentoDisponivel() {
  return configurado;
}
