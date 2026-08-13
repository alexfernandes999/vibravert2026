import { FRETE_GRATIS_ACIMA, FRETE_PADRAO } from "@/lib/loja";
import * as superfrete from "@/lib/superfrete";
import * as correios from "@/lib/correios";

/**
 * Camada de frete.
 *
 * Duas transportadoras atrás de uma interface só. O padrão é o SuperFrete, que
 * não exige contrato e ainda traz a Loggi; o contrato direto dos Correios
 * continua disponível trocando FRETE_PROVEDOR, porque o contrato negociado da
 * fábrica sai mais barato fora das capitais do Sul e Sudeste.
 *
 * Quem chama não sabe qual é qual, e é isso que permite trocar sem mexer no
 * carrinho, no checkout nem no painel.
 */
export type Volume = {
  pesoGramas: number;
  alturaCm: number;
  larguraCm: number;
  comprimentoCm: number;
  quantidade: number;
};

export type Opcao = {
  servico: string;
  nome: string;
  transportadora: string;
  valor: number;
  prazoDias: number;
  estimado: boolean;
};

const provedor = () => (process.env.FRETE_PROVEDOR ?? "superfrete").toLowerCase();

export const configurado = () =>
  provedor() === "correios" ? correios.configurado : superfrete.configurado;

export const nomeDoProvedor = () => (provedor() === "correios" ? "Correios (contrato)" : "SuperFrete");

/**
 * Os Correios cobram pelo maior entre peso real e peso cubado. Ignorar a
 * cubagem é subcobrar frete de caixa grande e leve, e o prejuízo aparece só na
 * fatura do mês seguinte.
 */
export function pesoConsiderado(v: Volume[]) {
  const real = v.reduce((s, i) => s + (i.pesoGramas * i.quantidade) / 1000, 0);
  const cubado = v.reduce(
    (s, i) => s + ((i.alturaCm * i.larguraCm * i.comprimentoCm) / 6000) * i.quantidade,
    0,
  );
  return { real, cubado, cobravel: Math.max(real, cubado) };
}

/**
 * Uma caixa só para o pedido inteiro. Empilhar as bombas numa caixa maior é o
 * que a expedição faz de verdade — somar o volume de cada uma como se fossem
 * pacotes separados infla o frete e derruba a conversão.
 */
export function consolidar(v: Volume[]): Volume {
  const total = v.reduce((s, i) => s + i.quantidade, 0);
  const maior = v.reduce((a, b) => (a.alturaCm > b.alturaCm ? a : b));
  return {
    pesoGramas: v.reduce((s, i) => s + i.pesoGramas * i.quantidade, 0),
    alturaCm: maior.alturaCm,
    larguraCm: Math.max(...v.map((i) => i.larguraCm)) + (total > 1 ? 4 : 0),
    comprimentoCm: Math.max(...v.map((i) => i.comprimentoCm)) * Math.ceil(total / 2),
    quantidade: 1,
  };
}

const fixo = (gratis: boolean): Opcao[] => [
  {
    servico: "fixo",
    nome: "Entrega padrão",
    transportadora: "Correios",
    valor: gratis ? 0 : FRETE_PADRAO,
    prazoDias: 7,
    estimado: true,
  },
];

export async function calcular(
  cepDestino: string,
  volumes: Volume[],
  subtotal: number,
): Promise<Opcao[]> {
  const cep = cepDestino.replace(/\D/g, "");
  const gratis = subtotal >= FRETE_GRATIS_ACIMA;

  if (!configurado() || cep.length !== 8 || !volumes.length) return fixo(gratis);

  try {
    const cotar = provedor() === "correios" ? correios.cotar : superfrete.cotar;
    const opcoes = await cotar(cep, consolidar(volumes), subtotal);
    if (!opcoes.length) return fixo(gratis);

    // O frete grátis vale para a opção mais barata, não para a mais rápida:
    // prometer entrega expressa de graça é dar de presente a diferença entre
    // as duas, que numa bomba para o Norte passa de cem reais.
    const ordenadas = opcoes.sort((a, b) => a.valor - b.valor);
    return gratis ? ordenadas.map((o, i) => (i === 0 ? { ...o, valor: 0 } : o)) : ordenadas;
  } catch (e) {
    // Transportadora fora do ar não pode travar a venda: cai no frete fixo.
    console.error("[frete] cotação falhou:", e);
    return fixo(gratis);
  }
}
