import { prisma } from "@/lib/prisma";

/**
 * Clientes · uma ficha por pessoa, juntando o que hoje está espalhado:
 *
 *   site (clientes e pedidos da loja) · Bling (pedidos de todos os canais, pelo
 *   espelho do ERP) · assistência (chamados) · WhatsApp (Conversas, só leitura)
 *
 * Não existe um cadastro único de pessoa: a ficha é montada na hora, ligando
 * as fontes por CPF/CNPJ, e-mail e telefone. A ficha se identifica por esses
 * três dados na URL (`?d=&e=&t=`), não por um id de uma fonte só.
 */

const so = (s: string | null | undefined) => (s ?? "").replace(/\D/g, "");

/** 55 + DDD + número; celular antigo ganha o 9 (mesmo critério do Conversas). */
export function telefoneE164(t: string | null | undefined): string | null {
  let d = so(t);
  if (!d) return null;
  if (d.length === 10 || d.length === 11) d = "55" + d;
  if (d.length === 12 && d.startsWith("55") && "6789".includes(d[4]!)) d = d.slice(0, 4) + "9" + d.slice(4);
  return d.length >= 12 ? d : null;
}

export type Identidade = { d?: string; e?: string; t?: string };

/** De onde a pessoa chegou: o canal do pedido, o site ou a assistência. */
export const ORIGENS = ["Mercado Livre", "Shopee", "Magalu", "Amazon", "Loja física", "Site", "Assistência"] as const;
export type Origem = (typeof ORIGENS)[number];

/** Etiquetas calculadas na hora, para filtrar a lista. */
export const ETIQUETAS = ["Chamado aberto", "Recompra", "Empresa (CNPJ)", "Comprou em 30 dias"] as const;
export type Etiqueta = (typeof ETIQUETAS)[number];

const TIPO_CANAL: Record<string, Origem> = {
  MercadoLivre: "Mercado Livre",
  Shopee: "Shopee",
  IntegraCommerce: "Magalu",
  Amazon: "Amazon",
  LojaFisica: "Loja física",
};

const CHAMADO_FECHADO = ["CONCLUIDO", "ENCERRADO", "NEGADO", "RECUSADO", "ORIENTADO_MARKETPLACE"];

export type Cartao = {
  nome: string;
  documento: string | null;
  email: string | null;
  telefone: string | null;
  pedidosSite: number;
  pedidosBling: number;
  chamados: number;
  chamadoAberto: boolean;
  origens: Origem[];
  etiquetas: Etiqueta[];
  ultimo: Date;
};

/** Parâmetros da pessoa selecionada (d = documento, e = e-mail, t = telefone). */
export const paramsPessoa = (c: { documento?: string | null; email?: string | null; telefone?: string | null }) => {
  const p = new URLSearchParams();
  if (c.documento) p.set("d", so(c.documento));
  if (c.email) p.set("e", c.email.toLowerCase());
  if (c.telefone) p.set("t", telefoneE164(c.telefone) ?? so(c.telefone));
  return p;
};
export const linkFicha = (c: { documento?: string | null; email?: string | null; telefone?: string | null }) =>
  `/admin/clientes?${paramsPessoa(c)}`;

/** Canais do Bling (loja id → origem), do espelho. */
async function canaisBling() {
  const c = await prisma.espelhoBling.findMany({ where: { entidade: "canal_venda" }, select: { blingId: true, codigo: true, resumo: true } });
  return new Map(
    c.map((x) => {
      const tipo = (x.resumo as { tipo?: string } | null)?.tipo ?? "";
      return [x.blingId, { nome: x.codigo ?? "Bling", origem: TIPO_CANAL[tipo] ?? null }] as const;
    }),
  );
}

type LinhaBling = { nome: string | null; documento: string | null; pedidos: bigint; ultimo: string | null; lojas: string[] | null };

/** Pessoas que compraram pelo Bling (todos os canais), agrupadas pelo contato. */
async function contatosBling(q: string | null, lojas: string[] | null, limite: number, etiqueta: Etiqueta | null = null): Promise<LinhaBling[]> {
  // Etiquetas que dá para resolver no banco: assim o filtro olha a base toda, não só os recentes.
  const recompra = etiqueta === "Recompra";
  const cnpj = etiqueta === "Empresa (CNPJ)";
  const digitos = q ? so(q) : "";
  const termo = q ? `%${q}%` : null;
  return prisma.$queryRaw<LinhaBling[]>`
    SELECT max(resumo->'contato'->>'nome') AS nome,
           max(regexp_replace(coalesce(resumo->'contato'->>'numeroDocumento', ''), '\\D', '', 'g')) AS documento,
           count(*) AS pedidos,
           max(resumo->>'data') AS ultimo,
           array_agg(DISTINCT resumo->'loja'->>'id') AS lojas
      FROM "erp"."espelho_bling"
     WHERE entidade = 'pedido_venda'
       AND (${lojas}::text[] IS NULL OR resumo->'loja'->>'id' = ANY(${lojas}::text[]))
       AND (${termo}::text IS NULL
            OR resumo->'contato'->>'nome' ILIKE ${termo}
            OR (${digitos.length >= 5} AND regexp_replace(coalesce(resumo->'contato'->>'numeroDocumento', ''), '\\D', '', 'g') LIKE ${digitos + "%"}))
       AND (NOT ${cnpj} OR length(regexp_replace(coalesce(resumo->'contato'->>'numeroDocumento', ''), '\\D', '', 'g')) = 14)
     GROUP BY resumo->'contato'->>'id'
    HAVING (NOT ${recompra} OR count(*) >= 2)
     ORDER BY max(resumo->>'data') DESC NULLS LAST
     LIMIT ${limite}`;
}

export type FiltroClientes = { q?: string | null; origem?: string | null; etiqueta?: string | null };

/** Lista: busca por nome, CPF/CNPJ, e-mail ou telefone, com filtro de origem e etiqueta. */
export async function buscarClientes(f: FiltroClientes = {}): Promise<Cartao[]> {
  const termo = f.q?.trim() || null;
  const origem = (ORIGENS as readonly string[]).includes(f.origem ?? "") ? (f.origem as Origem) : null;
  const etiqueta = (ETIQUETAS as readonly string[]).includes(f.etiqueta ?? "") ? (f.etiqueta as Etiqueta) : null;
  const digitos = termo ? so(termo) : "";
  const tel = digitos.length >= 8 ? digitos.slice(-8) : null;
  const canais = await canaisBling();

  const querSite = !origem || origem === "Site";
  const querChamado = !origem || origem === "Assistência";
  const lojasDaOrigem = origem ? [...canais].filter(([, c]) => c.origem === origem).map(([id]) => id) : null;
  const querBling = !origem || (lojasDaOrigem?.length ?? 0) > 0;
  const limite = etiqueta ? 150 : 60;

  const [site, chamados, bling] = await Promise.all([
    querSite
      ? prisma.cliente.findMany({
          where: termo
            ? {
                OR: [
                  { nome: { contains: termo, mode: "insensitive" } },
                  { email: { contains: termo, mode: "insensitive" } },
                  ...(digitos.length >= 5 ? [{ cpfCnpj: { contains: digitos } }] : []),
                  ...(tel ? [{ telefone: { contains: tel.slice(-4) } }] : []),
                ],
              }
            : undefined,
          orderBy: { criadoEm: "desc" },
          take: limite,
          select: { nome: true, email: true, cpfCnpj: true, telefone: true, criadoEm: true, _count: { select: { pedidos: true } } },
        })
      : [],
    querChamado || etiqueta === "Chamado aberto"
      ? prisma.chamado.findMany({
          where: termo
            ? {
                OR: [
                  { nome: { contains: termo, mode: "insensitive" } },
                  { email: { contains: termo, mode: "insensitive" } },
                  ...(digitos.length >= 5 ? [{ documento: { startsWith: digitos } }] : []),
                  ...(tel ? [{ telefone: { endsWith: tel } }] : []),
                ],
              }
            : undefined,
          orderBy: { criadoEm: "desc" },
          take: limite,
          select: { nome: true, email: true, documento: true, telefone: true, criadoEm: true, status: true },
        })
      : [],
    querBling && etiqueta !== "Chamado aberto" ? contatosBling(termo, lojasDaOrigem, limite, etiqueta) : [],
  ]);

  // Junta as fontes na mesma pessoa: documento, depois e-mail, depois telefone.
  const pessoas: Cartao[] = [];
  const achar = (doc: string | null, email: string | null, fone: string | null) =>
    pessoas.find(
      (p) =>
        (doc && p.documento && so(p.documento) === doc) ||
        (email && p.email && p.email.toLowerCase() === email.toLowerCase()) ||
        (fone && p.telefone && telefoneE164(p.telefone) === fone),
    );
  const juntar = (x: Partial<Cartao> & { nome: string; ultimo: Date }) => {
    const doc = so(x.documento) || null;
    const fone = telefoneE164(x.telefone);
    const p = achar(doc, x.email ?? null, fone);
    if (!p) {
      pessoas.push({
        documento: doc, email: x.email ?? null, telefone: x.telefone ?? null,
        pedidosSite: 0, pedidosBling: 0, chamados: 0, chamadoAberto: false, origens: [], etiquetas: [],
        ...x, nome: x.nome,
      });
      return;
    }
    p.documento ??= doc;
    p.email ??= x.email ?? null;
    p.telefone ??= x.telefone ?? null;
    p.pedidosSite += x.pedidosSite ?? 0;
    p.pedidosBling += x.pedidosBling ?? 0;
    p.chamados += x.chamados ?? 0;
    p.chamadoAberto ||= Boolean(x.chamadoAberto);
    p.origens = [...new Set([...p.origens, ...(x.origens ?? [])])];
    if (x.ultimo > p.ultimo) p.ultimo = x.ultimo;
  };

  for (const c of site)
    juntar({ nome: c.nome, email: c.email, documento: c.cpfCnpj, telefone: c.telefone, pedidosSite: c._count.pedidos, origens: ["Site"], ultimo: c.criadoEm });
  for (const c of chamados)
    juntar({
      nome: c.nome, email: c.email, documento: c.documento, telefone: c.telefone, chamados: 1,
      chamadoAberto: !CHAMADO_FECHADO.includes(c.status), origens: ["Assistência"], ultimo: c.criadoEm,
    });
  for (const b of bling)
    juntar({
      nome: (b.nome ?? "Sem nome").replace(/\s*\([^)]*\)\s*$/, ""), // "Nome (apelido do ML)" → "Nome"
      documento: b.documento || null,
      pedidosBling: Number(b.pedidos),
      origens: [...new Set((b.lojas ?? []).map((l) => canais.get(l)?.origem).filter(Boolean))] as Origem[],
      ultimo: /^\d{4}-\d{2}-\d{2}$/.test(b.ultimo ?? "") ? new Date(`${b.ultimo}T12:00:00Z`) : new Date(0),
    });

  const mes = Date.now() - 30 * 86_400_000;
  for (const p of pessoas) {
    p.etiquetas = [
      ...(p.chamadoAberto ? (["Chamado aberto"] as const) : []),
      ...(p.pedidosSite + p.pedidosBling >= 2 ? (["Recompra"] as const) : []),
      ...(so(p.documento).length === 14 ? (["Empresa (CNPJ)"] as const) : []),
      ...(p.pedidosSite + p.pedidosBling > 0 && p.ultimo.getTime() >= mes ? (["Comprou em 30 dias"] as const) : []),
    ];
  }

  return pessoas
    .filter((p) => (!origem || p.origens.includes(origem)) && (!etiqueta || p.etiquetas.includes(etiqueta)))
    .sort((a, b) => b.ultimo.getTime() - a.ultimo.getTime())
    .slice(0, 80);
}

// ── ficha ────────────────────────────────────────────────────────────────────

const SITUACAO_BLING: Record<number, string> = {
  6: "Em aberto",
  9: "Atendido",
  12: "Cancelado",
  15: "Em andamento",
  18: "Venda agenciada",
  21: "Em digitação",
  24: "Verificado",
};

export type PedidoFicha = {
  origem: "site" | "bling";
  numero: string;
  data: Date;
  canal: string;
  total: number;
  situacao: string;
  itens: string[];
  link?: string;
};

export type WhatsappFicha = {
  configurado: boolean;
  erro?: string;
  contatos: { telefone: string; nome: string | null; nome_whatsapp: string | null; optin_em: string | null; optin_origem: string | null; bloqueado: boolean }[];
  conversas: { id: string; numero: string; estado: string; ultima_msg_em: string | null; link: string }[];
  mensagens: { numero: string; direcao: "entrada" | "saida" | "interna"; tipo: string; corpo: string | null; autor: string | null; status: string | null; ordem_ts: string }[];
  ultimaEntrada: Record<string, string>;
};

/** WhatsApp do cliente, pelo Conversas. Falha não derruba a ficha. */
async function whatsapp(telefones: string[]): Promise<WhatsappFicha> {
  const vazio = { contatos: [], conversas: [], mensagens: [], ultimaEntrada: {} };
  const url = process.env.CONVERSAS_AVISO_URL;
  const segredo = process.env.CONVERSAS_AVISO_SEGREDO;
  if (!url || !segredo) return { configurado: false, ...vazio };
  if (!telefones.length) return { configurado: true, ...vazio };
  try {
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-loja-segredo": segredo },
      body: JSON.stringify({ acao: "historico", telefones }),
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });
    const d = await r.json();
    if (!r.ok || !Array.isArray(d.contatos)) return { configurado: true, erro: d?.erro ?? `Conversas respondeu ${r.status}`, ...vazio };
    return { configurado: true, ultimaEntrada: {}, ...d };
  } catch (e) {
    return { configurado: true, erro: e instanceof Error ? e.message : "Conversas não respondeu", ...vazio };
  }
}

export async function fichaCliente(id: Identidade) {
  const doc = so(id.d) || null;
  const email = id.e?.trim().toLowerCase() || null;
  const fone = telefoneE164(id.t);
  const fim8 = fone ? fone.slice(-8) : null;

  // Uma volta de expansão: o chamado traz o telefone que o pedido não tinha, e vice-versa.
  const [clientes, chamados] = await Promise.all([
    prisma.cliente.findMany({
      where: {
        OR: [
          ...(email ? [{ email }] : []),
          ...(doc ? [{ cpfCnpj: { contains: doc } }] : []),
          ...(fim8 ? [{ telefone: { contains: fim8.slice(-4) } }] : []),
        ],
      },
      include: {
        pedidos: {
          orderBy: { criadoEm: "desc" },
          take: 30,
          select: { id: true, numero: true, status: true, total: true, criadoEm: true, itens: { select: { nomeProduto: true, quantidade: true } } },
        },
      },
    }),
    prisma.chamado.findMany({
      where: {
        OR: [
          ...(email ? [{ email }] : []),
          ...(doc ? [{ documento: doc }] : []),
          ...(fim8 ? [{ telefone: { endsWith: fim8 } }] : []),
        ],
      },
      orderBy: { criadoEm: "desc" },
      select: { protocolo: true, status: true, faixa: true, modelo: true, criadoEm: true, nome: true, email: true, telefone: true, documento: true },
    }),
  ]);

  // Telefone do site vem com máscara: confere os 8 últimos dígitos e o número inteiro.
  const doSite = clientes.filter(
    (c) => (email && c.email.toLowerCase() === email) || (doc && so(c.cpfCnpj) === doc) || (fone && telefoneE164(c.telefone) === fone),
  );
  const documento = doc ?? (so(doSite.find((c) => c.cpfCnpj)?.cpfCnpj) || null) ?? chamados.find((c) => c.documento)?.documento ?? null;

  const telefones = [
    ...new Set([fone, ...doSite.map((c) => telefoneE164(c.telefone)), ...chamados.map((c) => telefoneE164(c.telefone))].filter(Boolean)),
  ] as string[];
  const emails = [...new Set([email, ...doSite.map((c) => c.email.toLowerCase()), ...chamados.map((c) => c.email)].filter(Boolean))] as string[];

  const [bling, canais, wa] = await Promise.all([
    documento
      ? prisma.$queryRaw<{ blingId: string; resumo: Record<string, unknown>; dados: Record<string, unknown> | null }[]>`
          SELECT "blingId", resumo, dados FROM "erp"."espelho_bling"
           WHERE entidade = 'pedido_venda'
             AND regexp_replace(coalesce(resumo->'contato'->>'numeroDocumento', ''), '\\D', '', 'g') = ${documento}
           ORDER BY resumo->>'data' DESC NULLS LAST
           LIMIT 50`
      : Promise.resolve([]),
    canaisBling(),
    whatsapp(telefones),
  ]);
  const canal = new Map([...canais].map(([id, c]) => [id, c.nome]));

  const pedidos: PedidoFicha[] = [
    ...doSite.flatMap((c) =>
      c.pedidos.map((p) => ({
        origem: "site" as const,
        numero: String(p.numero),
        data: p.criadoEm,
        canal: "Site Vibra Vert",
        total: Number(p.total),
        situacao: p.status,
        itens: p.itens.map((i) => `${i.quantidade}× ${i.nomeProduto}`),
        link: `/admin/pedidos?s=${p.status}`,
      })),
    ),
    ...bling.map((b) => {
      const r = b.resumo as { numero?: number; numeroLoja?: string; data?: string; total?: number; loja?: { id?: number }; situacao?: { id?: number } };
      const itens = ((b.dados as { itens?: { descricao?: string; quantidade?: number }[] } | null)?.itens ?? []).map(
        (i) => `${i.quantidade ?? 1}× ${i.descricao ?? "item"}`,
      );
      return {
        origem: "bling" as const,
        numero: String(r.numero ?? b.blingId),
        data: new Date(`${r.data ?? "1970-01-01"}T12:00:00Z`),
        canal: canal.get(String(r.loja?.id ?? "")) ?? (r.loja?.id ? "Loja " + r.loja.id : "Bling"),
        total: Number(r.total ?? 0),
        situacao: SITUACAO_BLING[r.situacao?.id ?? -1] ?? `Situação ${r.situacao?.id ?? "?"}`,
        itens,
      };
    }),
  ].sort((a, b) => b.data.getTime() - a.data.getTime());

  const nomeBling = (bling[0]?.resumo as { contato?: { nome?: string } } | undefined)?.contato?.nome?.replace(/\s*\([^)]*\)\s*$/, "");
  const nome = doSite[0]?.nome ?? chamados[0]?.nome ?? nomeBling ?? wa.contatos[0]?.nome ?? wa.contatos[0]?.nome_whatsapp ?? "Cliente";

  return { nome, documento, emails, telefones, pedidos, chamados, whatsapp: wa };
}

/** Pode mandar WhatsApp agora? A regra da Meta, em uma frase, por número. */
export function podeEnviar(wa: WhatsappFicha, agora = new Date()) {
  if (!wa.configurado) return [{ numero: "", pode: false, texto: "WhatsApp não conectado ao painel." }];
  const c = wa.contatos[0];
  if (!c) return [{ numero: "", pode: false, texto: "Nunca falou com a gente pelo WhatsApp. Só dá para escrever se ele mandar mensagem primeiro." }];
  if (c.bloqueado) return [{ numero: "", pode: false, texto: "Contato bloqueado no Conversas: não envie." }];
  const numeros = [...new Set(wa.conversas.map((x) => x.numero))];
  const linhas = numeros.map((n) => {
    const ult = wa.ultimaEntrada[n];
    const fim = ult ? new Date(new Date(ult).getTime() + 24 * 3600_000) : null;
    if (fim && fim > agora)
      return {
        numero: n,
        pode: true,
        texto: `Pode escrever livre pelo ${n} até ${fim.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })} (janela de 24 h aberta).`,
      };
    if (c.optin_em) return { numero: n, pode: true, texto: `Pelo ${n}, só com template aprovado (janela de 24 h fechada; tem consentimento).` };
    return { numero: n, pode: false, texto: `Pelo ${n}, só se o cliente escrever primeiro (sem consentimento para template).` };
  });
  return linhas.length ? linhas : [{ numero: "", pode: Boolean(c.optin_em), texto: c.optin_em ? "Só com template aprovado." : "Só se o cliente escrever primeiro." }];
}
