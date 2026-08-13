import type { Volume, Opcao } from "@/lib/frete";

/**
 * Cotação pelo contrato direto dos Correios, via API CWS.
 *
 * Exige contrato: usuário do Meu Correios, código de acesso, cartão de
 * postagem e os códigos de serviço do contrato, que são diferentes dos
 * públicos. O web service antigo, `ws.correios.com.br`, que respondia sem
 * cadastro, foi desativado, e código que ainda aponte para ele está morto.
 *
 * Sai mais barato que o SuperFrete fora das capitais do Sul e Sudeste, porque
 * o preço é o negociado da fábrica. Fica aqui como alternativa: ligar é trocar
 * FRETE_PROVEDOR para "correios".
 */
const API = "https://api.correios.com.br";

export const configurado = Boolean(
  process.env.CORREIOS_USUARIO &&
    process.env.CORREIOS_CODIGO_ACESSO &&
    process.env.CORREIOS_CARTAO_POSTAGEM &&
    (process.env.FRETE_CEP_ORIGEM || process.env.CORREIOS_CEP_ORIGEM),
);

let cacheToken: { token: string; expira: number } | null = null;

async function token() {
  if (cacheToken && cacheToken.expira > Date.now() + 60_000) return cacheToken.token;

  const basico = Buffer.from(
    `${process.env.CORREIOS_USUARIO}:${process.env.CORREIOS_CODIGO_ACESSO}`,
  ).toString("base64");

  const r = await fetch(`${API}/token/v1/autentica/cartaopostagem`, {
    method: "POST",
    headers: { Authorization: `Basic ${basico}`, "Content-Type": "application/json" },
    // O cartão vai com os zeros à esquerda: com oito dígitos os Correios
    // respondem "cartão de postagem não localizado".
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
 * O adicional de valor declarado muda por serviço e não é intercambiável:
 * pedir o 064 no SEDEX volta ERP-054. Vem junto do serviço para os dois nunca
 * se separarem.
 */
const SERVICOS = [
  { codigo: process.env.CORREIOS_SERVICO_PAC ?? "03298", nome: "PAC", declarado: "064" },
  { codigo: process.env.CORREIOS_SERVICO_SEDEX ?? "03220", nome: "SEDEX", declarado: "019" },
];

/** Faixa aceita pela própria API (ERP-013). Fora dela a cotação é recusada. */
const DECLARADO_MIN = 25.63;
const DECLARADO_MAX = 4668.29;

const cepOrigem = () =>
  (process.env.FRETE_CEP_ORIGEM ?? process.env.CORREIOS_CEP_ORIGEM ?? "").replace(/\D/g, "");

export async function cotar(cep: string, caixa: Volume, subtotal: number): Promise<Opcao[]> {
  const origem = cepOrigem();
  if (!origem) throw new Error("FRETE_CEP_ORIGEM não está definido");

  const t = await token();
  const { cobravel } = pesoDaCaixa(caixa);

  const opcoes = await Promise.all(
    SERVICOS.map(async (s) => {
      const q = new URLSearchParams({
        cepOrigem: origem,
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
      const qp = new URLSearchParams({ cepOrigem: origem, cepDestino: cep });

      const [preco, prazo] = await Promise.all([
        fetch(`${API}/preco/v1/nacional/${s.codigo}?${q}`, {
          headers: { Authorization: `Bearer ${t}` },
        }).then((r) => r.json()),
        fetch(`${API}/prazo/v1/nacional/${s.codigo}?${qp}`, {
          headers: { Authorization: `Bearer ${t}` },
        }).then((r) => r.json()),
      ]);

      const valor = Number(String(preco.pcFinal ?? "0").replace(".", "").replace(",", "."));
      if (!valor) return null;

      return {
        servico: s.codigo,
        nome: s.nome,
        transportadora: "Correios",
        valor,
        prazoDias: Number(prazo.prazoEntrega ?? 0),
        estimado: false,
      } satisfies Opcao;
    }),
  );

  return opcoes.filter(Boolean) as Opcao[];
}

function pesoDaCaixa(c: Volume) {
  const real = (c.pesoGramas * c.quantidade) / 1000;
  const cubado = ((c.alturaCm * c.larguraCm * c.comprimentoCm) / 6000) * c.quantidade;
  return { real, cubado, cobravel: Math.max(real, cubado) };
}
