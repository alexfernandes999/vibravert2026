/**
 * Cálculo de frete pelos Correios.
 *
 * Usa a API CWS, que exige contrato. O web service antigo — `ws.correios.com.br`,
 * que respondia sem cadastro — foi desativado, e código que ainda aponte para
 * ele está morto.
 *
 * Como o módulo do Mercado Pago, este declara quando não tem credencial em vez
 * de estourar no meio do carrinho: sem contrato configurado, a loja cai no
 * frete fixo e diz isso.
 */
import { FRETE_GRATIS_ACIMA, FRETE_PADRAO } from "@/lib/loja";

const API = "https://api.correios.com.br";

export const configurado = Boolean(
  process.env.CORREIOS_USUARIO &&
    process.env.CORREIOS_CODIGO_ACESSO &&
    process.env.CORREIOS_CARTAO_POSTAGEM &&
    process.env.CORREIOS_CEP_ORIGEM,
);

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
  valor: number;
  prazoDias: number;
  estimado: boolean;
};

/**
 * Os Correios cobram pelo maior entre peso real e peso cubado. Ignorar a
 * cubagem é subcobrar frete de caixa grande e leve — e o prejuízo aparece só
 * na fatura do mês seguinte.
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
function consolidar(v: Volume[]): Volume {
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

let cacheToken: { token: string; expira: number } | null = null;

async function token() {
  if (cacheToken && cacheToken.expira > Date.now() + 60_000) return cacheToken.token;

  const basico = Buffer.from(
    `${process.env.CORREIOS_USUARIO}:${process.env.CORREIOS_CODIGO_ACESSO}`,
  ).toString("base64");

  const r = await fetch(`${API}/token/v1/autentica/cartaopostagem`, {
    method: "POST",
    headers: { Authorization: `Basic ${basico}`, "Content-Type": "application/json" },
    body: JSON.stringify({ numero: process.env.CORREIOS_CARTAO_POSTAGEM }),
  });
  if (!r.ok) throw new Error(`autenticação dos Correios falhou (${r.status})`);

  const d = await r.json();
  cacheToken = { token: d.token, expira: new Date(d.expiraEm).getTime() };
  return d.token as string;
}

/**
 * Códigos de contrato, que são diferentes dos públicos.
 *
 * O adicional muda por serviço e não é intercambiável: pedir o 064 no SEDEX
 * volta ERP-054. Vem junto do serviço para os dois nunca se separarem.
 */
const SERVICOS = [
  { codigo: process.env.CORREIOS_SERVICO_PAC ?? "03298", nome: "PAC", declarado: "064" },
  { codigo: process.env.CORREIOS_SERVICO_SEDEX ?? "03220", nome: "SEDEX", declarado: "019" },
];

/**
 * Valor declarado, dentro da faixa que os Correios aceitam.
 *
 * Sem declarar, uma bomba de setecentos reais extraviada é prejuízo inteiro da
 * loja — os Correios indenizam o valor do frete, não o da mercadoria. Custa
 * cerca de 1% a mais no frete, e é o seguro mais barato que existe.
 *
 * A faixa vem da própria API (ERP-013): abaixo do mínimo o adicional não é
 * aceito, e acima do teto a cotação inteira é recusada.
 */
const DECLARADO_MIN = 25.63;
const DECLARADO_MAX = 4668.29;

export async function calcular(cepDestino: string, volumes: Volume[], subtotal: number): Promise<Opcao[]> {
  const cep = cepDestino.replace(/\D/g, "");
  const gratis = subtotal >= FRETE_GRATIS_ACIMA;

  if (!configurado || cep.length !== 8 || !volumes.length) {
    return [
      {
        servico: "fixo",
        nome: "Entrega padrão",
        valor: gratis ? 0 : FRETE_PADRAO,
        prazoDias: 7,
        estimado: true,
      },
    ];
  }

  const caixa = consolidar(volumes);
  const { cobravel } = pesoConsiderado([caixa]);

  try {
    const t = await token();
    const opcoes = await Promise.all(
      SERVICOS.map(async (s) => {
        const q = new URLSearchParams({
          cepOrigem: process.env.CORREIOS_CEP_ORIGEM!,
          cepDestino: cep,
          psObjeto: String(Math.max(300, Math.round(cobravel * 1000))),
          tpObjeto: "2",
          comprimento: String(Math.max(16, caixa.comprimentoCm)),
          largura: String(Math.max(11, caixa.larguraCm)),
          altura: String(Math.max(2, caixa.alturaCm)),
        });

        // O valor sozinho volta ERP-052: os Correios querem o código do
        // adicional declarado junto, e com ponto decimal, nunca vírgula.
        if (subtotal >= DECLARADO_MIN) {
          q.set("servicosAdicionais", s.declarado);
          q.set("vlDeclarado", Math.min(subtotal, DECLARADO_MAX).toFixed(2));
        }

        // O prazo não conhece nem peso nem adicional: mandar os mesmos
        // parâmetros do preço só aumenta a chance de recusa por validação.
        const qp = new URLSearchParams({
          cepOrigem: process.env.CORREIOS_CEP_ORIGEM!,
          cepDestino: cep,
        });

        const [preco, prazo] = await Promise.all([
          fetch(`${API}/preco/v1/nacional/${s.codigo}?${q}`, { headers: { Authorization: `Bearer ${t}` } }).then((r) => r.json()),
          fetch(`${API}/prazo/v1/nacional/${s.codigo}?${qp}`, { headers: { Authorization: `Bearer ${t}` } }).then((r) => r.json()),
        ]);

        const valor = Number(String(preco.pcFinal ?? "0").replace(",", "."));
        if (!valor) return null;

        return {
          servico: s.codigo,
          nome: s.nome,
          valor: gratis && s.nome === "PAC" ? 0 : valor,
          prazoDias: Number(prazo.prazoEntrega ?? 0),
          estimado: false,
        } satisfies Opcao;
      }),
    );

    const validas = opcoes.filter(Boolean) as Opcao[];
    return validas.length ? validas.sort((a, b) => a.valor - b.valor) : calcularFixo(gratis);
  } catch {
    // Correios fora do ar não pode travar a venda: cai no frete fixo.
    return calcularFixo(gratis);
  }
}

const calcularFixo = (gratis: boolean): Opcao[] => [
  { servico: "fixo", nome: "Entrega padrão", valor: gratis ? 0 : FRETE_PADRAO, prazoDias: 7, estimado: true },
];
