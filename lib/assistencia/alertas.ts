import { prisma } from "@/lib/prisma";
import { alertaFilaAssistencia } from "@/lib/email";
import { NOME_MODELO, type Modelo } from "@/lib/regras/tipos";

/**
 * Quem recebe o aviso da fila de decisão. ASSISTENCIA_ALERTA (e-mails separados
 * por vírgula) manda quando existe; senão, quem opera a loja e a bancada:
 * dono, operador e técnico ativos. Quem cuida do sistema não entra · não decide garantia.
 */
async function destinatarios(): Promise<string[]> {
  const env = (process.env.ASSISTENCIA_ALERTA ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  if (env.length) return env;
  const u = await prisma.usuario.findMany({
    where: { ativo: true, papel: { in: ["MASTER", "OPERADOR", "TECNICO"] } },
    select: { email: true },
  });
  return u.map((x) => x.email);
}

const linha = (c: { protocolo: string; nome: string; modelo: string | null; criadoEm: Date }) => ({
  protocolo: c.protocolo,
  nome: c.nome,
  modelo: c.modelo ? (NOME_MODELO[c.modelo as Modelo] ?? c.modelo) : null,
  horas: Math.max(0, Math.floor((Date.now() - c.criadoEm.getTime()) / 3600_000)),
});

/** Chamado acabou de entrar na fila. Nunca derruba quem chamou. */
export async function avisarNovoNaFila(chamadoId: string) {
  try {
    const c = await prisma.chamado.findUnique({
      where: { id: chamadoId },
      select: { protocolo: true, nome: true, modelo: true, criadoEm: true, status: true },
    });
    if (!c || c.status !== "EM_ANALISE") return;
    for (const para of await destinatarios()) await alertaFilaAssistencia(para, "novo", [linha(c)]);
  } catch (e) {
    console.error("[assistencia] aviso da fila falhou:", e);
  }
}

/** Resumo diário: tudo o que espera decisão. Vazio, não manda nada. */
export async function resumoDaFila() {
  const fila = await prisma.chamado.findMany({
    where: { status: "EM_ANALISE" },
    orderBy: { criadoEm: "asc" },
    select: { protocolo: true, nome: true, modelo: true, criadoEm: true },
  });
  if (!fila.length) return { avisados: 0, chamados: 0 };
  const para = await destinatarios();
  for (const p of para) await alertaFilaAssistencia(p, "resumo", fila.map(linha));
  return { avisados: para.length, chamados: fila.length };
}
