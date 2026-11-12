import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { podeGerirEquipe, registrarAcao } from "@/lib/admin-auth";
import { conexao } from "@/lib/bling";
import { sincronizar, situacao } from "@/lib/erp/espelho";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function lerAgora() {
  "use server";
  if (!(await podeGerirEquipe())) return;
  await sincronizar({ orcamentoMs: 45_000 });
  await registrarAcao("leu o Bling (espelho)");
  revalidatePath("/admin/erp");
}

const quando = (d: Date | null | undefined) =>
  d
    ? d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" })
    : "—";

/**
 * Espelho do Bling · ERP fase 1.
 *
 * O ERP só lê. Esta tela responde a uma pergunta: o que já foi copiado, de
 * quando é cada número, e onde a leitura travou. Carimbo em tudo (Lei 9).
 */
export default async function Espelho() {
  if (!(await podeGerirEquipe())) redirect("/admin");
  const [fontes, bling] = await Promise.all([situacao(), conexao()]);
  const caido = bling.ligado && bling.falhaEm;

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <h1 className="text-[26px] font-extrabold tracking-tight">Dados do Bling (ERP)</h1>
      <p className="mt-1.5 max-w-2xl text-[14.5px] text-tinta-2">
        Fase 1 do ERP: uma cópia do Bling, atualizada sozinha. Só lê · nada daqui muda o Bling.
        Sai desta fase quando os números baterem com o Bling por duas semanas.
      </p>

      {!bling.ligado || caido ? (
        <p className="mt-6 rounded-lg border-l-[3px] border-critico bg-critico/[0.06] px-4 py-3 text-[13.5px]">
          <b className="text-critico">Sem conexão com o Bling.</b> A leitura volta sozinha depois de
          reautorizar em <a href="/admin/integracoes" className="font-bold text-marca underline">Integrações</a>.
        </p>
      ) : null}

      <div className="mt-7 overflow-x-auto rounded-caixa border border-linha bg-superficie">
        <table className="w-full text-[13.5px]">
          <thead>
            <tr className="border-b border-linha text-left text-[12px] text-mudo">
              <th className="px-4 py-2.5 font-medium">Fonte</th>
              <th className="px-4 py-2.5 text-right font-medium">Registros</th>
              <th className="px-4 py-2.5 font-medium">Última leitura completa</th>
              <th className="px-4 py-2.5 font-medium">Agora</th>
            </tr>
          </thead>
          <tbody>
            {fontes.map((f) => (
              <tr key={f.entidade} className="border-b border-linha last:border-0 align-top">
                <td className="px-4 py-3">
                  <b>{f.rotulo}</b>
                  <div className="text-[12px] text-mudo">
                    {f.intervaloMin === 0 ? "a cada rodada" : f.intervaloMin < 60 ? `a cada ${f.intervaloMin} min` : f.intervaloMin < 1440 ? `a cada ${f.intervaloMin / 60} h` : "uma vez por dia"}
                  </div>
                </td>
                <td className="num px-4 py-3 text-right">{(f.estado?.registros ?? 0).toLocaleString("pt-BR")}</td>
                <td className="px-4 py-3">{quando(f.estado?.completaEm)}</td>
                <td className="px-4 py-3 text-[12.5px]">
                  {f.estado?.erro ? (
                    <span className="text-critico">Erro em {quando(f.estado.erroEm)}: {f.estado.erro.slice(0, 160)}</span>
                  ) : f.estado?.varreduraDe ? (
                    <span className="text-atencao">Lendo · página {f.estado.pagina}</span>
                  ) : f.pendentes ? (
                    <span className="text-atencao">{f.pendentes.toLocaleString("pt-BR")} sem detalhe ainda</span>
                  ) : f.estado?.completaEm ? (
                    <span className="text-bom">Em dia</span>
                  ) : (
                    <span className="text-mudo">Ainda não lido</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <form action={lerAgora} className="mt-4">
        <button className="rounded-lg bg-marca px-4 py-2 text-[13px] font-bold text-white disabled:opacity-50" disabled={!bling.ligado || Boolean(caido)}>
          Ler o Bling agora
        </button>
        <span className="ml-3 text-[12.5px] text-mudo">Lê por até 45 segundos e continua na próxima rodada.</span>
      </form>

      <p className="mt-8 text-[12.5px] leading-relaxed text-mudo">
        O Bling aceita 3 leituras por segundo; o espelho respeita isso. Pedidos de venda são lidos
        desde 01/01/2026, com os itens de cada um. A primeira carga do ano roda à parte e leva algumas horas.
      </p>
    </div>
  );
}
