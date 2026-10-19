import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { usuarioAtual } from "@/lib/admin-auth";
import { FormAssinar, FormBancada } from "@/components/assistencia/portal-forms";
import { horasRestantes, prazoBancada } from "@/lib/assistencia/portal";
import { NOME_MODELO, type Modelo } from "@/lib/regras/tipos";

export const dynamic = "force-dynamic";
export const metadata = { title: "Assistência · Registro de bancada" };

export default async function RegistroBancada({ params }: { params: Promise<{ protocolo: string }> }) {
  const { protocolo } = await params;
  const [eu, c] = await Promise.all([
    usuarioAtual(),
    prisma.chamado.findUnique({
      where: { protocolo },
      include: { bancada: true, decisoes: { where: { autor: "codigo" }, orderBy: { criadoEm: "desc" }, take: 1 } },
    }),
  ]);
  if (!c?.bancada) notFound();
  const b = c.bancada;
  const pontos = ((c.decisoes[0]?.detalhes as { pontosAVerificar?: { texto: string }[] } | null)?.pontosAVerificar ?? []).map((p) => p.texto);
  const h = horasRestantes(prazoBancada(b.recebidoEm));
  const n = (v: unknown) => (v === null || v === undefined ? "" : String(v));

  return (
    <div className="p-6">
      <Link href="/admin/assistencia/bancada" className="text-[12.5px] font-bold text-marca">← Bancada</Link>
      <div className="mt-1 flex flex-wrap items-center gap-3">
        <h1 className="num font-mono text-xl font-extrabold">{c.protocolo}</h1>
        <span className="text-[13px]">{c.modelo ? `${NOME_MODELO[c.modelo as Modelo]} · ${c.tensao}V` : ""} {c.serie ? `· série ${c.serie}` : ""}</span>
        <span className={`num ml-auto text-[13px] font-bold ${h < 0 ? "text-critico" : ""}`}>{b.assinadoEm ? "assinado" : h < 0 ? `prazo vencido há ${-h} h` : `${h} h para o laudo`}</span>
      </div>

      {pontos.length > 0 && (
        <section className="mt-4 rounded-caixa border border-atencao/40 bg-atencao/5 p-4">
          <h2 className="text-[13px] font-extrabold">Pontos a verificar (da análise preliminar)</h2>
          <ul className="mt-1 list-disc pl-5 text-[13px]">{pontos.map((p) => <li key={p}>{p}</li>)}</ul>
        </section>
      )}

      {b.assinadoEm ? (
        <p className="mt-4 rounded-caixa border border-linha bg-superficie p-4 text-[13.5px]">
          Laudo assinado em {b.assinadoEm.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}. O registro não muda mais.
        </p>
      ) : (
        <>
          <section className="mt-4 rounded-caixa border border-linha bg-superficie p-4">
            <FormBancada
              protocolo={c.protocolo}
              inicial={{
                checklist: (b.checklist as Record<string, string> | null) ?? {},
                resistenciaOhm: n(b.resistenciaOhm),
                isolacaoMOhm: n(b.isolacaoMOhm),
                correnteA: n(b.correnteA),
                pecas: ((b.pecas as string[] | null) ?? []).join("\n"),
                observacao: b.observacao ?? "",
                conclusao: b.conclusaoFinal ?? "",
              }}
            />
          </section>
          <section className="mt-4 rounded-caixa border border-marca bg-superficie p-4">
            <h2 className="mb-2 text-[13px] font-extrabold uppercase tracking-wide text-mudo">Assinatura</h2>
            <p className="mb-2 text-[12.5px] text-mudo">
              Ao assinar, a Claude redige o laudo a partir do registro salvo, e ele é liberado ao cliente sem páginas anexas. A mensagem ao
              cliente não descreve o defeito.
            </p>
            <FormAssinar protocolo={c.protocolo} tecnico={eu?.papel === "TECNICO"} />
          </section>
        </>
      )}
    </div>
  );
}
