import type { Volume, Opcao } from "@/lib/frete";

/**
 * Cotação pelo SuperFrete.
 *
 * Revende Correios e Loggi com contrato próprio, então dispensa contrato,
 * cartão de postagem e código de acesso: basta o token. Também é por onde a
 * etiqueta é comprada, o que tira a expedição do balcão da agência.
 *
 * Em compensação, o preço é o da tabela do SuperFrete, não o do contrato da
 * fábrica. Fora das capitais do Sul e Sudeste sai por volta de 15% acima do
 * contrato direto; dentro delas a Loggi ganha com folga. A escolha entre um e
 * outro é comercial, e mora em FRETE_PROVEDOR.
 */
const API = "https://api.superfrete.com/api/v0";

export const configurado = Boolean(process.env.SUPERFRETE_TOKEN);

/** PAC, SEDEX, Mini Envios e Loggi. */
const SERVICOS = "1,2,17,31";

/**
 * O SuperFrete recusa User-Agent genérico: quer saber quem está chamando, para
 * conseguir avisar quando uma integração começa a errar.
 */
const AGENTE = process.env.SUPERFRETE_AGENTE ?? "Loja Vibra Vert (contato@vibravert.com.br)";

const cepOrigem = () =>
  (process.env.FRETE_CEP_ORIGEM ?? process.env.CORREIOS_CEP_ORIGEM ?? "").replace(/\D/g, "");

type Resposta = {
  id: number;
  name: string;
  price: number | string;
  delivery_time: number;
  company?: { name?: string };
  has_error?: boolean;
  error?: string;
};

export async function cotar(cep: string, caixa: Volume, subtotal: number): Promise<Opcao[]> {
  const origem = cepOrigem();
  if (!origem) throw new Error("FRETE_CEP_ORIGEM não está definido");

  // Limites da caixa dos Correios, que o SuperFrete repassa. Mandar fora da
  // faixa não devolve preço maior: devolve erro, e a venda cai no frete fixo
  // sem ninguém entender por quê.
  const comprimento = Math.min(105, Math.max(16, Math.round(caixa.comprimentoCm)));
  const largura = Math.min(105, Math.max(11, Math.round(caixa.larguraCm)));
  const altura = Math.min(105, Math.max(2, Math.round(caixa.alturaCm)));
  const peso = Math.min(30, Math.max(0.3, caixa.pesoGramas / 1000));

  const r = await fetch(`${API}/calculator`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.SUPERFRETE_TOKEN}`,
      "User-Agent": AGENTE,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      from: { postal_code: origem },
      to: { postal_code: cep },
      services: SERVICOS,
      options: {
        own_hand: false,
        receipt: false,
        // Sem valor declarado, uma bomba extraviada é prejuízo inteiro da
        // loja: a indenização padrão cobre o frete, não a mercadoria.
        insurance_value: Math.min(subtotal, 10_000),
        use_insurance_value: subtotal > 0,
      },
      package: { height: altura, width: largura, length: comprimento, weight: peso },
    }),
    cache: "no-store",
  });

  if (!r.ok) throw new Error(`SuperFrete respondeu ${r.status}: ${(await r.text()).slice(0, 200)}`);

  const dados = await r.json();
  if (!Array.isArray(dados)) {
    throw new Error(`SuperFrete devolveu erro: ${JSON.stringify(dados).slice(0, 200)}`);
  }

  // Serviço com erro é serviço indisponível para aquele CEP, e não uma falha
  // da cotação inteira: o Mini Envios recusa acima de 30cm, por exemplo.
  return (dados as Resposta[])
    .filter((s) => !s.has_error && !s.error && Number(s.price) > 0)
    .map((s) => ({
      servico: String(s.id),
      nome: s.name,
      transportadora: s.company?.name ?? "Correios",
      valor: Number(s.price),
      prazoDias: Number(s.delivery_time ?? 0),
      estimado: false,
    }));
}

// ── compra de etiqueta ──────────────────────────────────────────

/**
 * Remetente da etiqueta.
 *
 * Vem de variável porque não é o mesmo dado do rodapé do site: o contrato de
 * frete está no CNPJ da ARF Comercio, e quem vende é a Vibra Vert. Trocar de
 * remetente não pode exigir publicar o site de novo.
 */
const remetente = () => ({
  name: process.env.REMETENTE_NOME ?? "Vibra Vert Bombas Submersas",
  address: process.env.REMETENTE_RUA ?? "Rua Charles Darwin",
  number: process.env.REMETENTE_NUMERO ?? "707",
  complement: process.env.REMETENTE_COMPLEMENTO ?? "",
  district: process.env.REMETENTE_BAIRRO ?? "Vila Santa Catarina",
  city: process.env.REMETENTE_CIDADE ?? "São Paulo",
  state_abbr: process.env.REMETENTE_UF ?? "SP",
  postal_code: cepOrigem(),
  document: (process.env.REMETENTE_DOCUMENTO ?? "21276576000156").replace(/\D/g, ""),
  phone: (process.env.REMETENTE_TELEFONE ?? "1140002440").replace(/\D/g, ""),
  email: process.env.REMETENTE_EMAIL ?? "contato@vibravert.com.br",
});

export type Destinatario = {
  nome: string;
  documento: string;
  telefone: string | null;
  email: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string | null;
  bairro: string;
  cidade: string;
  uf: string;
};

export type Etiqueta = {
  id: string;
  rastreio: string | null;
  url: string | null;
  valor: number;
};

async function chamar(caminho: string, corpo: unknown) {
  const r = await fetch(`${API}${caminho}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.SUPERFRETE_TOKEN}`,
      "User-Agent": AGENTE,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(corpo),
    cache: "no-store",
  });

  const texto = await r.text();
  if (!r.ok) throw new Error(`SuperFrete ${caminho} respondeu ${r.status}: ${texto.slice(0, 300)}`);
  return JSON.parse(texto);
}

/**
 * Compra a etiqueta e devolve o link para impressão.
 *
 * São três chamadas em sequência, e a ordem importa: o carrinho cria a
 * etiqueta pendente, o checkout debita do saldo e libera o rastreio, e só
 * então o PDF existe.
 *
 * O formato A6 (Zebra), que é o da etiquetadora térmica, é escolhido uma vez
 * na conta do SuperFrete e não vai em cada chamada. Se sair A4 na impressora,
 * é lá que se resolve, não aqui.
 */
export async function comprarEtiqueta(dados: {
  servico: string;
  destinatario: Destinatario;
  caixa: Volume;
  valorSegurado: number;
  itens: { nome: string; quantidade: number; valorUnitario: number }[];
  referencia: string;
}): Promise<Etiqueta> {
  const d = dados.destinatario;
  const so = (v: string | null | undefined) => (v ?? "").replace(/\D/g, "");

  const pedido = await chamar("/cart", {
    from: remetente(),
    to: {
      name: d.nome.slice(0, 50),
      address: d.logradouro.slice(0, 50),
      complement: (d.complemento ?? "").slice(0, 20),
      number: d.numero.slice(0, 10),
      district: d.bairro.slice(0, 50),
      city: d.cidade.slice(0, 50),
      state_abbr: d.uf.toUpperCase(),
      postal_code: so(d.cep),
      email: d.email,
      phone: so(d.telefone),
      document: so(d.documento),
    },
    service: Number(dados.servico),
    products: dados.itens.map((i) => ({
      name: i.nome.slice(0, 60),
      quantity: String(i.quantidade),
      unitary_value: i.valorUnitario.toFixed(2),
    })),
    volumes: {
      height: Math.min(105, Math.max(2, Math.round(dados.caixa.alturaCm))),
      width: Math.min(105, Math.max(11, Math.round(dados.caixa.larguraCm))),
      length: Math.min(105, Math.max(16, Math.round(dados.caixa.comprimentoCm))),
      weight: Math.min(30, Math.max(0.3, dados.caixa.pesoGramas / 1000)),
    },
    options: {
      insurance_value: Math.min(dados.valorSegurado, 10_000),
      receipt: false,
      own_hand: false,
      // A nota fiscal ainda não é emitida pela loja. Marcar como não comercial
      // é o que os Correios aceitam enquanto isso, e some no dia em que a NF
      // entrar: aí a chave vai em `invoice`.
      non_commercial: true,
      tags: [{ tag: dados.referencia, url: "" }],
    },
    platform: "Loja Vibra Vert",
  });

  if (!pedido?.id) throw new Error(`SuperFrete não devolveu id: ${JSON.stringify(pedido).slice(0, 200)}`);

  const pago = await chamar("/checkout", { orders: [pedido.id] });
  const comprado = pago?.purchase?.orders?.[0];
  if (!pago?.success || !comprado) {
    throw new Error(`checkout recusado: ${JSON.stringify(pago).slice(0, 300)}`);
  }

  // O link pode vir vazio no checkout: nesse caso pede-se separado.
  let url: string | null = comprado.print?.url || null;
  if (!url) {
    const impressao = await chamar("/tag/print", { orders: [pedido.id] });
    url = impressao?.url ?? null;
  }

  return {
    id: String(pedido.id),
    rastreio: comprado.tracking ?? null,
    url,
    valor: Number(comprado.price ?? pedido.price ?? 0),
  };
}

/** Saldo da conta. O painel avisa antes de a expedição descobrir na hora. */
export async function saldo(): Promise<number | null> {
  if (!configurado) return null;
  try {
    const r = await fetch(`${API}/user`, {
      headers: { Authorization: `Bearer ${process.env.SUPERFRETE_TOKEN}`, "User-Agent": AGENTE },
      cache: "no-store",
    });
    if (!r.ok) return null;
    return Number((await r.json()).balance ?? 0);
  } catch {
    return null;
  }
}
