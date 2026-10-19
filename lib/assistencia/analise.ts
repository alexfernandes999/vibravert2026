import type { Chamado, Prisma, StatusChamado } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  calcularFaixa,
  decidir,
  decomporChave,
  precisaAnaliseDeFotos,
  resumirLista,
  triagem,
  REGRAS_VERSION,
  type Canal,
  type Decisao,
  type Emissao,
  type Faixa,
  type Modelo,
  type ResultadoFaixa,
  type Respostas,
  type ResumoLista,
} from "@/lib/regras";
import { ESPACOS_FOTO, ROTULO_ESPACO, type EspacoFoto } from "./esquemas";
import { arquivarFoto, baixar } from "./storage";
import { FalhaIA, identificarListaFechada, redigir, type Uso } from "./claude";
import { montarLaudo } from "./laudo";
import { hojeSP } from "./compra";

/**
 * Pipeline de um chamado de garantia, depois que o protocolo já saiu.
 *
 *   fotos → ~1000 px → Sonnet (lista fechada) → Zod → regras → liberação ou fila
 *
 * Roda depois da resposta ao cliente (after()). Tudo o que falha cai na fila
 * humana com o motivo; nada é inventado e nada é tentado de novo em loop.
 */

const dataISO = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);

/** Recalcula a faixa a partir do que ficou gravado no chamado. */
export function faixaDoChamado(c: Chamado): ResultadoFaixa {
  let emissao: Emissao = null;
  if (c.emissao) emissao = { tipo: "exata", data: dataISO(c.emissao)! };
  else if (c.emissaoFonte === "chave_mes" && c.nfChave) {
    const k = decomporChave(c.nfChave);
    if (k) emissao = { tipo: "mes", ano: k.ano, mes: k.mes };
  }
  return calcularFaixa({
    envio: dataISO(c.enviadoEm)!,
    emissao,
    recebimento: dataISO(c.recebimento),
    canal: c.canal as Canal,
    canalConfirmado: c.canalConfirmado,
    usou: c.usou,
  });
}

export function respostasDoChamado(c: Chamado, linhas: { pergunta: string; valor: string }[]): Respostas | null {
  const v = Object.fromEntries(linhas.map((l) => [l.pergunta, l.valor]));
  if (!v.tempo || !c.tensao) return null;
  return {
    tensaoBomba: c.tensao as Respostas["tensaoBomba"],
    tempo: v.tempo as Respostas["tempo"],
    tempoMinutos: v.tempoMinutos ? Number(v.tempoMinutos) : null,
    rede: v.rede as Respostas["rede"],
    submersa: v.submersa as Respostas["submersa"],
    distancia: v.distancia as Respostas["distancia"],
    sustentacao: v.sustentacao as Respostas["sustentacao"],
    emenda: v.emenda as Respostas["emenda"],
    agua: v.agua as Respostas["agua"],
    energia: v.energia as Respostas["energia"],
  };
}

async function registrarUso(chamadoId: string, finalidade: string, u: Uso | null, erro?: string) {
  if (!u && !erro) return;
  await prisma.chamadaIA.create({
    data: {
      chamadoId,
      finalidade,
      modelo: u?.modelo ?? "desconhecido",
      tokensEntrada: u?.tokensEntrada ?? 0,
      tokensSaida: u?.tokensSaida ?? 0,
      cacheLeitura: u?.cacheLeitura ?? 0,
      cacheEscrita: u?.cacheEscrita ?? 0,
      custoUsd: u?.custoUsd ?? 0,
      sucesso: !erro,
      erro: erro?.slice(0, 500),
    },
  });
}

/** Conferência das aprovações automáticas ligada até a diretoria liberar. */
const conferirAprovacoes = () => process.env.ASSISTENCIA_LIBERACAO_AUTOMATICA !== "1";

/** Fotos: tira do rascunho, grava original e reduzida, devolve o que falta. */
async function arquivarFotos(c: Chamado) {
  const linhas = await prisma.foto.findMany({ where: { chamadoId: c.id }, orderBy: { criadoEm: "desc" } });
  const reduzidas = new Map<EspacoFoto, Buffer>();
  const faltando: string[] = [];

  for (const espaco of ESPACOS_FOTO) {
    const f = linhas.find((l) => l.espaco === espaco);
    if (!f) {
      faltando.push(`foto "${ROTULO_ESPACO[espaco].t}"`);
      continue;
    }
    try {
      if (f.caminho.startsWith("tmp/")) {
        const a = await arquivarFoto(f.caminho, c.protocolo, espaco);
        await prisma.foto.update({
          where: { id: f.id },
          data: { caminho: a.caminho, caminhoReduzido: a.caminhoReduzido, largura: a.largura, altura: a.altura, bytes: a.bytes },
        });
        reduzidas.set(espaco, a.reduzida);
      } else {
        reduzidas.set(espaco, await baixar(f.caminhoReduzido));
      }
    } catch {
      faltando.push(`foto "${ROTULO_ESPACO[espaco].t}" (arquivo ilegível, envie de novo)`);
    }
  }
  return { reduzidas, faltando };
}

const STATUS: Record<Decisao["acao"], StatusChamado> = {
  arrependimento: "ARREPENDIMENTO",
  orientar_marketplace: "ORIENTADO_MARKETPLACE",
  pedir_informacao: "PENDENTE_INFORMACAO",
  autorizar_troca: "AGUARDANDO_ENVIO",
  aprovar_envio: "AGUARDANDO_ENVIO",
  revisar: "EM_ANALISE",
};

export async function processarChamado(chamadoId: string) {
  const c = await prisma.chamado.findUnique({ where: { id: chamadoId }, include: { respostas: true } });
  if (!c) return;

  const faixa = faixaDoChamado(c);
  const respostas = respostasDoChamado(c, c.respostas);
  const sinais = respostas ? triagem(respostas) : [];

  const { reduzidas, faltando } = await arquivarFotos(c);
  const motivosExtras: string[] = [];

  // ── lista fechada: só quando o código ainda não resolveu ────────────
  let lista: ResumoLista | null = null;
  if (precisaAnaliseDeFotos(faixa, faltando)) {
    try {
      const { itens, uso } = await identificarListaFechada(ESPACOS_FOTO.map((espaco) => ({ espaco, jpeg: reduzidas.get(espaco)! })));
      await registrarUso(c.id, "lista_fechada", uso);
      lista = resumirLista(itens);
      await prisma.avaliacao.createMany({
        data: lista.itens.map((i) => ({
          chamadoId: c.id,
          categoria: "lista_fechada",
          codigo: i.item,
          resultado: i.resultado,
          fotoRef: i.foto_ref,
          motivoInconclusivo: i.motivo_inconclusivo,
          origem: "claude",
        })),
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await registrarUso(c.id, "lista_fechada", e instanceof FalhaIA ? e.uso : null, msg);
      motivosExtras.push(`Análise das fotos falhou: ${msg}`);
    }
  }

  // ── decisão do motor ───────────────────────────────────────────────
  const hoje = hojeSP();
  const decisao = decidir({
    faixa,
    envio: dataISO(c.enviadoEm)!,
    modelo: (c.modelo as Modelo | null) ?? null,
    emissaoExata: dataISO(c.emissao),
    faltando,
    sinais,
    lista,
    conferirAprovacoes: conferirAprovacoes(),
  });

  let status = STATUS[decisao.acao];
  if (decisao.rota === "fila_humana") status = "EM_ANALISE";

  // ── texto do laudo (Haiku): aprovação automática ou rascunho para a fila ──
  let laudo: Prisma.LaudoCreateManyInput | null = null;
  if (decisao.documento) {
    try {
      const { texto, uso } = await redigir({
        protocolo: c.protocolo,
        documento: decisao.documento.tipo,
        faixa: faixa.faixa,
        modelo: c.modelo,
        ocorrido: c.ocorrido,
        motivos: decisao.motivos,
        pontos_a_verificar: decisao.pontosAVerificar.map((p) => p.texto),
        frete: decisao.documento.frete,
      });
      await registrarUso(c.id, "laudo", uso);
      const automatico = decisao.rota === "automatica";
      laudo = {
        chamadoId: c.id,
        tipo: decisao.documento.tipo,
        versao: 1,
        conteudo: montarLaudo({
          documento: decisao.documento,
          protocolo: c.protocolo,
          hoje,
          chamado: {
            nome: c.nome,
            documento: c.documento,
            telefone: c.telefone,
            nfTexto: c.nfTexto,
            emissao: dataISO(c.emissao),
            canal: c.canal,
            faixa: faixa.faixa as Faixa,
            modelo: c.modelo,
            tensao: c.tensao,
            serie: c.serie,
          },
          texto,
          pontos: decisao.pontosAVerificar,
        }) as unknown as Prisma.InputJsonValue,
        liberado: automatico,
        liberadoPorAutor: automatico ? "codigo" : null,
        liberadoEm: automatico ? new Date() : null,
      };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await registrarUso(c.id, "laudo", e instanceof FalhaIA ? e.uso : null, msg);
      // Sem texto validado, a aprovação não sai sozinha.
      if (decisao.rota === "automatica") {
        status = "EM_ANALISE";
        motivosExtras.push(`Laudo não redigido: ${msg}`);
      }
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.decisao.create({
      data: {
        chamadoId: c.id,
        autor: "codigo",
        sugestao: decisao.sugestao,
        // Só o automático vira decisão final; o resto é sugestão para a fila.
        decisaoFinal: decisao.rota === "automatica" && status !== "EM_ANALISE" ? decisao.sugestao : null,
        detalhes: {
          regras: REGRAS_VERSION,
          rota: status === "EM_ANALISE" ? "fila_humana" : decisao.rota,
          acao: decisao.acao,
          motivos: [...decisao.motivos, ...motivosExtras],
          pontosAVerificar: decisao.pontosAVerificar.map((p) => ({ ...p })),
          faltando,
          faixa: { ...faixa },
        } as Prisma.InputJsonValue,
      },
    });
    // Reprocessar (foto reenviada) gera nova versão: a anterior não muda.
    if (laudo) {
      const versao = (await tx.laudo.count({ where: { chamadoId: c.id, tipo: laudo.tipo } })) + 1;
      await tx.laudo.create({ data: { ...laudo, versao } });
    }
    await tx.chamado.update({ where: { id: c.id }, data: { status, faixa: faixa.faixa, pendenciaRegra: faixa.pendencia ?? null } });
  });
}
