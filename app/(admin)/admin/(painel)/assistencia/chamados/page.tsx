import Link from "next/link";
import type { Prisma, StatusChamado } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { SeloStatus } from "@/components/assistencia/selo-status";
import { ROTULO_STATUS } from "@/lib/assistencia/portal";
import { ROTULO_FAIXA } from "@/lib/assistencia/laudo";
import type { Faixa } from "@/lib/regras/tipos";

export const dynamic = "force-dynamic";
export const metadata = { title: "Assistência · Chamados" };

export default async function Chamados({ searchParams }: { searchParams: Promise<{ q?: string; s?: string }> }) {
  const { q = "", s = "" } = await searchParams;
  const so = q.replace(/\D/g, "");
  const where: Prisma.ChamadoWhereInput = {
    ...(s && s in ROTULO_STATUS ? { status: s as StatusChamado } : {}),
    ...(q
      ? {
          OR: [
            { protocolo: { contains: q.toUpperCase() } },
            { nome: { contains: q, mode: "insensitive" } },
            ...(so.length >= 3 ? [{ documento: { contains: so } }, { nfTexto: { contains: so } }] : []),
            { serie: { contains: q } },
          ],
        }
      : {}),
  };
  const chamados = await prisma.chamado.findMany({ where, orderBy: { criadoEm: "desc" }, take: 100 });

  return (
    <div className="p-6">
      <h1 className="text-xl font-extrabold tracking-tight">Chamados</h1>
      <form className="mt-3 flex flex-wrap gap-2">
        <input name="q" defaultValue={q} placeholder="Protocolo, nome, CPF, NF ou série" className="w-80 rounded-lg border border-linha-2 bg-superficie px-3 py-2 text-[13.5px]" />
        <select name="s" defaultValue={s} className="rounded-lg border border-linha-2 bg-superficie px-3 py-2 text-[13.5px]">
          <option value="">Todos os status</option>
          {Object.entries(ROTULO_STATUS).map(([k, v]) => <option key={k} value={k}>{v.r}</option>)}
        </select>
        <button className="rounded-lg bg-marca px-4 py-2 text-[13px] font-bold text-white">Buscar</button>
      </form>
      <ul className="mt-4 divide-y divide-linha rounded-caixa border border-linha bg-superficie">
        {chamados.map((c) => (
          <li key={c.id}>
            <Link href={`/admin/assistencia/chamados/${c.protocolo}`} className="flex flex-wrap items-center gap-3 px-4 py-2.5 text-[13px] hover:bg-fundo">
              <span className="num font-mono font-bold">{c.protocolo}</span>
              <SeloStatus s={c.status} />
              <span>{c.nome}</span>
              <span className="text-mudo">{ROTULO_FAIXA[c.faixa as Faixa] ?? c.faixa}</span>
              <span className="num ml-auto text-mudo">{c.criadoEm.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}</span>
            </Link>
          </li>
        ))}
        {chamados.length === 0 && <li className="px-4 py-4 text-[13px] text-mudo">Nenhum chamado.</li>}
      </ul>
    </div>
  );
}
