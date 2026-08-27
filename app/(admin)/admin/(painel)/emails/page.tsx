import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { configurado, enviarPendentes } from "@/lib/email";
import { registrarAcao } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";
export const metadata = { title: "E-mails" };

/**
 * O que a loja mandou, e o que ficou esperando.
 *
 * Enquanto não há chave de envio, tudo o que a loja quis mandar fica guardado
 * em vez de virar uma linha de log. Assim, no dia em que o Resend entrar, dá
 * para disparar a fila inteira · em vez de descobrir semanas depois que três
 * clientes nunca souberam que o pedido tinha sido despachado.
 */
async function despachar() {
  "use server";
  const r = await enviarPendentes(50);
  await registrarAcao(
    "disparou a fila de e-mails",
    r.ok ? `${r.enviados} enviados` : r.motivo,
  );
  revalidatePath("/admin/emails");
}

const CORES: Record<string, string> = {
  ENVIADO: "text-bom",
  PENDENTE: "text-atencao",
  FALHOU: "text-critico",
};

export default async function Emails() {
  const [fila, contagem] = await Promise.all([
    prisma.email.findMany({ orderBy: { criadoEm: "desc" }, take: 60 }),
    prisma.email.groupBy({ by: ["situacao"], _count: true }),
  ]);

  const n = (s: string) => contagem.find((c) => c.situacao === s)?._count ?? 0;
  const pendentes = n("PENDENTE") + n("FALHOU");

  return (
    <div className="p-6">
      <h1 className="text-xl font-extrabold tracking-tight">E-mails</h1>
      <p className="mt-1.5 max-w-2xl text-[13.5px] leading-relaxed text-tinta-2">
        Confirmação de pedido, aviso de pagamento, aviso de envio e lembrete de carrinho parado.
        Tudo o que a loja tenta mandar fica registrado aqui.
      </p>

      {!configurado ? (
        <p className="mt-5 rounded-caixa border-l-[3px] border-atencao bg-atencao/[0.07] px-4 py-3.5 text-[13.5px] leading-relaxed text-tinta-2">
          <b className="text-atencao">O envio ainda não está ligado.</b> Falta a chave do Resend e o
          remetente, e os dois dependem do domínio final estar no ar · o Resend precisa provar que
          o domínio é nosso antes de deixar enviar em nome dele.
          <br />
          <span className="mt-2 block">
            Nada se perde enquanto isso: <b className="num">{pendentes}</b>{" "}
            {pendentes === 1 ? "e-mail está guardado" : "e-mails estão guardados"} esperando. No dia
            em que a chave entrar, sai tudo de uma vez.
          </span>
          <span className="mt-2 block text-[12.5px] text-mudo">
            Atenção ao ligar: o e-mail da Vibra Vert está na Locaweb, então os registros de SPF e
            DKIM do Resend entram <b>ao lado</b> dos que já existem. Trocar em vez de acrescentar
            derruba o e-mail da empresa.
          </span>
        </p>
      ) : (
        pendentes > 0 && (
          <form action={despachar} className="mt-5">
            <button className="rounded-lg bg-marca px-4 py-2.5 text-[13px] font-extrabold text-white">
              Enviar os {pendentes} pendentes
            </button>
          </form>
        )
      )}

      <dl className="mt-5 grid gap-3 sm:grid-cols-3">
        {[
          ["Enviados", n("ENVIADO"), "text-bom"],
          ["Esperando", n("PENDENTE"), "text-atencao"],
          ["Falharam", n("FALHOU"), "text-critico"],
        ].map(([r, v, cor]) => (
          <div key={String(r)} className="rounded-caixa border border-linha bg-superficie p-4">
            <dt className="text-[11.5px] font-bold uppercase tracking-wide text-mudo">{r}</dt>
            <dd className={`num mt-1 text-2xl font-extrabold ${cor}`}>{v}</dd>
          </div>
        ))}
      </dl>

      {fila.length === 0 ? (
        <p className="mt-6 rounded-caixa border border-dashed border-linha-2 px-4 py-8 text-center text-[13.5px] text-mudo">
          Nenhum e-mail ainda. O primeiro sai quando entrar o próximo pedido.
        </p>
      ) : (
        <ul className="mt-5 divide-y divide-linha overflow-hidden rounded-caixa border border-linha bg-superficie">
          {fila.map((e) => (
            <li key={e.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-4 py-3">
              <span className={`text-[11px] font-extrabold uppercase ${CORES[e.situacao] ?? ""}`}>
                {e.situacao}
              </span>
              <span className="text-[13.5px] font-bold">{e.assunto}</span>
              <span className="num text-[12.5px] text-mudo">{e.para}</span>
              <span className="num ml-auto text-[12px] text-tenue">
                {e.criadoEm.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
              </span>
              {e.erro && (
                <span className="w-full text-[12px] leading-snug text-critico">{e.erro}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
