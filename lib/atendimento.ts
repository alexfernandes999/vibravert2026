import { prisma } from "@/lib/prisma";
import { assuntoVibrinha, fichaCliente, lerVibrinha, paramsPessoa, telefoneE164, type Assunto } from "@/lib/clientes";

/**
 * Atendimento · a caixa de entrada de quem falou com a Vibra Vert, separada
 * dos compradores (Clientes). Cada item é um contato, não uma pessoa:
 *
 *   Chat do site   · conversa com a Vibrinha
 *   Formulário     · chamado aberto na assistência técnica (fotos, protocolo)
 *   WhatsApp       · conversa no Conversas que nasceu do site (avisos da assistência)
 *
 * Assunto: Vendas ou SAC. O chamado é sempre SAC; a Vibrinha é classificada
 * pelo que a pessoa escreveu; o WhatsApp, pelo que o originou.
 */

export const CANAIS_ATENDIMENTO = ["Chat do site", "Formulário", "WhatsApp"] as const;
export type CanalAtendimento = (typeof CANAIS_ATENDIMENTO)[number];

export type ItemAtendimento = {
  chave: string; // v:<conversa> · c:<protocolo> · w:<conversa do Conversas>
  canal: CanalAtendimento;
  assunto: Assunto;
  nome: string;
  previa: string;
  quando: Date;
  status: string | null;
  aguardando: boolean;
  telefone: string | null;
  email: string | null;
  documento: string | null;
};

type ConversaWhats = {
  id: string;
  telefone: string;
  nome: string | null;
  origem: string | null;
  numero: string;
  estado: string;
  quando: string;
  ultima: { direcao: string; texto: string } | null;
  aguardando: boolean;
  link: string;
};

const CHAMADO_FECHADO = ["CONCLUIDO", "ENCERRADO", "NEGADO", "RECUSADO", "ORIENTADO_MARKETPLACE"];

/** Conversas de WhatsApp nascidas do site, pelo Conversas. Sem conexão, lista vazia. */
async function whatsappDoSite(): Promise<{ conversas: ConversaWhats[]; erro?: string }> {
  const url = process.env.CONVERSAS_AVISO_URL;
  const segredo = process.env.CONVERSAS_AVISO_SEGREDO;
  if (!url || !segredo) return { conversas: [], erro: "WhatsApp não conectado ao painel" };
  try {
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-loja-segredo": segredo },
      body: JSON.stringify({ acao: "conversas_loja" }),
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });
    const d = await r.json();
    if (!r.ok || !Array.isArray(d.conversas)) return { conversas: [], erro: d?.erro ?? `Conversas respondeu ${r.status}` };
    return { conversas: d.conversas };
  } catch (e) {
    return { conversas: [], erro: e instanceof Error ? e.message : "Conversas não respondeu" };
  }
}

export type FiltroAtendimento = { canal?: string | null; assunto?: string | null; q?: string | null };

export async function listarAtendimento(f: FiltroAtendimento = {}) {
  const canal = (CANAIS_ATENDIMENTO as readonly string[]).includes(f.canal ?? "") ? (f.canal as CanalAtendimento) : null;
  const assunto = f.assunto === "Vendas" || f.assunto === "SAC" ? (f.assunto as Assunto) : null;
  const q = f.q?.trim() || null;
  const qd = q ? q.replace(/\D/g, "") : "";

  const [chats, chamados, whats] = await Promise.all([
    !canal || canal === "Chat do site"
      ? prisma.conversa.findMany({
          where: q
            ? { OR: [{ nome: { contains: q, mode: "insensitive" } }, { dialogo: { contains: q, mode: "insensitive" } }] }
            : { dialogo: { not: "" } },
          orderBy: { criadoEm: "desc" },
          take: 150,
        })
      : [],
    !canal || canal === "Formulário"
      ? prisma.chamado.findMany({
          where: q
            ? {
                OR: [
                  { nome: { contains: q, mode: "insensitive" } },
                  { protocolo: { contains: q.toUpperCase() } },
                  { email: { contains: q, mode: "insensitive" } },
                  ...(qd.length >= 5 ? [{ documento: { startsWith: qd } }, { telefone: { endsWith: qd.slice(-8) } }] : []),
                ],
              }
            : undefined,
          orderBy: { criadoEm: "desc" },
          take: 150,
          select: { protocolo: true, nome: true, status: true, modelo: true, ocorrido: true, criadoEm: true, telefone: true, email: true, documento: true },
        })
      : [],
    !canal || canal === "WhatsApp" ? whatsappDoSite() : Promise.resolve<{ conversas: ConversaWhats[]; erro?: string }>({ conversas: [] }),
  ]);

  const itens: ItemAtendimento[] = [];
  for (const c of chats) {
    const v = lerVibrinha(c.dialogo);
    const ultimaDoCliente = [...v.mensagens].reverse().find((m) => m.de === "cliente")?.texto;
    itens.push({
      chave: `v:${c.id}`,
      canal: "Chat do site",
      assunto: assuntoVibrinha(`${c.apurado ?? ""} ${c.dialogo}`),
      nome: v.nome ?? c.nome ?? "Visitante do site",
      previa: c.apurado || ultimaDoCliente || "Abriu o chat",
      quando: c.criadoEm,
      status: c.origem ? `saiu pelo ${c.origem}` : null,
      aguardando: false,
      telefone: v.telefone,
      email: v.email,
      documento: null,
    });
  }
  for (const c of chamados) {
    itens.push({
      chave: `c:${c.protocolo}`,
      canal: "Formulário",
      assunto: "SAC",
      nome: c.nome,
      previa: `${c.protocolo}${c.modelo ? ` · ${c.modelo}` : ""} · ${c.ocorrido}`.slice(0, 160),
      quando: c.criadoEm,
      status: c.status,
      aguardando: !CHAMADO_FECHADO.includes(c.status),
      telefone: telefoneE164(c.telefone),
      email: c.email,
      documento: c.documento,
    });
  }
  for (const w of whats.conversas) {
    if (q && !`${w.nome ?? ""} ${w.telefone}`.toLowerCase().includes(q.toLowerCase()) && !(qd.length >= 5 && w.telefone.includes(qd))) continue;
    itens.push({
      chave: `w:${w.id}`,
      canal: "WhatsApp",
      // Hoje o que nasce do site no WhatsApp são os avisos da assistência.
      assunto: w.origem?.startsWith("site:assistencia") ? "SAC" : "Vendas",
      nome: w.nome ?? `+${w.telefone}`,
      previa: w.ultima ? `${w.ultima.direcao === "entrada" ? "" : "Nós: "}${w.ultima.texto}` : "Sem mensagens",
      quando: new Date(w.quando),
      status: w.numero,
      aguardando: w.aguardando,
      telefone: w.telefone,
      email: null,
      documento: null,
    });
  }

  const contagem = Object.fromEntries(CANAIS_ATENDIMENTO.map((c) => [c, itens.filter((i) => i.canal === c).length])) as Record<CanalAtendimento, number>;
  const lista = itens
    .filter((i) => !assunto || i.assunto === assunto)
    .sort((a, b) => b.quando.getTime() - a.quando.getTime())
    .slice(0, 200);
  return { itens: lista, contagem, erroWhatsapp: whats.erro, whatsapp: whats.conversas };
}

/**
 * O atendimento aberto: o contato em si (chat, chamado ou WhatsApp) e, ao lado,
 * o histórico completo da pessoa (a mesma ficha de Clientes), quando dá para
 * saber quem ela é.
 */
export async function abrirAtendimento(chave: string) {
  const [tipo, id] = [chave.slice(0, 1), chave.slice(2)];
  if (!id) return null;

  if (tipo === "v") {
    const c = await prisma.conversa.findUnique({ where: { id } });
    if (!c) return null;
    const v = lerVibrinha(c.dialogo);
    const ficha = await fichaCliente({ v: c.id, e: v.email ?? undefined, t: v.telefone ?? undefined });
    return { tipo: "chat" as const, ficha, chat: { ...c, ...v, assunto: assuntoVibrinha(`${c.apurado ?? ""} ${c.dialogo}`) } };
  }
  if (tipo === "c") {
    const c = await prisma.chamado.findUnique({
      where: { protocolo: id },
      select: { protocolo: true, nome: true, status: true, faixa: true, modelo: true, tensao: true, ocorrido: true, criadoEm: true, telefone: true, email: true, documento: true, canal: true },
    });
    if (!c) return null;
    const ficha = await fichaCliente({ d: c.documento, e: c.email, t: telefoneE164(c.telefone) ?? undefined });
    return { tipo: "chamado" as const, ficha, chamado: c };
  }
  if (tipo === "w") {
    const { conversas } = await whatsappDoSite();
    const w = conversas.find((x) => x.id === id);
    if (!w) return null;
    const ficha = await fichaCliente({ t: w.telefone });
    return { tipo: "whatsapp" as const, ficha, whatsapp: w };
  }
  return null;
}

/** Link para a ficha da pessoa em Clientes. */
export const linkCliente = (i: { documento?: string | null; email?: string | null; telefone?: string | null }) =>
  `/admin/clientes?${paramsPessoa(i)}`;
