"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { consultarProtocolo, informarRastreio, reenviarFotos } from "@/lib/assistencia/acoes-cliente";
import { ROTULO_ESPACO, type EspacoFoto } from "@/lib/assistencia/esquemas";
import { enviarFoto } from "./enviar-foto";

const input =
  "w-full rounded-lg border border-linha-2 bg-superficie px-3 py-2.5 text-[15px] font-medium focus:border-marca focus:outline-none focus-visible:ring-2 focus-visible:ring-marca/40";

/** Botão de copiar o protocolo · o cliente precisa anotar o número. */
export function CopiarProtocolo({ protocolo }: { protocolo: string }) {
  const [copiado, setCopiado] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(protocolo);
          setCopiado(true);
          setTimeout(() => setCopiado(false), 2500);
        } catch {
          /* sem área de transferência: o número está na tela */
        }
      }}
      className="rounded-lg border-[1.5px] border-white/40 px-3.5 py-2 text-[13px] font-bold text-white hover:border-white"
    >
      <span aria-live="polite">{copiado ? "Copiado ✓" : "Copiar"}</span>
    </button>
  );
}

/**
 * Agradecimento logo depois de enviar o formulário. Quem escreve às 3 da manhã
 * precisa saber, na hora, que foi recebido e quando vem a resposta.
 * Fecha tirando o `novo=1` do endereço: atualizar a página não reabre.
 */
export function AvisoRecebido({ nome, protocolo, email }: { nome: string; protocolo: string; email: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  const fechar = () => {
    ref.current?.close();
    const u = new URL(window.location.href);
    u.searchParams.delete("novo");
    window.history.replaceState(null, "", u.toString());
  };
  return (
    <dialog
      ref={ref}
      onClose={fechar}
      aria-labelledby="aviso-recebido"
      className="m-auto w-[calc(100%-32px)] max-w-md rounded-caixa bg-superficie p-0 text-tinta shadow-2xl backdrop:bg-black/50"
    >
      <div className="p-6">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-marca">Chamado recebido</p>
        <h2 id="aviso-recebido" className="mt-1 text-xl font-extrabold">
          Obrigado por entrar em contato, {nome.split(" ")[0]}
        </h2>
        <p className="mt-3 text-[15px] text-tinta-2">
          O seu chamado <span className="num font-mono font-bold text-tinta">{protocolo}</span> já está com a nossa equipe
          técnica, que revisa cada caso pessoalmente.
        </p>
        <p className="mt-3 rounded-lg bg-marca-suave px-3 py-2.5 text-[15px] font-semibold text-marca">
          Você recebe a resposta em até 24 horas, por e-mail e nesta página.
        </p>
        <p className="mt-3 text-[13.5px] text-mudo">
          Enviamos a confirmação para <span className="font-semibold">{email}</span>. Guarde o número do protocolo.
        </p>
        <button type="button" onClick={fechar} autoFocus className="mt-5 w-full rounded-lg bg-marca px-5 py-3 text-[14px] font-bold text-white">
          Entendi
        </button>
      </div>
    </dialog>
  );
}

/** Enquanto a análise roda (segundos), a página se atualiza sozinha. */
export function AtualizarEnquantoAnalisa() {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => router.refresh(), 4000);
    return () => clearInterval(t);
  }, [router]);
  return null;
}

export function ConsultaProtocolo() {
  const [estado, acao, pendente] = useActionState(consultarProtocolo, null);
  return (
    <form action={acao} className="rounded-caixa border border-linha bg-superficie p-5 sm:p-7">
      <label htmlFor="protocolo" className="mb-1.5 block text-[13.5px] font-bold">Protocolo</label>
      <input id="protocolo" name="protocolo" placeholder="AT-2026-000123" autoCapitalize="characters" className={`num ${input}`} required />
      <label htmlFor="documento" className="mb-1.5 mt-4 block text-[13.5px] font-bold">CPF ou CNPJ de quem abriu</label>
      <input id="documento" name="documento" inputMode="numeric" className={`num ${input}`} required />
      {estado?.erro && (
        <p role="alert" className="mt-3 text-[13px] font-semibold text-critico">{estado.erro}</p>
      )}
      <button disabled={pendente} className="mt-5 rounded-lg bg-marca px-6 py-3 text-[14px] font-bold text-white disabled:opacity-60">
        {pendente ? "Buscando…" : "Ver chamado"}
      </button>
    </form>
  );
}

export function FormRastreio({ protocolo, chave }: { protocolo: string; chave: string }) {
  const [estado, acao, pendente] = useActionState(informarRastreio.bind(null, protocolo, chave), null);
  if (estado && "ok" in estado) return <p className="text-[14px] font-bold text-bom">Rastreio recebido. Avisaremos quando a bomba chegar.</p>;
  return (
    <form action={acao} className="flex flex-wrap items-end gap-2">
      <div className="min-w-[14rem] flex-1">
        <label htmlFor="rastreio" className="mb-1.5 block text-[13.5px] font-bold">Já enviou? Informe o rastreio</label>
        <input id="rastreio" name="rastreio" placeholder="QB123456789BR" autoCapitalize="characters" className={`num ${input}`} aria-describedby={estado?.erro ? "rastreio-erro" : undefined} />
      </div>
      <button disabled={pendente} className="rounded-lg bg-marca px-5 py-2.5 text-[14px] font-bold text-white disabled:opacity-60">Salvar</button>
      {estado && "erro" in estado && (
        <p id="rastreio-erro" role="alert" className="w-full text-[13px] font-semibold text-critico">{estado.erro}</p>
      )}
    </form>
  );
}

export function ReenviarFotos({ protocolo, chave, espacos }: { protocolo: string; chave: string; espacos: EspacoFoto[] }) {
  const router = useRouter();
  const [fotos, setFotos] = useState<Partial<Record<EspacoFoto, { caminho: string; previa: string }>>>({});
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const rascunho = useRef<string | null>(null);

  return (
    <div>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {espacos.map((e) => (
          <li key={e}>
            <label className="block cursor-pointer overflow-hidden rounded-lg border-2 border-dashed border-linha-2 bg-superficie-2 text-center has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-marca/40">
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="sr-only"
                aria-label={`Foto: ${ROTULO_ESPACO[e].t}`}
                onChange={async (ev) => {
                  const f = ev.target.files?.[0];
                  if (!f) return;
                  setOcupado(true);
                  setErro(null);
                  try {
                    const r = await enviarFoto(rascunho.current, e, f);
                    rascunho.current = r.rascunho;
                    setFotos((x) => ({ ...x, [e]: r }));
                  } catch (er) {
                    setErro(er instanceof Error ? er.message : "Falha ao enviar.");
                  }
                  setOcupado(false);
                }}
              />
              {fotos[e] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={fotos[e]!.previa} alt="" className="aspect-square w-full object-cover" />
              ) : (
                <span className="flex aspect-square items-center justify-center text-[12px] font-semibold text-mudo">Toque para fotografar</span>
              )}
              <span className="block border-t border-linha px-2 py-1.5 text-[12.5px] font-bold">{ROTULO_ESPACO[e].t}</span>
            </label>
          </li>
        ))}
      </ul>
      <p aria-live="polite" className="mt-2 text-[13px] font-semibold text-critico">{erro}</p>
      <button
        type="button"
        disabled={ocupado || Object.keys(fotos).length === 0}
        onClick={async () => {
          setOcupado(true);
          const r = await reenviarFotos(protocolo, chave, Object.fromEntries(Object.entries(fotos).map(([k, v]) => [k, v!.caminho])));
          if ("erro" in r) setErro(r.erro ?? "Falha ao enviar.");
          else router.refresh();
          setOcupado(false);
        }}
        className="mt-3 rounded-lg bg-marca px-6 py-3 text-[14px] font-bold text-white disabled:opacity-60"
      >
        Enviar fotos
      </button>
    </div>
  );
}
