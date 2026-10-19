import type { Prisma } from "@prisma/client";

export const RE_PROTOCOLO = /^AT-\d{4}-\d{6}$/;

/**
 * Próximo protocolo do ano: AT-AAAA-NNNNNN.
 *
 * Sequencial e sem buraco visível para o cliente. Corre dentro da transação
 * que cria o chamado; se dois chamados chegarem no mesmo instante, um deles
 * bate no índice único e a criação tenta de novo (ver abrir.ts).
 */
export async function proximoProtocolo(tx: Prisma.TransactionClient, ano: number): Promise<string> {
  const prefixo = `AT-${ano}-`;
  const ultimo = await tx.chamado.findFirst({
    where: { protocolo: { startsWith: prefixo } },
    orderBy: { protocolo: "desc" },
    select: { protocolo: true },
  });
  const n = ultimo ? Number(ultimo.protocolo.slice(prefixo.length)) + 1 : 1;
  return `${prefixo}${String(n).padStart(6, "0")}`;
}
