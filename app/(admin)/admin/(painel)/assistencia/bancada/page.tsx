import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { FormReceber } from "@/components/assistencia/portal-forms";
import { horasRestantes, prazoBancada } from "@/lib/assistencia/portal";

export const dynamic = "force-dynamic";
export const metadata = { title: "Assistência · Bancada" };

export default async function Bancada() {
  const abertas = await prisma.bancada.findMany({ where: { assinadoEm: null }, include: { chamado: true }, orderBy: { recebidoEm: "asc" } });
  return (
    <div className="p-6">
      <h1 className="text-xl font-extrabold tracking-tight">Bancada</h1>
      <section className="mt-4 rounded-caixa border border-linha bg-superficie p-4">
        <h2 className="mb-2 text-[14px] font-extrabold">Receber bomba</h2>
        <FormReceber />
        <p className="mt-2 text-[12px] text-mudo">
          Ordem: etiqueta da logística reversa → protocolo na caixa → rastreio → nome, CPF, NF ou nº de série. Sem chamado encontrado,
          separe a bomba como recebimento sem identificação.
        </p>
      </section>
      <section className="mt-5">
        <h2 className="text-[14px] font-extrabold">Na bancada · laudo em até 48 h</h2>
        <ul className="mt-2 divide-y divide-linha rounded-caixa border border-linha bg-superficie">
          {abertas.map((b) => {
            const h = horasRestantes(prazoBancada(b.recebidoEm));
            return (
              <li key={b.id}>
                <Link href={`/admin/assistencia/bancada/${b.chamado.protocolo}`} className="flex flex-wrap items-center gap-3 px-4 py-2.5 text-[13px] hover:bg-fundo">
                  <span className="num font-mono font-bold">{b.chamado.protocolo}</span>
                  <span>{b.chamado.nome}</span>
                  <span className="text-mudo">identificada por {b.identificadoPor.replace("_", " ")}</span>
                  <span className={`num ml-auto font-bold ${h < 0 ? "text-critico" : h < 12 ? "text-atencao" : "text-mudo"}`}>{h < 0 ? `vencido ${-h} h` : `${h} h`}</span>
                </Link>
              </li>
            );
          })}
          {abertas.length === 0 && <li className="px-4 py-4 text-[13px] text-mudo">Nenhuma bomba na bancada.</li>}
        </ul>
      </section>
    </div>
  );
}
