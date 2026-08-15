"use client";

import { useState, useTransition } from "react";
import { buscarEmpresa, cadastrarRevenda, type Busca } from "@/app/(loja)/revenda/acoes";
import { formatarCnpj } from "@/lib/cnpj";

/**
 * Cadastro de revenda, uma tela por vez.
 *
 * O revendedor digita só o CNPJ. Razão social, endereço, CNAE e situação vêm
 * preenchidos da Receita · ele confere e corrige o que precisar. Pedir de novo
 * o que o governo já publica é a forma mais rápida de perder um cadastro no
 * meio do caminho.
 *
 * Quatro passos curtos em vez de um formulário longo: cada tela pede uma coisa
 * só, e quem abre vê o fim perto.
 */
const PASSOS = ["CNPJ", "Dados da empresa", "Contato", "Pronto"];

export function FormRevenda() {
  const [passo, setPasso] = useState(0);
  const [cnpj, setCnpj] = useState("");
  const [busca, setBusca] = useState<Busca | null>(null);
  const [erro, setErro] = useState("");
  const [automatico, setAutomatico] = useState(false);
  const [indo, iniciar] = useTransition();

  const empresa = busca?.ok ? busca.empresa : null;

  return (
    <div className="rounded-caixa border border-linha bg-superficie p-6 shadow-lg shadow-marca/5 sm:p-8">
      <ol className="mb-7 flex flex-wrap items-center gap-x-2 gap-y-2 text-[11.5px] font-bold">
        {PASSOS.map((p, i) => (
          <li key={p} className="flex items-center gap-2">
            <span
              className={`num grid h-6 w-6 place-items-center rounded-full text-[11px] ${
                i < passo ? "bg-bom text-white" : i === passo ? "bg-marca text-white" : "bg-superficie-2 text-mudo"
              }`}
            >
              {i < passo ? "✓" : i + 1}
            </span>
            <span className={i === passo ? "text-tinta" : "text-mudo"}>{p}</span>
            {i < PASSOS.length - 1 && <span aria-hidden className="ml-1 text-linha-2">—</span>}
          </li>
        ))}
      </ol>

      {/* ── 1 · o CNPJ, e só ────────────────────────────────────── */}
      {passo === 0 && (
        <div>
          <h3 className="text-[19px] font-extrabold tracking-tight">Comece pelo CNPJ</h3>
          <p className="mt-1.5 text-[14px] text-tinta-2">
            O resto a gente busca na Receita. Você só confere.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <input
              value={cnpj}
              onChange={(e) => (setCnpj(formatarCnpj(e.target.value)), setBusca(null))}
              onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
              inputMode="numeric"
              placeholder="00.000.000/0000-00"
              aria-label="CNPJ"
              className="num min-w-0 flex-1 rounded-lg border border-linha-2 bg-superficie px-4 py-3 text-[16px] font-bold tracking-wide"
            />
            <button
              onClick={() =>
                iniciar(async () => {
                  const r = await buscarEmpresa(cnpj);
                  setBusca(r);
                  if (r.ok) setPasso(1);
                })
              }
              disabled={indo || cnpj.replace(/\D/g, "").length !== 14}
              className="shrink-0 rounded-lg bg-marca px-6 py-3 text-[14px] font-bold text-white transition hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
            >
              {indo ? "Buscando…" : "Continuar"}
            </button>
          </div>
          {busca && !busca.ok && (
            <p role="alert" className="mt-3 text-[13px] font-semibold text-critico">{busca.erro}</p>
          )}
        </div>
      )}

      {/* ── 2 · o que a Receita já sabe ─────────────────────────── */}
      {passo === 1 && empresa && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setPasso(2);
          }}
        >
          <h3 className="text-[19px] font-extrabold tracking-tight">Confere se está certo</h3>
          <p className="mt-1.5 text-[14px] text-tinta-2">
            Veio da Receita Federal. Corrija o que precisar.
          </p>

          {busca?.ok && busca.jaCadastrado && (
            <p className="mt-3 rounded-lg border border-atencao/35 bg-atencao/10 px-3.5 py-2.5 text-[13px] font-semibold text-tinta-2">
              Este CNPJ já tem cadastro aqui. Enviar de novo atualiza os dados.
            </p>
          )}

          <input type="hidden" name="cnpj" value={empresa.cnpj} />
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Campo n="razaoSocial" r="Razão social" v={empresa.razaoSocial} req className="sm:col-span-2" />
            <Campo n="nomeFantasia" r="Nome fantasia" v={empresa.nomeFantasia ?? ""} />
            <Campo n="inscricaoEstadual" r="Inscrição estadual" v="" dica="se tiver" />
            <Campo n="cep" r="CEP" v={empresa.cep ?? ""} />
            <Campo n="logradouro" r="Endereço" v={empresa.logradouro ?? ""} />
            <Campo n="numero" r="Número" v={empresa.numero ?? ""} />
            <Campo n="bairro" r="Bairro" v={empresa.bairro ?? ""} />
            <Campo n="cidade" r="Cidade" v={empresa.cidade ?? ""} />
            <Campo n="uf" r="UF" v={empresa.uf ?? ""} />
          </div>

          <p className="mt-3 text-[12px] text-mudo">
            {empresa.cnae && <>Atividade: {empresa.cnae}. </>}
            {empresa.situacao && <>Situação na Receita: {empresa.situacao}.</>}
          </p>

          <div className="mt-5 flex gap-2">
            <button type="button" onClick={() => setPasso(0)} className="rounded-lg border border-linha px-4 py-2.5 text-[13px] font-bold text-tinta-2">
              Voltar
            </button>
            <button className="rounded-lg bg-marca px-6 py-2.5 text-[13px] font-bold text-white">
              Continuar
            </button>
          </div>
        </form>
      )}

      {/* ── 3 · com quem falamos ────────────────────────────────── */}
      {passo === 2 && empresa && (
        <form
          action={(d) =>
            iniciar(async () => {
              // Os campos da tela anterior seguem no DOM, então o FormData os
              // carrega junto · o revendedor não redigita nada.
              const r = await cadastrarRevenda(d);
              if (r.ok) {
                setAutomatico(r.automatico);
                setPasso(3);
              } else setErro(r.erro);
            })
          }
        >
          <h3 className="text-[19px] font-extrabold tracking-tight">Com quem a gente fala</h3>
          <p className="mt-1.5 text-[14px] text-tinta-2">
            É por aqui que mandamos a tabela e tiramos dúvida de modelo.
          </p>

          <input type="hidden" name="cnpj" value={empresa.cnpj} />
          <input type="hidden" name="razaoSocial" value={empresa.razaoSocial} />
          <input type="hidden" name="nomeFantasia" value={empresa.nomeFantasia ?? ""} />
          <input type="hidden" name="cnae" value={empresa.cnae ?? ""} />
          <input type="hidden" name="situacao" value={empresa.situacao ?? ""} />
          <input type="hidden" name="cep" value={empresa.cep ?? ""} />
          <input type="hidden" name="logradouro" value={empresa.logradouro ?? ""} />
          <input type="hidden" name="numero" value={empresa.numero ?? ""} />
          <input type="hidden" name="bairro" value={empresa.bairro ?? ""} />
          <input type="hidden" name="cidade" value={empresa.cidade ?? ""} />
          <input type="hidden" name="uf" value={empresa.uf ?? ""} />

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Campo n="responsavel" r="Nome do responsável" req className="sm:col-span-2" />
            <Campo n="email" r="E-mail" tipo="email" req />
            <Campo n="whatsapp" r="WhatsApp com DDD" req />
          </div>

          {erro && <p role="alert" className="mt-3 text-[13px] font-semibold text-critico">{erro}</p>}

          <div className="mt-5 flex gap-2">
            <button type="button" onClick={() => setPasso(1)} className="rounded-lg border border-linha px-4 py-2.5 text-[13px] font-bold text-tinta-2">
              Voltar
            </button>
            <button disabled={indo} className="rounded-lg bg-marca px-6 py-2.5 text-[13px] font-bold text-white disabled:opacity-60">
              {indo ? "Enviando…" : "Enviar cadastro"}
            </button>
          </div>
        </form>
      )}

      {/* ── 4 · pronto ──────────────────────────────────────────── */}
      {passo === 3 && (
        <div className="py-2">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-bom-suave text-bom">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" className="h-6 w-6">
              <path d="M4 12.5l5 5L20 6.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <h3 className="mt-4 text-[20px] font-extrabold tracking-tight">Cadastro enviado</h3>
          <p className="mt-2 max-w-md text-[14.5px] leading-relaxed text-tinta-2">
            {automatico
              ? "Seu acesso à tabela de revenda já está liberado. Mandamos os preços no e-mail e no WhatsApp que você informou."
              : "Vamos conferir e liberar a tabela de revenda. Você recebe os preços no e-mail e no WhatsApp que informou, normalmente no mesmo dia útil."}
          </p>
          <p className="mt-3 text-[13px] text-mudo">
            Enquanto isso, qualquer dúvida de modelo é só chamar no Vibra Phone.
          </p>
        </div>
      )}
    </div>
  );
}

function Campo({
  n, r, v, req, dica, tipo = "text", className = "",
}: {
  n: string; r: string; v?: string; req?: boolean; dica?: string; tipo?: string; className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 flex items-baseline gap-2 text-[12px] font-bold">
        {r}
        {dica && <span className="font-medium text-mudo">{dica}</span>}
      </span>
      <input
        name={n}
        defaultValue={v}
        required={req}
        type={tipo}
        className="w-full rounded-lg border border-linha-2 bg-superficie px-3 py-2.5 text-[14px] font-semibold"
      />
    </label>
  );
}
