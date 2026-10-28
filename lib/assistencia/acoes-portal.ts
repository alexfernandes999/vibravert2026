"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Prisma, StatusChamado } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { usuarioAtual, registrarAcao } from "@/lib/admin-auth";
import { documentoPara, type Documento } from "@/lib/regras/documentos";
import { dataValida } from "@/lib/regras/datas";
import type { Faixa } from "@/lib/regras/tipos";
import { processarChamado } from "./analise";
import { redigir, FalhaIA } from "./claude";
import { montarLaudo, type ConteudoLaudo } from "./laudo";
import { hojeSP } from "./compra";

/**
 * Ações do portal interno. Toda ação confere a pessoa de novo no servidor:
 * esconder o botão não é proteção. E o banco confere mais uma vez · negativa
 * sem pessoa e assinatura sem técnico são recusadas lá, mesmo com bug aqui.
 */
async function pessoa() {
  const eu = await usuarioAtual();
  if (!eu) redirect("/admin/entrar");
  return eu;
}

type Resultado = { ok: true; mensagem?: string } | { ok: false; erro: string };

/**
 * `resolvido_fora`: o caso já foi atendido por outro caminho (WhatsApp, troca no
 * balcão, desistência). Encerra sem laudo e sem a Claude · a nota diz o que foi
 * feito. Não é negativa: o status final é ENCERRADO.
 */
const DECISOES = ["aprovacao", "autorizacao", "negativa", "recusa", "pedido_informacao", "resolvido_fora"] as const;
type DecisaoHumana = (typeof DECISOES)[number];

const iso = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);

/** Laudo para a decisão: o rascunho da Claude, se houver; senão redige agora. */
async function laudoPara(chamadoId: string, doc: Documento, pontos: { codigo: string; nivel: "vermelho" | "amarelo"; texto: string }[], nota: string | null) {
  const c = await prisma.chamado.findUniqueOrThrow({ where: { id: chamadoId } });
  const rascunho = await prisma.laudo.findFirst({ where: { chamadoId, tipo: doc.tipo }, orderBy: { versao: "desc" } });
  let conteudo = rascunho?.conteudo as unknown as ConteudoLaudo | undefined;
  if (!conteudo || nota) {
    const { texto, uso } = await redigir({
      protocolo: c.protocolo,
      documento: doc.tipo,
      faixa: c.faixa,
      modelo: c.modelo,
      ocorrido: c.ocorrido,
      fundamento_do_operador: nota,
      pontos_a_verificar: pontos.map((p) => p.texto),
      frete: doc.frete,
    });
    await prisma.chamadaIA.create({
      data: { chamadoId, finalidade: "laudo", modelo: uso.modelo, tokensEntrada: uso.tokensEntrada, tokensSaida: uso.tokensSaida, cacheLeitura: uso.cacheLeitura, cacheEscrita: uso.cacheEscrita, custoUsd: uso.custoUsd, sucesso: true },
    });
    conteudo = montarLaudo({
      documento: doc,
      protocolo: c.protocolo,
      hoje: hojeSP(),
      chamado: { nome: c.nome, documento: c.documento, telefone: c.telefone, nfTexto: c.nfTexto, emissao: iso(c.emissao), canal: c.canal, faixa: c.faixa as Faixa, modelo: c.modelo, tensao: c.tensao, serie: c.serie },
      texto,
      pontos,
    });
  }
  const versao = (rascunho?.versao ?? 0) + 1;
  return { conteudo, versao };
}

/** Decisão humana sobre um chamado da fila. */
export async function decidirChamado(_: unknown, dados: FormData): Promise<Resultado> {
  const eu = await pessoa();
  const protocolo = String(dados.get("protocolo") ?? "");
  const decisao = String(dados.get("decisao") ?? "") as DecisaoHumana;
  const conferiuFotos = dados.get("conferiuFotos") === "on";
  const motivo = String(dados.get("motivo") ?? "").trim() || null;
  const nota = String(dados.get("nota") ?? "").trim() || null;
  if (!DECISOES.includes(decisao)) return { ok: false, erro: "Escolha a decisão." };

  const c = await prisma.chamado.findUnique({
    where: { protocolo },
    include: { decisoes: { orderBy: { criadoEm: "desc" }, take: 1 } },
  });
  if (!c) return { ok: false, erro: "Chamado não encontrado." };
  if (c.status !== "EM_ANALISE") return { ok: false, erro: "Este chamado não está na fila." };

  const desfavoravel = decisao === "negativa" || decisao === "recusa";
  if (desfavoravel && !conferiuFotos) return { ok: false, erro: 'Marque "Conferi as 6 fotos e as respostas" para confirmar.' };
  if (decisao === "recusa" && c.faixa !== "troca_expressa") return { ok: false, erro: "Recusa é da Troca Expressa. Fora dela, é negativa." };
  if (decisao === "autorizacao" && c.faixa !== "troca_expressa") return { ok: false, erro: "Autorização é da Troca Expressa. Fora dela, é aprovação." };
  if (decisao === "pedido_informacao" && !nota) return { ok: false, erro: "Diga ao cliente o que falta." };
  if (decisao === "resolvido_fora" && !nota) return { ok: false, erro: "Escreva o que foi feito com o cliente." };
  const semLaudo = decisao === "pedido_informacao" || decisao === "resolvido_fora";

  const ultima = c.decisoes[0];
  const sugestao = ultima?.sugestao ?? null;
  if (sugestao && sugestao !== decisao && sugestao !== "revisar" && decisao !== "resolvido_fora" && !motivo)
    return { ok: false, erro: "Você decidiu diferente da sugestão: escreva o motivo. É ele que melhora as regras." };

  if (!semLaudo && c.faixa === "indefinida")
    return { ok: false, erro: "A faixa ainda não está confirmada. Informe a data de emissão e o canal antes de decidir." };

  const detalhes = (ultima?.detalhes ?? {}) as { pontosAVerificar?: { codigo: string; nivel: "vermelho" | "amarelo"; texto: string }[] };
  const pontos = detalhes.pontosAVerificar ?? [];

  let laudo: { conteudo: ConteudoLaudo; versao: number; tipo: Documento["tipo"] } | null = null;
  if (!semLaudo) {
    const doc = documentoPara(c.faixa as Faixa, desfavoravel ? "desfavoravel" : "favoravel");
    if (!doc) return { ok: false, erro: "Não há documento para esta faixa. Confirme a faixa do chamado." };
    try {
      const l = await laudoPara(c.id, doc, pontos, nota);
      laudo = { ...l, tipo: doc.tipo };
    } catch (e) {
      return { ok: false, erro: `O texto do laudo não foi gerado (${e instanceof FalhaIA ? e.message : "erro"}). Tente de novo em instantes.` };
    }
  }

  const status: StatusChamado =
    decisao === "negativa" ? "NEGADO" : decisao === "recusa" ? "RECUSADO" : decisao === "pedido_informacao" ? "PENDENTE_INFORMACAO"
    : decisao === "resolvido_fora" ? "ENCERRADO" : "AGUARDANDO_ENVIO";

  // Ordem importa: a decisão humana entra antes do status e do laudo, que os
  // triggers só aceitam com ela registrada.
  await prisma.$transaction(async (tx) => {
    await tx.decisao.create({
      data: { chamadoId: c.id, autor: "pessoa", usuarioId: eu.id, sugestao, decisaoFinal: decisao, motivoAlteracao: motivo, conferiuFotos, nota },
    });
    if (laudo) {
      await tx.laudo.create({
        data: {
          chamadoId: c.id,
          tipo: laudo.tipo,
          versao: laudo.versao,
          conteudo: laudo.conteudo as unknown as Prisma.InputJsonValue,
          liberado: true,
          liberadoPorAutor: "pessoa",
          liberadoPorId: eu.id,
          liberadoEm: new Date(),
        },
      });
    }
    await tx.chamado.update({ where: { id: c.id }, data: { status } });
  });
  await registrarAcao(`assistência: ${decisao}`, protocolo, motivo ?? undefined);
  revalidatePath("/admin/assistencia", "layout");
  return { ok: true, mensagem: "Decisão registrada." };
}

/** Operador informa a data de emissão e o canal (NF de revenda ou sem Bling). */
export async function confirmarCompraManual(_: unknown, dados: FormData): Promise<Resultado> {
  const eu = await pessoa();
  const protocolo = String(dados.get("protocolo") ?? "");
  const emissao = String(dados.get("emissao") ?? "");
  const canal = String(dados.get("canal") ?? "");
  if (!dataValida(emissao)) return { ok: false, erro: "Data de emissão inválida." };
  if (!["site", "venda_direta_outra", "ml", "shopee", "magalu", "amazon", "revenda"].includes(canal)) return { ok: false, erro: "Escolha o canal." };
  const c = await prisma.chamado.findUnique({ where: { protocolo } });
  if (!c || c.status !== "EM_ANALISE") return { ok: false, erro: "Chamado não está na fila." };

  await prisma.$transaction([
    prisma.chamado.update({
      where: { id: c.id },
      data: { emissao: new Date(`${emissao}T00:00:00Z`), emissaoFonte: "operador", canal, canalConfirmado: true, status: "ANALISANDO" },
    }),
    prisma.decisao.create({
      data: { chamadoId: c.id, autor: "pessoa", usuarioId: eu.id, nota: `Data de emissão ${emissao} e canal ${canal} confirmados pelo operador.` },
    }),
  ]);
  after(() => processarChamado(c.id));
  revalidatePath("/admin/assistencia", "layout");
  return { ok: true, mensagem: "Compra confirmada. O chamado foi reanalisado." };
}

// ── bancada ──────────────────────────────────────────────────────────────

/** Recebimento: etiqueta da reversa → protocolo na caixa → rastreio → nome, CPF, NF ou série. */
export async function receberBomba(_: unknown, dados: FormData): Promise<Resultado & { protocolo?: string }> {
  await pessoa();
  const q = String(dados.get("busca") ?? "").trim();
  if (q.length < 3) return { ok: false, erro: "Leia a etiqueta ou digite o protocolo, rastreio, CPF, NF ou série." };
  const Q = q.toUpperCase();
  const so = q.replace(/\D/g, "");

  const tentativas: [string, Prisma.ChamadoWhereInput][] = [
    ["etiqueta_reversa", { codigoReversa: Q }],
    ["protocolo_caixa", { protocolo: Q }],
    ["rastreio", { rastreio: Q }],
    ["busca", { OR: [{ serie: q }, ...(so.length >= 3 ? [{ documento: so }, { nfNumero: Number(so) || -1 }] : []), { nome: { contains: q, mode: "insensitive" } }] }],
  ];
  for (const [como, where] of tentativas) {
    const achados = await prisma.chamado.findMany({
      where: { ...where, status: { in: ["AGUARDANDO_ENVIO", "A_CAMINHO"] } },
      take: 2,
    });
    if (achados.length === 1) {
      const c = achados[0];
      await prisma.$transaction([
        prisma.bancada.create({ data: { chamadoId: c.id, recebidoEm: new Date(), identificadoPor: como } }),
        prisma.chamado.update({ where: { id: c.id }, data: { status: "NA_BANCADA" } }),
      ]);
      revalidatePath("/admin/assistencia", "layout");
      return { ok: true, protocolo: c.protocolo, mensagem: `Recebida: ${c.protocolo}. Prazo de 48 h iniciado.` };
    }
    if (achados.length > 1) return { ok: false, erro: "Mais de um chamado com esse dado. Use o protocolo ou a etiqueta." };
  }
  return { ok: false, erro: "Nenhum chamado aguardando envio com esse dado. Registre como recebimento sem identificação." };
}

const CHECKLIST = ["cabo", "carcaca", "abertura", "liga", "recalca", "borrachas", "bobina", "vedacao", "interior"] as const;

export async function salvarBancada(_: unknown, dados: FormData): Promise<Resultado> {
  await pessoa();
  const protocolo = String(dados.get("protocolo") ?? "");
  const b = await prisma.bancada.findFirst({ where: { chamado: { protocolo } } });
  if (!b) return { ok: false, erro: "Bomba não recebida na bancada." };
  if (b.assinadoEm) return { ok: false, erro: "Laudo já assinado." };
  const num = (k: string) => {
    const v = String(dados.get(k) ?? "").replace(",", ".").trim();
    return v === "" ? null : Number(v);
  };
  await prisma.bancada.update({
    where: { id: b.id },
    data: {
      checklist: Object.fromEntries(CHECKLIST.map((k) => [k, String(dados.get(`c_${k}`) ?? "")])),
      resistenciaOhm: num("resistenciaOhm"),
      isolacaoMOhm: num("isolacaoMOhm"),
      correnteA: num("correnteA"),
      pecas: String(dados.get("pecas") ?? "").split("\n").map((x) => x.trim()).filter(Boolean),
      observacao: String(dados.get("observacao") ?? ""),
      conclusaoFinal: String(dados.get("conclusao") ?? "") || null,
    },
  });
  revalidatePath(`/admin/assistencia/bancada/${protocolo}`);
  return { ok: true, mensagem: "Registro salvo." };
}

const CONCLUSOES: Record<string, string> = {
  garantia: "Defeito de fabricação constatado. Garantia aprovada.",
  mau_uso: "Dano por uso fora das orientações do manual. Garantia não se aplica.",
  sem_defeito: "Nenhum defeito constatado nos testes de bancada.",
};

/** Assinatura: só TECNICO (o banco confere), com observação e conclusão. */
export async function assinarBancada(_: unknown, dados: FormData): Promise<Resultado> {
  const eu = await pessoa();
  if (eu.papel !== "TECNICO") return { ok: false, erro: "Só o técnico responsável assina o laudo de bancada." };
  if (dados.get("responsavel") !== "on") return { ok: false, erro: 'Marque "Sou o responsável técnico".' };
  const protocolo = String(dados.get("protocolo") ?? "");
  const c = await prisma.chamado.findUnique({ where: { protocolo }, include: { bancada: true } });
  const b = c?.bancada;
  if (!c || !b) return { ok: false, erro: "Bomba não recebida na bancada." };
  if (!b.observacao?.trim() || !b.conclusaoFinal || !CONCLUSOES[b.conclusaoFinal])
    return { ok: false, erro: "Salve a observação e defina a conclusão antes de assinar." };

  let texto;
  try {
    texto = (
      await redigir({
        protocolo,
        documento: "bancada",
        modelo: c.modelo,
        observacao_do_tecnico: b.observacao,
        conclusao: CONCLUSOES[b.conclusaoFinal],
        medicoes: { resistenciaOhm: b.resistenciaOhm?.toString(), isolacaoMOhm: b.isolacaoMOhm?.toString(), correnteA: b.correnteA?.toString() },
        pecas: b.pecas,
      })
    ).texto;
  } catch {
    return { ok: false, erro: "O texto do laudo não foi gerado. Tente de novo em instantes." };
  }

  const conteudo: ConteudoLaudo = {
    ...montarLaudo({
      documento: { tipo: "aprovacao_31_90", anexos: [], banner: b.conclusaoFinal === "garantia" ? "azul" : "vermelho", frete: "" },
      protocolo,
      hoje: hojeSP(),
      chamado: { nome: c.nome, documento: c.documento, telefone: c.telefone, nfTexto: c.nfTexto, emissao: iso(c.emissao), canal: c.canal, faixa: c.faixa as Faixa, modelo: c.modelo, tensao: c.tensao, serie: c.serie },
      texto: { ...texto, fundamentacao: `${b.observacao.trim()}\n\n${texto.fundamentacao}` },
      pontos: [],
    }),
    tipo: "bancada",
    titulo: "Laudo de bancada",
    resultado: CONCLUSOES[b.conclusaoFinal],
    anexos: [],
  };

  await prisma.$transaction(async (tx) => {
    await tx.bancada.update({ where: { id: b.id }, data: { assinadoPorId: eu.id, assinadoEm: new Date() } });
    const versao = (await tx.laudo.count({ where: { chamadoId: c.id, tipo: "bancada" } })) + 1;
    await tx.laudo.create({
      data: { chamadoId: c.id, tipo: "bancada", versao, conteudo: conteudo as unknown as Prisma.InputJsonValue, liberado: true, liberadoPorAutor: "pessoa", liberadoPorId: eu.id, liberadoEm: new Date() },
    });
    await tx.chamado.update({ where: { id: c.id }, data: { status: "CONCLUIDO" } });
  });
  await registrarAcao("assistência: assinou laudo de bancada", protocolo, b.conclusaoFinal);
  revalidatePath("/admin/assistencia", "layout");
  return { ok: true, mensagem: "Laudo assinado e liberado ao cliente." };
}
