"use server";

import { after } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { calcularFaixa, decidir, triagem, REGRAS_VERSION, type Respostas } from "@/lib/regras";
import { chamadoArrependimento, chamadoGarantia, ESPACOS_FOTO, type EspacoFoto } from "./esquemas";
import { confirmarCompra, hojeSP } from "./compra";
import { proximoProtocolo } from "./protocolo";
import { processarChamado } from "./analise";
import { linkProtocolo } from "./acesso";
import { novoRascunho, urlDeEnvio } from "./storage";
import { protocoloAssistencia } from "@/lib/email";

const SITE = process.env.NEXT_PUBLIC_URL || "https://www.vibravert.com.br";

export type ResultadoAbertura =
  | { ok: true; protocolo: string; link: string }
  | { ok: false; erros: Record<string, string> };

const so = (s: string) => s.replace(/\D/g, "");

/** Rótulos gravados junto com cada resposta: o texto que o cliente escolheu. */
const ROTULOS: Record<string, Record<string, string>> = {
  tempo: { ate15: "Até 15 min", "15a30": "15 a 30 min", "30a45": "30 a 45 min", "45a60": "45 min a 1 hora", mais60: "Mais de 1 hora", ns: "Não sei" },
  rede: { "127": "127V (110V)", "220": "220V", "254": "254V", ns: "Não sei" },
  submersa: { sim: "Sim, sempre", nao: "Às vezes ficava fora", ns: "Não sei" },
  distancia: { mais40: "Mais de 40 cm", "20a40": "20 a 40 cm", menos20: "Menos de 20 cm", ns: "Não sei" },
  sustentacao: { corda: "Corda ou cabo de aço", cabo: "Pelo próprio fio elétrico", ns: "Não sei" },
  emenda: { autofusao: "Fita de autofusão + isolante", comum: "Só fita isolante", sem: "Não tem emenda", ns: "Não sei" },
  agua: { limpa: "Limpa", areia: "Com areia ou barro", ns: "Não sei" },
  energia: { nao: "Não", sim: "Sim", ns: "Não sei" },
};

function erros(e: { issues: { path: (string | number)[]; message: string }[] }) {
  const r: Record<string, string> = {};
  for (const i of e.issues) r[i.path.join(".")] ??= i.message;
  return r;
}

/** Cria o chamado com o próximo protocolo; colisão de protocolo tenta de novo. */
async function criar(dados: Omit<Prisma.ChamadoCreateInput, "protocolo">, ano: number) {
  for (let tentativa = 0; tentativa < 5; tentativa++) {
    try {
      return await prisma.$transaction(async (tx) => {
        const protocolo = await proximoProtocolo(tx, ano);
        return tx.chamado.create({ data: { ...dados, protocolo } });
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") continue;
      throw e;
    }
  }
  throw new Error("não foi possível gerar o protocolo");
}

/** URL para subir uma foto direto ao storage privado, antes do envio. */
export async function pedirEnvioDeFoto(rascunho: string | null, espaco: EspacoFoto, tipo: string) {
  if (!ESPACOS_FOTO.includes(espaco)) return { ok: false as const, erro: "Espaço de foto inválido." };
  const id = rascunho && /^[a-f0-9-]{36}$/.test(rascunho) ? rascunho : novoRascunho();
  try {
    const u = await urlDeEnvio(id, espaco, tipo);
    return { ok: true as const, rascunho: id, ...u };
  } catch {
    return { ok: false as const, erro: "Use foto em JPG, PNG, WebP ou HEIC." };
  }
}

export async function abrirChamado(entrada: unknown): Promise<ResultadoAbertura> {
  const tipo = (entrada as { tipo?: string } | null)?.tipo;
  const hoje = hojeSP();
  const ano = Number(hoje.slice(0, 4));

  // ── arrependimento: sem fotos, sem sintoma ─────────────────────────
  if (tipo === "arrependimento") {
    const p = chamadoArrependimento.safeParse(entrada);
    if (!p.success) return { ok: false, erros: erros(p.error) };
    const d = p.data;
    const compra = await confirmarCompra(d.nf, d.documento, d.canal);
    const faixa = calcularFaixa({
      envio: hoje,
      emissao: compra.emissao,
      recebimento: d.recebimento,
      canal: compra.canal,
      canalConfirmado: compra.canalConfirmado,
      usou: d.usou === "sim",
    });
    const decisao = decidir({ faixa, envio: hoje, modelo: null, emissaoExata: null, faltando: [], sinais: [], lista: null, conferirAprovacoes: false });
    const automatico = decisao.acao === "arrependimento";

    const c = await criar(
      {
        status: automatico ? "ARREPENDIMENTO" : "EM_ANALISE",
        faixa: faixa.faixa,
        regrasVersao: REGRAS_VERSION,
        pendenciaRegra: faixa.pendencia ?? null,
        ...camposComuns(d, compra, hoje),
        ocorrido: "Pedido de arrependimento (sem uso).",
        decisoes: {
          create: {
            autor: "codigo",
            sugestao: decisao.sugestao,
            decisaoFinal: automatico ? "arrependimento" : null,
            detalhes: {
              regras: REGRAS_VERSION,
              acao: decisao.acao,
              motivos: automatico ? decisao.motivos : ["Pedido de arrependimento fora da regra automática", ...decisao.motivos],
              faixa: { ...faixa },
            },
          },
        },
      },
      ano,
    );
    after(() => protocoloAssistencia(c.email, c.nome, c.protocolo, `${SITE}${linkProtocolo(c.protocolo)}`).then(() => {}, () => {}));
    return { ok: true, protocolo: c.protocolo, link: linkProtocolo(c.protocolo) };
  }

  // ── garantia ────────────────────────────────────────────────────────
  const p = chamadoGarantia.safeParse(entrada);
  if (!p.success) return { ok: false, erros: erros(p.error) };
  const d = p.data;
  const compra = await confirmarCompra(d.nf, d.documento, d.canal);
  const inst = d.instalacao;
  const respostas: Respostas = {
    tensaoBomba: d.tensao,
    tempo: inst.tempo,
    tempoMinutos: inst.tempo === "mais60" ? (inst.tempoMinutos ?? null) : null,
    rede: inst.rede,
    submersa: inst.submersa,
    distancia: inst.distancia,
    sustentacao: inst.sustentacao,
    emenda: inst.emenda,
    agua: inst.agua,
    energia: inst.energia,
  };

  const linhas = Object.entries(ROTULOS).map(([pergunta, rotulos], ordem) => {
    const valor = String(respostas[pergunta as keyof Respostas]);
    return { pergunta, valor, texto: rotulos[valor] ?? valor, ordem };
  });
  if (respostas.tempoMinutos !== null)
    linhas.push({ pergunta: "tempoMinutos", valor: String(respostas.tempoMinutos), texto: `cerca de ${respostas.tempoMinutos} min`, ordem: 99 });

  const sinais = triagem(respostas);
  const fotos = Object.entries(d.fotos) as [EspacoFoto, string][];

  const c = await criar(
    {
      status: "ANALISANDO",
      faixa: "indefinida",
      regrasVersao: REGRAS_VERSION,
      ...camposComuns(d, compra, hoje),
      modelo: d.modelo,
      tensao: d.tensao,
      serie: d.serie || null,
      ocorrido: d.ocorrido,
      respostas: { create: linhas },
      // Até o pipeline arquivar, a foto aponta para o rascunho.
      fotos: { create: fotos.map(([espaco, caminho]) => ({ espaco, caminho, caminhoReduzido: caminho })) },
      avaliacoes: {
        create: sinais.map((s) => ({ categoria: "sinal", codigo: s.codigo, resultado: s.nivel, texto: s.texto, origem: "codigo" })),
      },
    },
    ano,
  );

  // O cliente recebe o protocolo agora; a análise roda em seguida.
  after(async () => {
    await protocoloAssistencia(c.email, c.nome, c.protocolo, `${SITE}${linkProtocolo(c.protocolo)}`).catch(() => null);
    try {
      await processarChamado(c.id);
    } catch (e) {
      // Falha inesperada: o chamado vai para a fila com o motivo, nunca fica preso.
      await prisma.$transaction([
        prisma.decisao.create({
          data: { chamadoId: c.id, autor: "codigo", sugestao: "revisar", nota: `Falha no processamento: ${e instanceof Error ? e.message : String(e)}`.slice(0, 1000) },
        }),
        prisma.chamado.update({ where: { id: c.id }, data: { status: "EM_ANALISE" } }),
      ]);
    }
  });

  return { ok: true, protocolo: c.protocolo, link: linkProtocolo(c.protocolo) };
}

function camposComuns(
  d: { nome: string; documento: string; telefone: string; email: string; nf: string; recebimento: string; usou: "sim" | "nao" },
  compra: Awaited<ReturnType<typeof confirmarCompra>>,
  hoje: string,
) {
  return {
    nome: d.nome.trim(),
    documento: so(d.documento),
    telefone: so(d.telefone),
    email: d.email.trim().toLowerCase(),
    canal: compra.canal,
    canalConfirmado: compra.canalConfirmado,
    usou: d.usou === "sim",
    recebimento: new Date(`${d.recebimento}T00:00:00Z`),
    nfTexto: d.nf.trim(),
    nfNumero: compra.nf.numero,
    nfChave: compra.nf.chave,
    nfSerie: compra.nf.serie,
    nfCnpjEmitente: compra.nf.cnpjEmitente,
    emissao: compra.emissao?.tipo === "exata" ? new Date(`${compra.emissao.data}T00:00:00Z`) : null,
    emissaoFonte: compra.emissaoFonte,
    blingPedido: compra.blingPedido,
    lgpdEm: new Date(),
    enviadoEm: new Date(`${hoje}T00:00:00Z`),
  };
}
