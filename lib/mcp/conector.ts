import { PrismaClient, Prisma } from "@prisma/client";
import { z } from "zod/v4";
import {
  decidir,
  detectarGatilhos,
  documentoPara,
  MENSAGEM_ESCALONAMENTO,
  resumirLista,
  type AvaliacaoItem,
  type Faixa,
  type Modelo,
  type Sinal,
} from "@/lib/regras";
import { faixaDoChamado } from "@/lib/assistencia/analise";
import { montarLaudo } from "@/lib/assistencia/laudo";
import { hojeSP } from "@/lib/assistencia/compra";
import { urlAssinada } from "@/lib/assistencia/storage";
import { ESPACOS_FOTO } from "@/lib/assistencia/esquemas";
import { RE_PROTOCOLO } from "@/lib/assistencia/protocolo";
import type { Chamado } from "@prisma/client";

/**
 * Conector da Claude no portal (servidor MCP).
 *
 * Roda com o papel de banco `claude_conector`, e não com o usuário da
 * aplicação: o que este arquivo esquecer de proibir, o banco proíbe. Por isso
 * tudo aqui é SQL explícito · o Prisma pediria RETURNING de colunas que o papel
 * não pode ler.
 *
 * Matriz (briefing, seção 8). Ficam DE FORA, de propósito, e não existem aqui:
 * confirmar_negativa, confirmar_recusa, assinar_laudo_bancada e qualquer forma
 * de apagar chamado ou histórico.
 */
let db: PrismaClient | null = null;
function banco() {
  const url = process.env.DATABASE_URL_CLAUDE;
  // Sem o papel restrito, o conector não sobe. Nunca cai para o usuário da aplicação.
  if (!url) throw new Error("DATABASE_URL_CLAUDE não configurada: o conector não roda sem o papel restrito.");
  db ??= new PrismaClient({ datasourceUrl: url });
  return db;
}

type LinhaChamado = Omit<Chamado, "telefone" | "email" | "codigoReversa" | "lgpdEm" | "atualizadoEm" | "blingPedido"> & { documento: string };

async function chamado(protocolo: string): Promise<LinhaChamado> {
  if (!RE_PROTOCOLO.test(protocolo)) throw new Erro("protocolo inválido");
  const r = await banco().$queryRaw<LinhaChamado[]>`SELECT * FROM assistencia.chamados_claude WHERE protocolo = ${protocolo}`;
  if (!r[0]) throw new Erro("chamado não encontrado");
  return r[0];
}

export class Erro extends Error {}

const comoChamado = (c: LinhaChamado) => c as unknown as Chamado;

/** Recalcula, só com código, o que o motor decidiria agora. */
async function decisaoDoMotor(c: LinhaChamado) {
  const d = banco();
  const [aval, fotos] = await Promise.all([
    d.$queryRaw<{ categoria: string; codigo: string; resultado: string; texto: string | null; fotoRef: string | null; motivoInconclusivo: string | null; criadoEm: Date }[]>`
      SELECT categoria, codigo, resultado, texto, "fotoRef", "motivoInconclusivo", "criadoEm" FROM assistencia.avaliacoes WHERE "chamadoId" = ${c.id} ORDER BY "criadoEm"`,
    d.$queryRaw<{ espaco: string; caminho: string }[]>`SELECT espaco, caminho FROM assistencia.fotos WHERE "chamadoId" = ${c.id}`,
  ]);
  const sinais: Sinal[] = aval
    .filter((a) => a.categoria === "sinal")
    .map((a) => ({ codigo: a.codigo, nivel: a.resultado as Sinal["nivel"], texto: a.texto ?? a.codigo }));
  const itens = aval.filter((a) => a.categoria === "lista_fechada").slice(-4);
  const lista = itens.length
    ? resumirLista(itens.map((i): AvaliacaoItem => ({ item: i.codigo as AvaliacaoItem["item"], resultado: i.resultado as AvaliacaoItem["resultado"], foto_ref: i.fotoRef, motivo_inconclusivo: i.motivoInconclusivo })))
    : null;
  const ativas = new Set(fotos.filter((f) => !f.caminho.startsWith("tmp/")).map((f) => f.espaco));
  const faltando = ESPACOS_FOTO.filter((e) => !ativas.has(e)).map((e) => `foto ${e}`);
  const faixa = faixaDoChamado(comoChamado(c));
  const decisao = decidir({
    faixa,
    envio: c.enviadoEm.toISOString().slice(0, 10),
    modelo: (c.modelo as Modelo | null) ?? null,
    emissaoExata: c.emissao ? c.emissao.toISOString().slice(0, 10) : null,
    faltando,
    sinais,
    lista,
    conferirAprovacoes: process.env.ASSISTENCIA_LIBERACAO_AUTOMATICA !== "1",
  });
  return { faixa, decisao, faltando };
}

async function nota(chamadoId: string, texto: string, sugestao: string | null = null) {
  await banco().$executeRaw`
    INSERT INTO assistencia.decisoes (id, "chamadoId", autor, sugestao, nota)
    VALUES (${`cl${crypto.randomUUID().replace(/-/g, "")}`}, ${chamadoId}, 'claude', ${sugestao}, ${texto})`;
}

// ── ferramentas ─────────────────────────────────────────────────────────

const P = z.object({ protocolo: z.string() });

export const FERRAMENTAS = {
  listar_chamados: {
    descricao: "Lista chamados da assistência (CPF mascarado). Filtros opcionais: status, faixa e data mínima de abertura (AAAA-MM-DD).",
    entrada: z.object({ status: z.string().optional(), faixa: z.string().optional(), desde: z.string().optional() }),
    async rodar(a: { status?: string; faixa?: string; desde?: string }) {
      const desde = a.desde && /^\d{4}-\d{2}-\d{2}$/.test(a.desde) ? new Date(`${a.desde}T00:00:00Z`) : new Date(0);
      return banco().$queryRaw`
        SELECT protocolo, status, faixa, nome, documento, modelo, "criadoEm" FROM assistencia.chamados_claude
        WHERE "criadoEm" >= ${desde}
          AND (${a.status ?? null}::text IS NULL OR status::text = ${a.status ?? null})
          AND (${a.faixa ?? null}::text IS NULL OR faixa = ${a.faixa ?? null})
        ORDER BY "criadoEm" DESC LIMIT 200`;
    },
  },

  ler_chamado: {
    descricao: "Lê um chamado: dados (CPF mascarado), respostas, sinais, lista fechada, histórico e laudos.",
    entrada: P,
    async rodar(a: { protocolo: string }) {
      const c = await chamado(a.protocolo);
      const d = banco();
      const [respostas, avaliacoes, decisoes, laudos] = await Promise.all([
        d.$queryRaw`SELECT pergunta, valor, texto FROM assistencia.respostas WHERE "chamadoId" = ${c.id} ORDER BY ordem`,
        d.$queryRaw`SELECT categoria, codigo, resultado, texto, "fotoRef", "motivoInconclusivo", origem FROM assistencia.avaliacoes WHERE "chamadoId" = ${c.id}`,
        d.$queryRaw`SELECT autor, sugestao, "decisaoFinal", "motivoAlteracao", nota, "criadoEm" FROM assistencia.decisoes WHERE "chamadoId" = ${c.id} ORDER BY "criadoEm"`,
        d.$queryRaw`SELECT tipo, versao, liberado, conteudo FROM assistencia.laudos WHERE "chamadoId" = ${c.id} ORDER BY "criadoEm"`,
      ]);
      return { chamado: c, respostas, avaliacoes, decisoes, laudos };
    },
  },

  ler_fotos: {
    descricao: "URLs assinadas (10 min) das fotos reduzidas do chamado.",
    entrada: P,
    async rodar(a: { protocolo: string }) {
      const c = await chamado(a.protocolo);
      const fotos = await banco().$queryRaw<{ espaco: string; caminhoReduzido: string; caminho: string }[]>`
        SELECT DISTINCT ON (espaco) espaco, "caminhoReduzido", caminho FROM assistencia.fotos
        WHERE "chamadoId" = ${c.id} ORDER BY espaco, "criadoEm" DESC`;
      return Promise.all(
        fotos.filter((f) => !f.caminho.startsWith("tmp/")).map(async (f) => ({ espaco: f.espaco, url: await urlAssinada(f.caminhoReduzido, 600) })),
      );
    },
  },

  registrar_sugestao: {
    descricao: "Registra uma sugestão da Claude no histórico (autor Claude). Sugestão não é decisão: negativa e recusa só uma pessoa confirma.",
    entrada: P.extend({ sugestao: z.enum(["aprovacao", "autorizacao", "negativa", "recusa", "revisar", "pedido_informacao"]), fundamento: z.string().min(5) }),
    async rodar(a: { protocolo: string; sugestao: string; fundamento: string }) {
      const c = await chamado(a.protocolo);
      await nota(c.id, a.fundamento, a.sugestao);
      return { ok: true };
    },
  },

  registrar_nota: {
    descricao: "Registra uma nota da Claude no histórico do chamado.",
    entrada: P.extend({ nota: z.string().min(3) }),
    async rodar(a: { protocolo: string; nota: string }) {
      const c = await chamado(a.protocolo);
      await nota(c.id, a.nota);
      return { ok: true };
    },
  },

  criar_rascunho: {
    descricao: "Cria um rascunho (não liberado) de laudo para o chamado. O tipo vem do motor: a Claude só redige o texto.",
    entrada: P.extend({ desfecho: z.enum(["favoravel", "desfavoravel"]), fundamentacao: z.string().min(10), conclusao: z.string().min(5), mensagem_cliente: z.string().min(5) }),
    async rodar(a: { protocolo: string; desfecho: "favoravel" | "desfavoravel"; fundamentacao: string; conclusao: string; mensagem_cliente: string }) {
      const c = await chamado(a.protocolo);
      const doc = documentoPara(c.faixa as Faixa, a.desfecho);
      if (!doc) throw new Erro("a faixa deste chamado não tem documento");
      const { decisao } = await decisaoDoMotor(c);
      const conteudo = montarLaudo({
        documento: doc,
        protocolo: c.protocolo,
        hoje: hojeSP(),
        chamado: { ...c, documento: c.documento, telefone: "", nfTexto: c.nfTexto, emissao: c.emissao?.toISOString().slice(0, 10) ?? null, faixa: c.faixa as Faixa },
        texto: { fundamentacao: a.fundamentacao, conclusao: a.conclusao, mensagem_cliente: a.mensagem_cliente },
        pontos: decisao.pontosAVerificar,
      });
      // O CPF já vem mascarado da visão: não mascarar de novo.
      conteudo.proprietario.documento = c.documento;
      const v = await banco().$queryRaw<{ n: bigint }[]>`SELECT count(*) AS n FROM assistencia.laudos WHERE "chamadoId" = ${c.id} AND tipo = ${doc.tipo}`;
      await banco().$executeRaw`
        INSERT INTO assistencia.laudos (id, "chamadoId", tipo, versao, conteudo, liberado)
        VALUES (${`cl${crypto.randomUUID().replace(/-/g, "")}`}, ${c.id}, ${doc.tipo}, ${Number(v[0].n) + 1}, ${JSON.stringify(conteudo)}::jsonb, false)`;
      return { ok: true, tipo: doc.tipo, versao: Number(v[0].n) + 1 };
    },
  },

  liberar_aprovacao: {
    descricao: "Libera a aprovação/autorização do chamado SOMENTE se o motor de regras, em código, também liberaria sozinho. Usa o último rascunho favorável.",
    entrada: P,
    async rodar(a: { protocolo: string }) {
      const c = await chamado(a.protocolo);
      if (c.status !== "EM_ANALISE") throw new Erro("chamado fora da fila");
      const { decisao } = await decisaoDoMotor(c);
      if (decisao.rota !== "automatica" || (decisao.acao !== "aprovar_envio" && decisao.acao !== "autorizar_troca"))
        throw new Erro(`as regras não liberam este chamado sem uma pessoa (${decisao.sugestao}: ${decisao.motivos.join("; ")})`);
      const tipo = decisao.documento!.tipo;
      const r = await banco().$queryRaw<{ conteudo: unknown; versao: number }[]>`
        SELECT conteudo, versao FROM assistencia.laudos WHERE "chamadoId" = ${c.id} AND tipo = ${tipo} ORDER BY versao DESC LIMIT 1`;
      if (!r[0]) throw new Erro("crie o rascunho do laudo antes de liberar");
      const d = banco();
      await d.$transaction([
        d.$executeRaw`INSERT INTO assistencia.decisoes (id, "chamadoId", autor, sugestao, "decisaoFinal", nota)
          VALUES (${`cl${crypto.randomUUID().replace(/-/g, "")}`}, ${c.id}, 'claude', ${decisao.sugestao}, ${decisao.sugestao}, 'Liberado pela Claude: as regras em código liberam sem fila.')`,
        d.$executeRaw`INSERT INTO assistencia.laudos (id, "chamadoId", tipo, versao, conteudo, liberado, "liberadoPorAutor", "liberadoEm")
          VALUES (${`cl${crypto.randomUUID().replace(/-/g, "")}`}, ${c.id}, ${tipo}, ${r[0].versao + 1}, ${JSON.stringify(r[0].conteudo)}::jsonb, true, 'claude', now())`,
        d.$executeRaw`UPDATE assistencia.chamados SET status = 'AGUARDANDO_ENVIO', "atualizadoEm" = now() WHERE id = ${c.id}`,
      ]);
      return { ok: true, tipo };
    },
  },

  pedir_informacao: {
    descricao: "Pede ao cliente foto ou dado que falta. Só quando o motor confirma que algo falta.",
    entrada: P.extend({ o_que_falta: z.string().min(5) }),
    async rodar(a: { protocolo: string; o_que_falta: string }) {
      const c = await chamado(a.protocolo);
      const { faltando, faixa } = await decisaoDoMotor(c);
      const semData = !faixa.dataConfirmada && c.emissao === null && c.emissaoFonte === null;
      if (!faltando.length && !semData) throw new Erro("as regras não registram nada faltando neste chamado");
      const d = banco();
      await d.$transaction([
        d.$executeRaw`INSERT INTO assistencia.decisoes (id, "chamadoId", autor, sugestao, "decisaoFinal", nota)
          VALUES (${`cl${crypto.randomUUID().replace(/-/g, "")}`}, ${c.id}, 'claude', 'pedido_informacao', 'pedido_informacao', ${a.o_que_falta})`,
        d.$executeRaw`UPDATE assistencia.chamados SET status = 'PENDENTE_INFORMACAO', "atualizadoEm" = now() WHERE id = ${c.id}`,
      ]);
      return { ok: true, faltando };
    },
  },

  orientar_marketplace: {
    descricao: "Orienta a devolução no marketplace. Só quando o motor confirma marketplace até 30 dias.",
    entrada: P,
    async rodar(a: { protocolo: string }) {
      const c = await chamado(a.protocolo);
      const { faixa } = await decisaoDoMotor(c);
      if (faixa.faixa !== "marketplace_30") throw new Erro("as regras não classificam este chamado como marketplace até 30 dias");
      await banco().$executeRaw`UPDATE assistencia.chamados SET status = 'ORIENTADO_MARKETPLACE', "atualizadoEm" = now() WHERE id = ${c.id}`;
      await nota(c.id, "Orientado a devolver no marketplace.", "orientacao_marketplace");
      return { ok: true };
    },
  },

  responder_conversa: {
    descricao: "Responde ao cliente (WhatsApp/chat · fase 3). Bloqueado quando há gatilho de escalonamento: aí escala para uma pessoa.",
    entrada: P.extend({ mensagem_do_cliente: z.string(), resposta: z.string() }),
    async rodar(a: { protocolo: string; mensagem_do_cliente: string; resposta: string }) {
      return responder(a, "conversa");
    },
  },

  responder_email: {
    descricao: "Responde ao e-mail do cliente (sac@ · fase 2). Bloqueado quando há gatilho de escalonamento: aí escala para uma pessoa.",
    entrada: P.extend({ mensagem_do_cliente: z.string(), resposta: z.string() }),
    async rodar(a: { protocolo: string; mensagem_do_cliente: string; resposta: string }) {
      return responder(a, "email");
    },
  },

  escalar_para_humano: {
    descricao: "Passa o chamado para a fila humana, com o motivo.",
    entrada: P.extend({ motivo: z.string().min(3) }),
    async rodar(a: { protocolo: string; motivo: string }) {
      const c = await chamado(a.protocolo);
      await escalar(c, a.motivo);
      return { ok: true };
    },
  },
} as const;

async function escalar(c: LinhaChamado, motivo: string) {
  const d = banco();
  await d.$transaction([
    d.$executeRaw`INSERT INTO assistencia.decisoes (id, "chamadoId", autor, sugestao, nota)
      VALUES (${`cl${crypto.randomUUID().replace(/-/g, "")}`}, ${c.id}, 'claude', 'revisar', ${`Escalado para humano: ${motivo}`})`,
    d.$executeRaw`UPDATE assistencia.chamados SET status = 'EM_ANALISE', "atualizadoEm" = now() WHERE id = ${c.id} AND status NOT IN ('NEGADO', 'RECUSADO', 'CONCLUIDO')`,
  ]);
}

async function responder(a: { protocolo: string; mensagem_do_cliente: string }, canal: "conversa" | "email") {
  const c = await chamado(a.protocolo);
  const anteriores = await banco().$queryRaw<{ n: bigint }[]>`
    SELECT count(*) AS n FROM assistencia.chamados_claude
    WHERE id <> ${c.id} AND documento = ${c.documento} AND modelo IS NOT DISTINCT FROM ${c.modelo}`;
  const gatilhos = detectarGatilhos({ texto: a.mensagem_do_cliente, reclamacaoAnterior: Number(anteriores[0].n) > 0 });
  if (gatilhos.length) {
    await escalar(c, `gatilhos: ${gatilhos.join(", ")}`);
    return { bloqueado: true, gatilhos, responda_somente: MENSAGEM_ESCALONAMENTO };
  }
  throw new Erro(`o canal ${canal === "email" ? "de e-mail (fase 2)" : "de conversa (fase 3)"} ainda não está ligado`);
}

export type NomeFerramenta = keyof typeof FERRAMENTAS;

export function errosDoBanco(e: unknown): string {
  if (e instanceof Erro) return e.message;
  if (e instanceof Prisma.PrismaClientKnownRequestError || e instanceof Prisma.PrismaClientUnknownRequestError)
    return `recusado pelo banco: ${e.message.split("\n").filter(Boolean).at(-1)}`;
  return e instanceof Error ? e.message : String(e);
}
