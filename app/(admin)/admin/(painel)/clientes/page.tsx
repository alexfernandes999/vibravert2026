import Link from "next/link";
import { ArrowLeft, ExternalLink, MessageCircle, Search, X } from "lucide-react";
import {
  buscarClientes,
  ETIQUETAS,
  fichaCliente,
  ORIGENS,
  paramsPessoa,
  telefoneE164,
  type Cartao,
} from "@/lib/clientes";
import { Avatar, Dados, Linha, PillAssunto, PillOrigem, quando, StatusEnvio } from "@/components/admin/ficha-cliente";

export const dynamic = "force-dynamic";
export const metadata = { title: "Clientes" };

/**
 * Clientes · só quem comprou (site e marketplaces). Conversas ficam em
 * Atendimento. Estrutura do Conversas: lista compacta à esquerda, a pessoa
 * em formato de chat no meio (WhatsApp, pedidos e chamados na mesma linha do
 * tempo) e os dados à direita. Tudo pela URL, sem estado no navegador:
 *   q = busca · origem · tag = etiqueta · d/e/t = pessoa aberta.
 */

type Params = { q?: string; origem?: string; assunto?: string; tag?: string; d?: string; e?: string; t?: string; v?: string };


export default async function Clientes({ searchParams }: { searchParams: Promise<Params> }) {
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const pessoas = await buscarClientes({ q, origem: sp.origem, etiqueta: sp.tag });
  const aberto = Boolean(sp.d || sp.e || sp.t || sp.v);
  const ficha = aberto ? await fichaCliente({ d: sp.d, e: sp.e, t: sp.t, v: sp.v }) : null;

  // Links que mudam um filtro e mantêm o resto.
  const url = (mudar: Partial<Params>) => {
    const p = new URLSearchParams();
    const v = { ...sp, ...mudar };
    for (const k of ["q", "origem", "assunto", "tag", "d", "e", "t", "v"] as const) if (v[k]) p.set(k, v[k]!);
    return `/admin/clientes${p.size ? `?${p}` : ""}`;
  };
  const abrir = (c: Cartao) => {
    const p = paramsPessoa(c);
    return url({ d: p.get("d") ?? "", e: p.get("e") ?? "", t: p.get("t") ?? "", v: p.get("v") ?? "" });
  };
  const fechar = url({ d: "", e: "", t: "", v: "" });

  const selecionado = (c: Cartao) =>
    aberto &&
    ((sp.v && c.conversaId === sp.v) ||
      (sp.d && c.documento === sp.d) ||
      (sp.e && c.email?.toLowerCase() === sp.e) ||
      (sp.t && telefoneE164(c.telefone) === sp.t));

  return (
    <div className="flex h-[100dvh] min-h-0 bg-fundo">
      {/* ── lista ─────────────────────────────────────────────────── */}
      <aside className={`${aberto ? "hidden md:flex" : "flex"} w-full shrink-0 flex-col border-r border-linha bg-superficie md:w-[340px]`}>
        <div className="border-b border-linha px-4 pb-3 pt-4">
          <h1 className="text-[17px] font-extrabold tracking-tight">Clientes</h1>
          <form className="mt-2.5">
            {sp.origem && <input type="hidden" name="origem" value={sp.origem} />}
            {sp.tag && <input type="hidden" name="tag" value={sp.tag} />}
            <label className="flex items-center gap-2 rounded-lg border border-linha-2 bg-fundo px-2.5 py-1.5 focus-within:border-marca">
              <Search aria-hidden className="h-4 w-4 text-mudo" />
              <input name="q" defaultValue={q} placeholder="Nome, CPF/CNPJ, e-mail ou telefone" aria-label="Buscar cliente" className="w-full bg-transparent text-[13px] outline-none" />
              {q && (
                <Link href={url({ q: "" })} aria-label="Limpar busca" className="text-mudo hover:text-tinta">
                  <X className="h-3.5 w-3.5" />
                </Link>
              )}
            </label>
          </form>
          <p className="mb-1 mt-3 text-[10.5px] font-bold uppercase tracking-wider text-tenue">Onde comprou</p>
          <div className="flex flex-wrap gap-1">
            {ORIGENS.map((o) => {
              const on = sp.origem === o;
              return (
                <Link key={o} href={url({ origem: on ? "" : o })} className={`rounded-full border px-2 py-0.5 text-[11.5px] font-semibold ${on ? "border-marca bg-marca text-white" : "border-linha-2 text-tinta-2 hover:border-marca"}`}>
                  {o}
                </Link>
              );
            })}
          </div>
          <p className="mb-1 mt-2.5 text-[10.5px] font-bold uppercase tracking-wider text-tenue">Etiquetas</p>
          <div className="flex flex-wrap gap-1">
            {ETIQUETAS.map((t) => {
              const on = sp.tag === t;
              return (
                <Link key={t} href={url({ tag: on ? "" : t })} className={`rounded-full border px-2 py-0.5 text-[11.5px] font-semibold ${on ? "border-marca bg-marca text-white" : "border-linha-2 text-tinta-2 hover:border-marca"}`}>
                  {t}
                </Link>
              );
            })}
          </div>
        </div>

        <ul className="min-h-0 flex-1 overflow-y-auto">
          {pessoas.map((c, i) => {
            const sel = selecionado(c);
            const pedidos = c.pedidosSite + c.pedidosBling;
            return (
              <li key={`${c.documento ?? c.email ?? c.telefone ?? c.nome}-${i}`}>
                <Link
                  href={abrir(c)}
                  aria-current={sel ? "true" : undefined}
                  className={`flex gap-3 border-b border-linha px-4 py-2.5 ${sel ? "bg-marca-suave" : "hover:bg-fundo"}`}
                >
                  <Avatar nome={c.nome} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline gap-2">
                      <span className="truncate text-[13.5px] font-semibold">{c.nome}</span>
                      <span className="num ml-auto shrink-0 text-[11px] text-mudo">{quando(c.ultimo)}</span>
                    </span>
                    <span className="mt-0.5 flex items-center gap-1 overflow-hidden">
                      {c.origens.slice(0, 2).map((o) => <PillOrigem key={o} o={o} />)}
                      <span className="ml-auto shrink-0 text-[11px] text-mudo">
                        {[pedidos && `${pedidos} ped.`, c.chamados && `${c.chamados} cham.`].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                    {c.chamadoAberto && <span className="mt-0.5 block text-[11px] font-bold text-ouro-txt">Chamado aberto</span>}
                  </span>
                </Link>
              </li>
            );
          })}
          {pessoas.length === 0 && <li className="px-4 py-6 text-center text-[13px] text-mudo">Ninguém encontrado.</li>}
        </ul>
      </aside>

      {/* ── conversa (linha do tempo) ─────────────────────────────── */}
      {ficha ? (
        <>
          <section className="flex min-w-0 flex-1 flex-col">
            <header className="flex items-center gap-3 border-b border-linha bg-superficie px-4 py-2.5">
              <Link href={fechar} className="md:hidden" aria-label="Voltar para a lista"><ArrowLeft className="h-5 w-5" /></Link>
              <Avatar nome={ficha.nome} grande />
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 truncate text-[15px] font-extrabold">
                  {ficha.nome}
                  {ficha.assuntos.map((a) => <PillAssunto key={a} a={a} />)}
                </p>
                <p className="num truncate text-[12px] text-mudo">
                  {[...ficha.telefones.map((t) => `+${t}`), ...ficha.emails].join(" · ") ||
                    (ficha.vibrinha.length ? "Não deixou contato no chat do site" : "Sem telefone nem e-mail")}
                </p>
              </div>
              <div className="ml-auto flex shrink-0 gap-2">
                {[...new Map(ficha.whatsapp.conversas.map((c) => [c.numero, c])).values()].slice(0, 2).map((c) => (
                  <a key={c.id} href={c.link} target="_blank" rel="noopener" className="inline-flex items-center gap-1.5 rounded-lg bg-marca px-3 py-1.5 text-[12.5px] font-bold text-white">
                    <ExternalLink className="h-3.5 w-3.5" /> Conversas · {c.numero}
                  </a>
                ))}
              </div>
            </header>
            <StatusEnvio wa={ficha.whatsapp} />
            <Linha ficha={ficha} />
          </section>

          {/* ── dados ─────────────────────────────────────────────── */}
          <aside className="hidden w-[300px] shrink-0 overflow-y-auto border-l border-linha bg-superficie p-4 xl:block">
            <Dados ficha={ficha} />
          </aside>
        </>
      ) : (
        <section className="hidden flex-1 place-items-center md:grid">
          <div className="text-center text-mudo">
            <MessageCircle aria-hidden className="mx-auto h-10 w-10 text-tenue" strokeWidth={1.5} />
            <p className="mt-2 text-[14px] font-semibold">Escolha um cliente na lista</p>
            <p className="text-[12.5px]">Só quem comprou. Quem conversou com a gente (chat, formulário, WhatsApp) fica em Atendimento.</p>
          </div>
        </section>
      )}
    </div>
  );
}

