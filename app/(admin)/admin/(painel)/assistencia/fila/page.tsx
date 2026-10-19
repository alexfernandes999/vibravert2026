import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ROTULO_FAIXA } from "@/lib/assistencia/laudo";
import { ROTULO_SUGESTAO, horasRestantes, prazoSLA } from "@/lib/assistencia/portal";
import type { Faixa } from "@/lib/regras/tipos";

export const dynamic = "force-dynamic";
export const metadata = { title: "Assistência · Fila de decisão" };

/** Só o que precisa de uma pessoa: negativas, recusas e revisões. */
export default async function Fila() {
  const fila = await prisma.chamado.findMany({
    where: { status: "EM_ANALISE" },
    orderBy: { atualizadoEm: "asc" },
    include: { decisoes: { orderBy: { criadoEm: "desc" }, take: 1 } },
  });
  return (
    <div className="p-6">
      <h1 className="text-xl font-extrabold tracking-tight">Fila de decisão</h1>
      <p className="mt-1 text-[13px] text-mudo">Ordenada pelo prazo. SLA de 24 h úteis.</p>
      {fila.length === 0 ? (
        <p className="mt-5 rounded-caixa border border-linha bg-superficie p-5 text-[13.5px] text-mudo">Fila vazia.</p>
      ) : (
        <table className="mt-4 w-full border-collapse overflow-hidden rounded-caixa border border-linha bg-superficie text-[13px]">
          <thead className="bg-superficie-2 text-left text-[11.5px] uppercase tracking-wide text-mudo">
            <tr><th className="p-2.5">Protocolo</th><th className="p-2.5">Cliente</th><th className="p-2.5">Faixa</th><th className="p-2.5">Sugestão</th><th className="p-2.5">Motivo</th><th className="p-2.5 text-right">SLA</th></tr>
          </thead>
          <tbody>
            {fila.map((c) => {
              const d = c.decisoes[0];
              const motivos = ((d?.detalhes as { motivos?: string[] } | null)?.motivos ?? []).join(" · ") || d?.nota || "";
              const h = horasRestantes(prazoSLA(c.atualizadoEm));
              const sug = d?.sugestao ?? "revisar";
              return (
                <tr key={c.id} className="border-t border-linha align-top hover:bg-fundo">
                  <td className="p-2.5"><Link href={`/admin/assistencia/chamados/${c.protocolo}`} className="num font-mono font-bold text-marca underline">{c.protocolo}</Link></td>
                  <td className="p-2.5">{c.nome}</td>
                  <td className="p-2.5">{ROTULO_FAIXA[c.faixa as Faixa] ?? c.faixa}</td>
                  <td className="p-2.5"><span className={`rounded-full px-2 py-0.5 text-[11px] font-extrabold ${sug === "negativa" || sug === "recusa" ? "bg-critico/10 text-critico" : "bg-marca-suave text-marca"}`}>{ROTULO_SUGESTAO[sug] ?? sug}</span></td>
                  <td className="max-w-md p-2.5 text-tinta-2">{motivos}</td>
                  <td className={`num p-2.5 text-right font-bold ${h < 0 ? "text-critico" : h < 6 ? "text-atencao" : ""}`}>{h < 0 ? `vencido ${-h} h` : `${h} h`}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
