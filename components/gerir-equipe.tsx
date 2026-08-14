"use client";

import { useState, useTransition } from "react";
import {
  criarUsuario, redefinirSenha, desligarDoisFatores, alternarAtivo, trocarPapel,
  type Resultado,
} from "@/lib/acoes-equipe";

type Pessoa = {
  id: string;
  login: string;
  nome: string;
  email: string;
  papel: "OPERADOR" | "MASTER" | "DESENVOLVEDOR";
  ativo: boolean;
  temDoisFatores: boolean;
  ultimoAcesso: string | null;
};

const ROTULO: Record<Pessoa["papel"], { r: string; d: string }> = {
  OPERADOR: { r: "Operador", d: "pedidos, estoque, produtos e vitrine" },
  MASTER: { r: "Dono", d: "tudo do operador, mais dar e tirar acesso" },
  DESENVOLVEDOR: { r: "Desenvolvedor", d: "tudo, mais integrações e diagnóstico" },
};

/**
 * Equipe do painel.
 *
 * A senha nova aparece uma vez e some da tela junto com o aviso. Guardá-la em
 * algum lugar para poder mostrar de novo seria guardar senha em texto — o que
 * o resto do sistema evita de propósito.
 */
export function GerirEquipe({ pessoas, euId }: { pessoas: Pessoa[]; euId: string }) {
  const [aviso, setAviso] = useState<Resultado | null>(null);
  const [abrindo, setAbrindo] = useState(false);
  const [indo, iniciar] = useTransition();

  const rodar = (fn: () => Promise<Resultado>) => iniciar(async () => setAviso(await fn()));

  return (
    <>
      {aviso && (
        <div
          role="status"
          className={`mt-4 rounded-caixa border px-4 py-3 text-[13px] ${
            aviso.ok
              ? "border-bom/30 bg-bom-suave text-bom"
              : "border-critico/30 bg-critico/5 text-critico"
          }`}
        >
          <p className="font-bold">{aviso.ok ? aviso.mensagem : aviso.erro}</p>
          {aviso.ok && aviso.senha && (
            <p className="num mt-2 rounded-md bg-superficie px-3 py-2 text-[15px] font-extrabold tracking-wide text-tinta">
              {aviso.senha}
            </p>
          )}
        </div>
      )}

      <div className="mt-5 overflow-x-auto rounded-caixa border border-linha">
        <table className="w-full border-collapse bg-superficie text-[13.5px]">
          <thead>
            <tr className="text-[11px] uppercase tracking-wide text-mudo">
              <th className="border-b border-linha px-4 py-2.5 text-left font-extrabold">Pessoa</th>
              <th className="border-b border-linha px-4 py-2.5 text-left font-extrabold">Acesso</th>
              <th className="border-b border-linha px-4 py-2.5 text-left font-extrabold">Autenticador</th>
              <th className="border-b border-linha px-4 py-2.5 text-right font-extrabold">Ações</th>
            </tr>
          </thead>
          <tbody>
            {pessoas.map((p) => (
              <tr key={p.id}>
                <td className="border-b border-linha px-4 py-3">
                  <span className="font-bold">{p.nome}</span>
                  <span className="ml-2 text-mudo">{p.login}</span>
                  {!p.ativo && (
                    <span className="ml-2 rounded bg-critico/10 px-1.5 py-0.5 text-[10.5px] font-extrabold text-critico">
                      inativo
                    </span>
                  )}
                  <span className="block text-[11.5px] text-mudo">{p.email}</span>
                </td>
                <td className="border-b border-linha px-4 py-3">
                  <select
                    defaultValue={p.papel}
                    disabled={indo}
                    onChange={(e) => rodar(() => trocarPapel(p.id, e.target.value as Pessoa["papel"]))}
                    className="rounded-md border border-linha-2 bg-superficie px-2 py-1 text-[12.5px] font-semibold"
                  >
                    {(Object.keys(ROTULO) as Pessoa["papel"][]).map((k) => (
                      <option key={k} value={k}>{ROTULO[k].r}</option>
                    ))}
                  </select>
                  <span className="mt-1 block text-[11px] leading-snug text-mudo">
                    {ROTULO[p.papel].d}
                  </span>
                </td>
                <td className="border-b border-linha px-4 py-3">
                  {p.temDoisFatores ? (
                    <span className="font-semibold text-bom">ligado</span>
                  ) : (
                    <span className="font-semibold text-atencao">só senha</span>
                  )}
                  <span className="num block text-[11.5px] text-mudo">
                    {p.ultimoAcesso ?? "nunca entrou"}
                  </span>
                </td>
                <td className="border-b border-linha px-4 py-3">
                  <div className="flex flex-wrap justify-end gap-1.5">
                    <button
                      disabled={indo}
                      onClick={() => rodar(() => redefinirSenha(p.id))}
                      className="rounded-md border border-linha px-2.5 py-1 text-[11.5px] font-bold text-tinta-2 hover:border-marca hover:text-marca"
                    >
                      Nova senha
                    </button>
                    {p.temDoisFatores && (
                      <button
                        disabled={indo}
                        onClick={() => rodar(() => desligarDoisFatores(p.id))}
                        className="rounded-md border border-linha px-2.5 py-1 text-[11.5px] font-bold text-tinta-2 hover:border-marca hover:text-marca"
                      >
                        Perdeu o celular
                      </button>
                    )}
                    {p.id !== euId && (
                      <button
                        disabled={indo}
                        onClick={() => rodar(() => alternarAtivo(p.id))}
                        className={`rounded-md border px-2.5 py-1 text-[11.5px] font-bold ${
                          p.ativo
                            ? "border-linha text-critico hover:border-critico"
                            : "border-bom text-bom"
                        }`}
                      >
                        {p.ativo ? "Desativar" : "Reativar"}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!abrindo ? (
        <button
          onClick={() => setAbrindo(true)}
          className="mt-4 rounded-lg bg-marca px-4 py-2.5 text-[13px] font-bold text-white transition hover:brightness-110 active:scale-[0.98]"
        >
          + Criar acesso
        </button>
      ) : (
        <form
          action={(d) => rodar(async () => {
            const r = await criarUsuario(d);
            if (r.ok) setAbrindo(false);
            return r;
          })}
          className="mt-4 rounded-caixa border border-marca/25 bg-superficie-2 p-5"
        >
          <p className="text-[14px] font-extrabold">Criar acesso ao painel</p>
          <p className="mt-1 text-[12.5px] text-mudo">
            A senha aparece uma vez só, aqui na tela. O segundo fator a pessoa cadastra sozinha no
            primeiro acesso.
          </p>

          <div className="mt-3.5 grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-[12px] font-bold">Nome</span>
              <input name="nome" required className="w-full rounded-lg border border-linha-2 bg-superficie px-3 py-2 text-[13.5px] font-semibold" />
            </label>
            <label className="block">
              <span className="mb-1 block text-[12px] font-bold">Usuário</span>
              <input name="login" required autoCapitalize="none" placeholder="escritorio" className="w-full rounded-lg border border-linha-2 bg-superficie px-3 py-2 text-[13.5px] font-semibold" />
            </label>
            <label className="block">
              <span className="mb-1 block text-[12px] font-bold">E-mail</span>
              <input name="email" type="email" required className="w-full rounded-lg border border-linha-2 bg-superficie px-3 py-2 text-[13.5px] font-semibold" />
            </label>
            <label className="block">
              <span className="mb-1 block text-[12px] font-bold">Acesso</span>
              <select name="papel" defaultValue="OPERADOR" className="w-full rounded-lg border border-linha-2 bg-superficie px-3 py-2 text-[13.5px] font-semibold">
                {(Object.keys(ROTULO) as Pessoa["papel"][]).map((k) => (
                  <option key={k} value={k}>{ROTULO[k].r} · {ROTULO[k].d}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-4 flex gap-2">
            <button disabled={indo} className="rounded-lg bg-marca px-4 py-2.5 text-[13px] font-bold text-white disabled:opacity-60">
              {indo ? "Criando…" : "Criar"}
            </button>
            <button type="button" onClick={() => setAbrindo(false)} className="rounded-lg border border-linha px-4 py-2.5 text-[13px] font-bold text-tinta-2">
              Cancelar
            </button>
          </div>
        </form>
      )}
    </>
  );
}
