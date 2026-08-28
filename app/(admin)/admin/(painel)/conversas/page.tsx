import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata = { title: "Conversas" };

/**
 * As conversas que terminaram no vendedor.
 *
 * Existe por dois motivos, e o segundo vale mais com o tempo. O primeiro é a
 * venda: se a pessoa sumir do WhatsApp, o que ela contou continua aqui.
 *
 * O segundo é o roteiro da Vibrinha. Ler o que as pessoas perguntam e onde
 * elas desistem é o que diz qual resposta falta · e isso não se descobre
 * imaginando, se descobre lendo.
 */
export default async function Conversas() {
  const [conversas, total, porOrigem] = await Promise.all([
    prisma.conversa.findMany({ orderBy: { criadoEm: "desc" }, take: 40 }),
    prisma.conversa.count(),
    prisma.conversa.groupBy({ by: ["origem"], _count: true }),
  ]);

  return (
    <div className="p-6">
      <h1 className="text-xl font-extrabold tracking-tight">Conversas com a Vibrinha</h1>
      <p className="mt-1.5 max-w-2xl text-[13.5px] leading-relaxed text-tinta-2">
        Só as que terminaram no WhatsApp de vendas. O vendedor já recebeu tudo isto na conversa ·
        aqui fica o registro, para quando a pessoa sumir e para saber o que anda sendo perguntado.
      </p>

      <dl className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-caixa border border-linha bg-superficie p-4">
          <dt className="text-[11.5px] font-bold uppercase tracking-wide text-mudo">Total</dt>
          <dd className="num mt-1 text-2xl font-extrabold text-marca">{total}</dd>
        </div>
        {porOrigem.slice(0, 2).map((o) => (
          <div key={o.origem ?? "?"} className="rounded-caixa border border-linha bg-superficie p-4">
            <dt className="text-[11.5px] font-bold uppercase tracking-wide text-mudo">
              saíram pelo {o.origem ?? "—"}
            </dt>
            <dd className="num mt-1 text-2xl font-extrabold">{o._count}</dd>
          </div>
        ))}
      </dl>

      {conversas.length === 0 ? (
        <p className="mt-6 rounded-caixa border border-dashed border-linha-2 px-4 py-10 text-center text-[13.5px] text-mudo">
          Nenhuma ainda. A primeira aparece quando alguém pedir para falar com um vendedor.
        </p>
      ) : (
        <ul className="mt-5 grid gap-3">
          {conversas.map((c) => (
            <li key={c.id} className="rounded-caixa border border-linha bg-superficie p-4">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="text-[14px] font-extrabold">{c.nome || "sem nome"}</span>
                {c.origem && (
                  <span className="rounded bg-marca-suave px-1.5 py-0.5 text-[11px] font-bold text-marca">
                    {c.origem}
                  </span>
                )}
                <span className="num ml-auto text-[12px] text-tenue">
                  {c.criadoEm.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                </span>
              </div>

              {c.apurado && (
                <p className="num mt-2 rounded-lg bg-fundo px-3 py-2 text-[12.5px] leading-relaxed text-tinta-2">
                  <b className="text-tinta">Respondeu:</b> {c.apurado}
                </p>
              )}

              <details className="mt-2">
                <summary className="cursor-pointer list-none text-[12.5px] font-bold text-marca">
                  Ver a conversa
                </summary>
                <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap rounded-lg border border-linha bg-fundo px-3 py-2.5 text-[12.5px] leading-relaxed text-tinta-2">
{c.dialogo}
                </pre>
              </details>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
