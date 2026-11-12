import { prisma } from "@/lib/prisma";

/**
 * Bling · API v3.
 *
 * A v2 não existe mais. Não está depreciada: está desligada · responde
 * "A API v2 foi descontinuada" antes mesmo de olhar a chave. Então é OAuth 2.0,
 * com tudo o que isso arrasta: um token curto, um refresh longo, e alguém
 * precisando autorizar uma vez no navegador.
 *
 * Os tokens moram no banco, não no ambiente. O access_token vale seis horas e
 * troca sozinho várias vezes por dia · uma variável de ambiente exigiria um
 * deploy a cada renovação, o que não é uma integração, é um emprego.
 */

const OAUTH = "https://www.bling.com.br/Api/v3/oauth/token";
const API = "https://api.bling.com.br/Api/v3";
const NOME = "bling";

/** Renovamos com folga: no limite, uma requisição lenta expira no meio. */
const FOLGA = 10 * 60 * 1000;

export const configurado = Boolean(
  process.env.BLING_CLIENT_ID && process.env.BLING_CLIENT_SECRET,
);

function basico() {
  const par = `${process.env.BLING_CLIENT_ID}:${process.env.BLING_CLIENT_SECRET}`;
  return Buffer.from(par).toString("base64");
}

type Resposta = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope?: string;
  token_type?: string;
};

/**
 * Chama o endpoint de token.
 *
 * A documentação pública do Bling não descreve os cabeçalhos exatos, então o
 * corpo cru da resposta vem junto no erro. Sem isso, um 400 aqui é indistinguível
 * de um 400 ali, e a diferença entre "código expirado" e "cabeçalho errado" é
 * uma tarde inteira.
 */
async function pedirToken(corpo: Record<string, string>): Promise<Resposta> {
  const r = await fetch(OAUTH, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basico()}`,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "1.0",
    },
    body: new URLSearchParams(corpo).toString(),
    cache: "no-store",
  });

  const texto = await r.text();
  if (!r.ok) throw new Error(`Bling respondeu ${r.status}: ${texto.slice(0, 500)}`);

  const d = JSON.parse(texto) as Resposta;
  if (!d.access_token) throw new Error(`Bling não devolveu access_token: ${texto.slice(0, 500)}`);
  return d;
}

async function guardar(d: Resposta, db: Pick<typeof prisma, "integracao"> = prisma) {
  const agora = Date.now();
  const dados = {
    accessToken: d.access_token,
    refreshToken: d.refresh_token,
    expiraEm: new Date(agora + d.expires_in * 1000),
    // O refresh do Bling vale trinta dias. Guardamos a data para o painel poder
    // avisar antes de cair, em vez de descobrir na hora de emitir uma nota.
    refreshAte: new Date(agora + 30 * 24 * 60 * 60 * 1000),
    escopos: d.scope ?? null,
    renovadoEm: new Date(agora),
    falha: null,
    falhaEm: null,
  };

  await db.integracao.upsert({
    where: { nome: NOME },
    create: { nome: NOME, ...dados },
    update: dados,
  });
}

/** Troca o `code` que volta do link de convite pelo par de tokens. */
export async function trocarCodigo(code: string) {
  await guardar(await pedirToken({ grant_type: "authorization_code", code }));
}

/**
 * Devolve um access_token válido, renovando antes de vencer.
 *
 * Renovar no erro parece mais simples e é pior: a primeira chamada depois de
 * seis horas sempre falharia, e "às vezes não emite a nota" é o tipo de bug
 * que ninguém consegue reproduzir.
 */
export async function token(): Promise<string> {
  const c = await prisma.integracao.findUnique({ where: { nome: NOME } });
  if (!c) throw new Error("Bling ainda não foi autorizado.");

  if (c.expiraEm.getTime() - FOLGA > Date.now()) return c.accessToken;

  // Uma renovação por vez, para o sistema inteiro. Pedido pago chega com vários
  // avisos do Mercado Pago no mesmo segundo; dois renovando juntos usam o mesmo
  // refresh_token, o Bling lê isso como roubo e invalida a autorização inteira ·
  // foi o que derrubou a conexão em 04/11 (pedido #36) e 12/11 (pedido #39).
  // Quem chega depois espera a trava e já encontra o token novo. Dentro da
  // transação só se usa `tx`: com uma conexão só no pool, qualquer outra
  // consulta aqui dentro esperaria a própria transação terminar.
  let recusado: Error | null = null;
  try {
    return await prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(7300542)`;
        const atual = await tx.integracao.findUnique({ where: { nome: NOME } });
        if (!atual) throw new Error("Bling ainda não foi autorizado.");
        if (atual.expiraEm.getTime() - FOLGA > Date.now()) return atual.accessToken;
        try {
          const d = await pedirToken({ grant_type: "refresh_token", refresh_token: atual.refreshToken });
          await guardar(d, tx);
          return d.access_token;
        } catch (e) {
          recusado = e instanceof Error ? e : new Error("falha ao renovar");
          throw e;
        }
      },
      { timeout: 30_000, maxWait: 30_000 },
    );
  } catch (e) {
    // Refresh recusado é conexão caída até alguém reautorizar. Fica gravado (fora
    // da transação, que já desfez) para o painel inteiro avisar.
    if (recusado) {
      await prisma.integracao
        .update({ where: { nome: NOME }, data: { falha: (recusado as Error).message.slice(0, 500), falhaEm: c.falhaEm ?? new Date() } })
        .catch(() => {});
    }
    throw e;
  }
}

/** Uma chamada autenticada na API. */
export async function chamar<T = unknown>(caminho: string, init: RequestInit = {}): Promise<T> {
  const ir = async () =>
    fetch(`${API}${caminho}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${await token()}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        ...init.headers,
      },
      cache: "no-store",
    });

  // O Bling aceita 3 requisições por segundo. Passou, responde 429: espera e
  // tenta de novo, duas vezes, em vez de perder a leitura inteira.
  let r = await ir();
  for (let i = 1; r.status === 429 && i <= 2; i++) {
    await new Promise((s) => setTimeout(s, 1200 * i));
    r = await ir();
  }

  const texto = await r.text();
  if (!r.ok) throw new Error(`Bling ${caminho} respondeu ${r.status}: ${texto.slice(0, 500)}`);
  return texto ? (JSON.parse(texto) as T) : ({} as T);
}

/** O que o painel mostra: conectado desde quando, e até quando aguenta. */
export async function conexao() {
  const c = await prisma.integracao.findUnique({ where: { nome: NOME } });
  if (!c) return { ligado: false as const };

  return {
    ligado: true as const,
    escopos: c.escopos,
    renovadoEm: c.renovadoEm,
    expiraEm: c.expiraEm,
    refreshAte: c.refreshAte,
    falha: c.falha,
    falhaEm: c.falhaEm,
    // Trinta dias sem ninguém emitir nada e a conexão cai sozinha. Avisar antes
    // é a diferença entre reautorizar com calma e descobrir com o cliente
    // esperando a nota.
    vencendo: c.refreshAte ? c.refreshAte.getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000 : false,
  };
}

/** Confere que o token responde de verdade, e diz de qual empresa é a conta. */
export async function conferir() {
  const d = await chamar<{ data?: { nome?: string; email?: string } }>("/empresas/me/dados-basicos");
  return d.data ?? {};
}
