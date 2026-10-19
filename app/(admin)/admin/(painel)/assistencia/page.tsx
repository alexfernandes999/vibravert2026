import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { SeloStatus } from "@/components/assistencia/selo-status";
import { ROTULO_SUGESTAO, horasRestantes, prazoBancada, prazoSLA } from "@/lib/assistencia/portal";

export const dynamic = "force-dynamic";
export const metadata = { title: "Assistência · Painel do dia" };

export default async function PainelAssistencia() {
  const inicioMes = new Date();
  inicioMes.setUTCDate(1);
  inicioMes.setUTCHours(0, 0, 0, 0);
  const hoje = new Date(Date.now() - 24 * 3600_000);

  const [porStatus, fila, bancada, custo, abertosHoje, atividade] = await Promise.all([
    prisma.chamado.groupBy({ by: ["status"], _count: true }),
    prisma.chamado.findMany({
      where: { status: "EM_ANALISE" },
      orderBy: { atualizadoEm: "asc" },
      take: 20,
      include: { decisoes: { orderBy: { criadoEm: "desc" }, take: 1 } },
    }),
    prisma.bancada.findMany({ where: { assinadoEm: null }, include: { chamado: true }, orderBy: { recebidoEm: "asc" } }),
    prisma.chamadaIA.aggregate({ where: { criadoEm: { gte: inicioMes } }, _sum: { custoUsd: true }, _count: true }),
    prisma.chamado.count({ where: { criadoEm: { gte: hoje } } }),
    prisma.decisao.findMany({ where: { autor: { in: ["codigo", "claude"] } }, orderBy: { criadoEm: "desc" }, take: 8, include: { chamado: { select: { protocolo: true } } } }),
  ]);
  const n = (s: string) => porStatus.find((x) => x.status === s)?._count ?? 0;

  const urgentes = [
    ...fila.map((c) => ({ p: c.protocolo, nome: c.nome, h: horasRestantes(prazoSLA(c.atualizadoEm)), o: `Fila · sugestão ${ROTULO_SUGESTAO[c.decisoes[0]?.sugestao ?? "revisar"] ?? "revisar"}`, href: `/admin/assistencia/chamados/${c.protocolo}` })),
    ...bancada.map((b) => ({ p: b.chamado.protocolo, nome: b.chamado.nome, h: horasRestantes(prazoBancada(b.recebidoEm)), o: "Bancada · laudo em 48 h", href: `/admin/assistencia/bancada/${b.chamado.protocolo}` })),
  ].sort((a, b) => a.h - b.h);

  const kpi = (r: string, v: number | string, d?: string) => (
    <div className="rounded-caixa border border-linha bg-superficie p-4">
      <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-mudo">{r}</p>
      <p className="num mt-1 text-2xl font-extrabold">{v}</p>
      {d && <p className="text-[12px] text-mudo">{d}</p>}
    </div>
  );

  return (
    <div className="p-6">
      <h1 className="text-xl font-extrabold tracking-tight">Assistência · Painel do dia</h1>
      <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {kpi("Abertos 24 h", abertosHoje)}
        {kpi("Na fila", n("EM_ANALISE"), "SLA 24 h úteis")}
        {kpi("Aguardando envio", n("AGUARDANDO_ENVIO") + n("A_CAMINHO"))}
        {kpi("Na bancada", n("NA_BANCADA"), "laudo em 48 h")}
        {kpi("Pendentes de foto", n("PENDENTE_INFORMACAO"))}
        {kpi("IA no mês", `US$ ${Number(custo._sum.custoUsd ?? 0).toFixed(2)}`, `${custo._count} chamadas`)}
      </div>

      <section className="mt-6">
        <h2 className="text-[15px] font-extrabold">Precisa de você agora</h2>
        {urgentes.length === 0 ? (
          <p className="mt-2 text-[13.5px] text-mudo">Nada pendente. A fila está vazia.</p>
        ) : (
          <ul className="mt-2 divide-y divide-linha rounded-caixa border border-linha bg-superficie">
            {urgentes.map((u) => (
              <li key={u.href}>
                <Link href={u.href} className="flex flex-wrap items-center gap-3 px-4 py-2.5 hover:bg-fundo">
                  <span className="num font-mono text-[13px] font-bold">{u.p}</span>
                  <span className="text-[13px]">{u.nome}</span>
                  <span className="text-[12.5px] text-mudo">{u.o}</span>
                  <span className={`num ml-auto text-[12.5px] font-bold ${u.h < 0 ? "text-critico" : u.h < 6 ? "text-atencao" : "text-mudo"}`}>
                    {u.h < 0 ? `vencido há ${-u.h} h` : `${u.h} h`}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-6">
        <h2 className="text-[15px] font-extrabold">Última atividade automática</h2>
        <ul className="mt-2 space-y-1 text-[13px]">
          {atividade.map((d) => (
            <li key={d.id} className="flex gap-2">
              <span className="num text-mudo">{d.criadoEm.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}</span>
              <span className="font-semibold">{d.autor === "claude" ? "Claude" : "Motor"}</span>
              <Link href={`/admin/assistencia/chamados/${d.chamado.protocolo}`} className="num font-mono text-marca underline">{d.chamado.protocolo}</Link>
              <span>{ROTULO_SUGESTAO[d.decisaoFinal ?? d.sugestao ?? ""] ?? d.sugestao}{d.decisaoFinal ? " · liberado" : " · sugestão"}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[12px] text-mudo">Negativas e recusas nunca saem sem uma pessoa: o banco recusa.</p>
      </section>

      <p className="mt-6 text-[13px]"><span className="font-bold">Status:</span> {porStatus.map((s) => <span key={s.status} className="mr-3"><SeloStatus s={s.status} /> {s._count}</span>)}</p>
    </div>
  );
}
