/**
 * Páginas institucionais.
 *
 * Escritas a partir do endereço e CNPJ reais, da garantia da embalagem, do
 * direito de arrependimento de 7 dias do CDC e do que a LGPD obriga a
 * declarar. Revisadas e aprovadas pelo cliente.
 *
 * O Decreto 7.962/2013 exige que estas informações estejam acessíveis numa
 * loja virtual, e é justamente onde o comprador olha antes de digitar o
 * cartão — por isso ficam linkadas no rodapé de todas as páginas.
 */

import { TELEFONE } from "@/lib/contato";
export const EMPRESA = {
  nome: "Vibra Vert Bombas Submersas Vibratórias",
  cnpj: "21.276.576/0001-56",
  endereco: "Rua Charles Darwin, 707 · Vila Santa Catarina, São Paulo/SP",
  telefone: TELEFONE,
  email: "vendas@vibravert.com.br",
};

export type Institucional = { slug: string; titulo: string; resumo: string; corpo: string[] };

export const PAGINAS: Institucional[] = [
  {
    slug: "politica-de-entrega",
    titulo: "Política de entrega",
    resumo: "Prazos, frete e como acompanhar o seu pedido.",
    corpo: [
      "## Quando o pedido sai",
      "O pedido é separado assim que o pagamento é confirmado. No PIX a confirmação é imediata; no boleto pode levar até dois dias úteis; no cartão, alguns minutos.",
      "O envio ocorre em até 24 horas úteis após a confirmação do pagamento.",
      "## Prazo de entrega",
      "O prazo aparece no carrinho depois que você informa o CEP e varia conforme a região. Entregamos nos 27 estados.",
      "O prazo exato de cada região é calculado pelos Correios a partir do seu CEP e aparece antes de você finalizar a compra.",
      "## Frete",
      "O frete é calculado pelos Correios de acordo com o seu CEP e o peso do pedido, e aparece no carrinho antes de você finalizar a compra.",
      "## Acompanhamento",
      `Você recebe o código de rastreio por e-mail assim que o pedido é despachado. Também pode consultar pelo número do pedido em nossa página de acompanhamento, ou falar com a gente pelo telefone ${EMPRESA.telefone}.`,
      "## Se ninguém estiver no endereço",
      "A transportadora tenta a entrega mais de uma vez. Depois disso, o pedido volta para a nossa fábrica e entramos em contato para combinar um novo envio.",
    ],
  },
  {
    slug: "politica-de-troca",
    titulo: "Trocas, devoluções e garantia",
    resumo: "Seu direito de arrependimento, defeitos e o prazo de garantia de cada modelo.",
    corpo: [
      "## Arrependimento · 7 dias",
      "O artigo 49 do Código de Defesa do Consumidor dá a você o direito de desistir de uma compra feita pela internet em até **7 dias corridos** a partir do recebimento, sem precisar justificar. O produto deve estar sem uso e na embalagem original.",
      "Nesse caso, devolvemos o valor integral, incluindo o frete que você pagou.",
      "## Produto com defeito",
      "Se a bomba apresentar defeito de fabricação, a assistência é nossa: quem conserta é a fábrica, não um posto terceirizado. Fale com a gente antes de enviar qualquer coisa · na maior parte dos casos o técnico identifica o problema pelo telefone.",
      "## Garantia",
      "O prazo de garantia varia por modelo e está informado na ficha técnica de cada produto. É a garantia de fábrica contra defeito de fabricação, e não cobre mau uso · em especial, deixar a bomba trabalhar sem água, que é o que mais queima motor.",
      "Para acionar a garantia, guarde a nota fiscal e o certificado que vem na caixa.",
      "Quem compra aqui no site tem cobertura estendida em relação ao prazo de fábrica. O prazo total aplicável ao seu modelo está informado na ficha técnica do produto.",
      "## Como solicitar",
      `Entre em contato pelo telefone ${EMPRESA.telefone} ou pelo e-mail ${EMPRESA.email}, informando o número do pedido.`,
    ],
  },
  {
    slug: "politica-de-privacidade",
    titulo: "Política de privacidade",
    resumo: "Que dados guardamos, para quê, e como você pede para apagá-los.",
    corpo: [
      "## Que dados coletamos",
      "Para processar um pedido, coletamos nome, e-mail, telefone, CPF ou CNPJ e endereço de entrega. O CPF é exigido pela legislação fiscal para a emissão da nota.",
      "Os dados do cartão **não passam pelos nossos servidores**: são enviados diretamente ao Mercado Pago, que processa o pagamento.",
      "## Para que usamos",
      "Exclusivamente para processar o pedido, emitir a nota fiscal, entregar o produto e atender você em caso de dúvida, troca ou garantia. Não vendemos nem cedemos seus dados a terceiros.",
      "## Com quem compartilhamos",
      "Apenas com quem é necessário para a compra acontecer: o Mercado Pago, para processar o pagamento, e a transportadora, para entregar o produto.",
      "## Seus direitos (LGPD)",
      `A Lei Geral de Proteção de Dados garante que você peça acesso, correção ou exclusão dos seus dados a qualquer momento. Basta escrever para ${EMPRESA.email}.`,
      "Dados de pedidos já faturados são mantidos pelo prazo que a legislação fiscal exige, mesmo após um pedido de exclusão.",
      "## Cookies",
      "Usamos um cookie para guardar o seu carrinho enquanto você navega. Vídeos são carregados só quando você clica em assistir, para que o YouTube não deixe cookies de rastreio antes disso.",
      `O responsável pelo tratamento dos seus dados é ${EMPRESA.nome}, ${EMPRESA.endereco}. Pedidos relacionados à LGPD devem ser enviados para ${EMPRESA.email}.`,
    ],
  },
  {
    slug: "termos-de-uso",
    titulo: "Termos de uso",
    resumo: "As regras da loja e quem é a empresa por trás dela.",
    corpo: [
      "## Quem somos",
      `Esta loja é operada por **${EMPRESA.nome}**, CNPJ ${EMPRESA.cnpj}, com sede na ${EMPRESA.endereco}.`,
      `Contato: ${EMPRESA.telefone} · ${EMPRESA.email}`,
      "## Preços e disponibilidade",
      "Os preços exibidos valem para compras feitas neste site e podem ser diferentes dos praticados em marketplaces ou em revendedores. Um preço só está garantido depois de o pedido ser confirmado.",
      "O desconto no PIX se aplica exclusivamente a pagamentos por PIX.",
      "## Informações técnicas",
      "As especificações vêm da embalagem do fabricante. A vazão informada é medida em condições de laboratório: a vazão real depende da altura e da tubulação da sua instalação, e por isso a loja mostra a curva completa de cada modelo e oferece uma calculadora.",
      "A indicação da calculadora é uma orientação, não um laudo de engenharia. Em caso de dúvida, fale com o nosso técnico antes de comprar.",
      "## Pagamento",
      "Os pagamentos são processados pelo Mercado Pago. A loja não armazena dados de cartão.",
      "## Foro",
      "Fica eleito o foro da comarca de São Paulo/SP para dirimir eventuais controvérsias, sem prejuízo do direito do consumidor de acionar o foro do seu domicílio, nos termos do Código de Defesa do Consumidor.",
    ],
  },
];

export const acharPagina = (slug: string) => PAGINAS.find((p) => p.slug === slug);
