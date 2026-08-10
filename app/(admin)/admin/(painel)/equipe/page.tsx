import { notFound } from "next/navigation";
import { usuarioAtual } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata = { title: "Equipe e registros" };

const quando = (d: Date | null) =>
  d ? d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "nunca";

/**
 * Quem tem acesso, e o que cada um fez.
 *
 * Só o desenvolvedor vê. Não é segredo, é ruído: quem opera a loja precisa de
 * pedido e estoque, e uma lista de contas no meio do caminho só atrapalha.
 *
 * Criar e desativar conta continua sendo pela linha de comando. Uma tela que
 * cria administrador é a porta que ninguém lembra de fechar depois, e o ganho
 * de conveniência não paga o risco enquanto a equipe cabe numa mão.
 */
export default async function Equipe() {
  const eu = await usuarioAtual();
  if (eu?.papel !== "DESENVOLVEDOR") notFound();

  const [pessoas, registros] = await Promise.all([
    prisma.usuario.findMany({ orderBy: { criadoEm: "asc" } }),
    prisma.registro.findMany({
      orderBy: { criadoEm: "desc" },
      take: 60,
      include: { usuario: { select: { nome: true } } },
    }),
  ]);

  return (
    <div className="p-6">
      <h1 className="text-xl font-extrabold tracking-tight">Equipe e registros</h1>
      <p className="mt-1.5 max-w-xl text-[13.5px] leading-relaxed text-tinta-2">
        Contas do painel. Criar, redefinir senha e desligar o autenticador de alguém é por linha de
        comando: <code className="rounded bg-superficie-2 px-1.5 py-0.5 text-[12.5px]">npm run usuarios</code>
      </p>

      <div className="mt-5 overflow-x-auto rounded-caixa border border-linha">
        <table className="w-full border-collapse bg-superficie text-[13.5px]">
          <thead>
            <tr className="text-[11px] uppercase tracking-wide text-mudo">
              <th className="border-b border-linha px-4 py-2.5 text-left font-extrabold">Pessoa</th>
              <th className="border-b border-linha px-4 py-2.5 text-left font-extrabold">Acesso</th>
              <th className="border-b border-linha px-4 py-2.5 text-left font-extrabold">Autenticador</th>
              <th className="border-b border-linha px-4 py-2.5 text-right font-extrabold">Último acesso</th>
            </tr>
          </thead>
          <tbody>
            {pessoas.map((u) => (
              <tr key={u.id}>
                <td className="border-b border-linha px-4 py-2.5">
                  <span className="font-bold">{u.nome}</span>
                  <span className="ml-2 text-mudo">{u.login}</span>
                  {!u.ativo && (
                    <span className="ml-2 rounded bg-critico/10 px-1.5 py-0.5 text-[10.5px] font-extrabold text-critico">
                      inativo
                    </span>
                  )}
                </td>
                <td className="border-b border-linha px-4 py-2.5 font-semibold">
                  {u.papel === "DESENVOLVEDOR" ? "Desenvolvedor" : "Operador"}
                </td>
                <td className="border-b border-linha px-4 py-2.5">
                  {u.segredo2FA ? (
                    <span className="font-semibold text-bom">ligado</span>
                  ) : (
                    <span className="font-semibold text-atencao">só senha</span>
                  )}
                </td>
                <td className="num border-b border-linha px-4 py-2.5 text-right text-mudo">
                  {quando(u.ultimoAcesso)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="mt-8 text-[15px] font-extrabold">Últimas ações</h2>
      {registros.length === 0 ? (
        <p className="mt-2 text-[13.5px] text-mudo">
          Nada registrado ainda. A trilha começa na primeira alteração feita pelo painel.
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-linha rounded-caixa border border-linha bg-superficie">
          {registros.map((r) => (
            <li key={r.id} className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5 px-4 py-2.5 text-[13px]">
              <span className="num text-mudo">{quando(r.criadoEm)}</span>
              <span className="font-bold">{r.usuario.nome}</span>
              <span className="text-tinta-2">{r.acao}</span>
              {r.alvo && <span className="text-mudo">{r.alvo}</span>}
              {r.detalhe && <span className="w-full text-[12.3px] text-mudo">{r.detalhe}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
