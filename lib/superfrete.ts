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
