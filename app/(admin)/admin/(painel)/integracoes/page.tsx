import { revalidatePath } from "next/cache";
import { conexao, conferir, trocarCodigo, configurado } from "@/lib/bling";
import { registrarAcao } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

const CONVITE = process.env.BLING_LINK_CONVITE || "";

/**
 * Autorização manual, para quando o link de convite não volta para cá.
 *
 * A URL de redirecionamento fica cadastrada lá dentro do Bling, e basta um
 * caractere fora do lugar para o navegador cair em outro endereço com o código
 * na barra. Em vez de mandar a pessoa mexer no cadastro no meio da tarefa, ela
 * cola a URL inteira aqui e a gente extrai o código.
 */
async function colarCodigo(dados: FormData) {
  "use server";
  const bruto = String(dados.get("codigo") ?? "").trim();
  if (!bruto) return;

  // Aceita a URL inteira da barra ou só o código solto: quem acabou de ser
  // redirecionado tem a URL, não o código.
  const code = bruto.includes("code=")
    ? (new URL(bruto.startsWith("http") ? bruto : `https://x/?${bruto.split("?").pop()}`)
        .searchParams.get("code") ?? "")
    : bruto;
  if (!code) return;

  await trocarCodigo(code);
  await registrarAcao("conectou o Bling");
  revalidatePath("/admin/integracoes");
}

const quando = (d: Date) =>
  d.toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

export default async function Integracoes() {
  const bling = await conexao();

  // Só perguntamos quem é a conta quando já há token · a chamada custa uma
  // requisição e não faz sentido antes de autorizar.
  let empresa: { nome?: string; email?: string } | null = null;
  let falha: string | null = null;
  if (bling.ligado) {
    try {
      empresa = await conferir();
    } catch (e) {
      falha = e instanceof Error ? e.message : "não respondeu";
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <h1 className="text-[26px] font-extrabold tracking-tight">Integrações</h1>
      <p className="mt-1.5 text-[14.5px] text-tinta-2">
        Serviços de fora que a loja usa. Aqui dá para ver se estão de pé sem precisar
        abrir o site de cada um.
      </p>

      <section className="mt-7 rounded-caixa border border-linha bg-superficie p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-[18px] font-extrabold">Bling</h2>
            <p className="mt-1 text-[13.5px] text-tinta-2">Nota fiscal e pedidos.</p>
          </div>
          <span
            className={`rounded-lg px-2.5 py-1 text-[10.5px] font-extrabold uppercase tracking-[0.07em] ${
              bling.ligado && !falha
                ? "bg-bom/10 text-bom"
                : bling.ligado
                  ? "bg-atencao/10 text-atencao"
                  : "bg-linha text-mudo"
            }`}
          >
            {bling.ligado && !falha ? "Conectado" : bling.ligado ? "Com erro" : "Não conectado"}
          </span>
        </div>

        {!configurado && (
          <p className="mt-4 rounded-lg border-l-[3px] border-critico bg-critico/[0.06] px-4 py-3 text-[13.5px] text-tinta-2">
            Faltam <b>BLING_CLIENT_ID</b> e <b>BLING_CLIENT_SECRET</b> no ambiente. Sem
            isso nem dá para começar.
          </p>
        )}

        {bling.ligado && (
          <dl className="num mt-5 grid gap-x-6 gap-y-2 border-t border-linha pt-5 text-[13.5px] sm:grid-cols-[auto_1fr]">
            {empresa?.nome && (
              <>
                <dt className="font-bold text-tinta-2">Conta</dt>
                <dd>{empresa.nome}</dd>
              </>
            )}
            <dt className="font-bold text-tinta-2">Renovado</dt>
            <dd>{quando(bling.renovadoEm)}</dd>
            <dt className="font-bold text-tinta-2">Token vence</dt>
            <dd>{quando(bling.expiraEm)} · renova sozinho</dd>
            {bling.refreshAte && (
              <>
                <dt className="font-bold text-tinta-2">Autorização até</dt>
                <dd className={bling.vencendo ? "font-bold text-atencao" : undefined}>
                  {quando(bling.refreshAte)}
                  {bling.vencendo && " · reautorize antes de cair"}
                </dd>
              </>
            )}
            {bling.escopos && (
              <>
                <dt className="font-bold text-tinta-2">Permissões</dt>
                <dd className="break-words text-tinta-2">{bling.escopos}</dd>
              </>
            )}
          </dl>
        )}

        {falha && (
          <p className="mt-4 rounded-lg border-l-[3px] border-atencao bg-atencao/[0.07] px-4 py-3 text-[13px] text-tinta-2">
            O token existe, mas o Bling recusou: <span className="num">{falha}</span>
          </p>
        )}

        <div className="mt-6 border-t border-linha pt-5">
          <h3 className="text-[14.5px] font-extrabold">
            {bling.ligado ? "Reautorizar" : "Conectar"}
          </h3>
          <p className="mt-1.5 text-[13.5px] leading-relaxed text-tinta-2">
            Abra o link de convite do Bling com uma conta que tenha acesso à empresa e
            autorize. Se depois de autorizar o navegador cair em outro endereço, copie a
            URL inteira da barra e cole aqui embaixo · o código está dentro dela.
          </p>

          {CONVITE && (
            <a
              href={CONVITE}
              target="_blank"
              rel="noopener"
              className="mt-3 inline-block rounded-lg bg-marca px-4 py-2.5 text-[14px] font-bold text-white"
            >
              Abrir o link de convite
            </a>
          )}

          <form action={colarCodigo} className="mt-4 flex flex-col gap-2 sm:flex-row">
            <input
              name="codigo"
              placeholder="cole aqui a URL de volta, ou só o código"
              className="num min-w-0 flex-1 rounded-lg border border-linha bg-fundo px-3 py-2.5 text-[13.5px]"
            />
            <button className="rounded-lg border border-linha-2 px-4 py-2.5 text-[14px] font-bold">
              Trocar por token
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
