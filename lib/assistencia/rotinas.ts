import { prisma } from "@/lib/prisma";

/**
 * Rotina diária da assistência (roda no agendamento da Vercel).
 *
 * Pendência de foto sem resposta por 15 dias encerra o chamado, com o motivo
 * registrado no histórico. Idempotente: só pega quem ainda está pendente.
 */
export async function rotinaAssistencia() {
  const limite = new Date(Date.now() - 15 * 24 * 3600_000);
  const vencidos = await prisma.chamado.findMany({
    where: { status: "PENDENTE_INFORMACAO", atualizadoEm: { lt: limite } },
    select: { id: true },
  });
  for (const c of vencidos) {
    await prisma.$transaction([
      prisma.decisao.create({ data: { chamadoId: c.id, autor: "codigo", decisaoFinal: "encerrado", nota: "Encerrado: 15 dias sem as fotos ou dados pedidos." } }),
      prisma.chamado.update({ where: { id: c.id }, data: { status: "ENCERRADO" } }),
    ]);
  }
  return { encerrados: vencidos.length };
}
