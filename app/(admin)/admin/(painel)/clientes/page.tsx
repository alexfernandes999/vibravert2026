import Link from "next/link";
import { ArrowLeft, ExternalLink, MessageCircle, Search, ShoppingBag, Wrench, X } from "lucide-react";
import {
  ASSUNTOS,
  buscarClientes,
  ETIQUETAS,
  fichaCliente,
  ORIGENS,
  paramsPessoa,
  podeEnviar,
  telefoneE164,
  type Cartao,
  type PedidoFicha,
  type WhatsappFicha,
} from "@/lib/clientes";
import { mascararDocumento } from "@/lib/assistencia/laudo";
import { SeloStatus } from "@/components/assistencia/selo-status";
import { ROTULO_STATUS } from "@/lib/assistencia/portal";
import { brl } from "@/lib/formato";

export const dynamic = "force-dynamic";
export const metadata = { title: "Clientes" };

/**
 * Clientes, com a estrutura do Conversas: lista compacta à esquerda, a pessoa
 * em formato de chat no meio (WhatsApp, pedidos e chamados na mesma linha do
 * tempo) e os dados à direita. Tudo pela URL, sem estado no navegador:
 *   q = busca · origem · tag = etiqueta · d/e/t = pessoa aberta.
 */

type Params = { q?: string; origem?: string; assunto?: string; tag?: string; d?: string; e?: string; t?: string; v?: string };

const STATUS_SITE: Record<string, string> = {
  AGUARDANDO_PAGAMENTO: "Aguardando pagamento",
  PAGO: "Pago",
  SEPARANDO: "Separando",
  ENVIADO: "Enviado",
  ENTREGUE: "Entregue",
  CANCELADO: "Cancelado",
  REEMBOLSADO: "Reembolsado",
};

const COR_ORIGEM: Record<string, string> = {
  "Chat do site": "bg-marca-suave text-marca",
  "Mercado Livre": "bg-[#fff3c4] text-[#7a5b00]",
  Shopee: "bg-[#ffe1d6] text-[#a6380f]",
  Magalu: "bg-[#dbeafe] text-[#1e4fa8]",
  Amazon: "bg-[#ffe9c7] text-[#8a4b00]",
  "Loja física": "bg-superficie-2 text-tinta-2",
  Site: "bg-bom-suave text-bom",
  Assistência: "bg-ouro/20 text-ouro-txt",
};

const AVATAR = ["bg-[#1FBFA9]", "bg-[#3b82f6]", "bg-[#8b5cf6]", "bg-[#f59e0b]", "bg-[#ef4444]", "bg-[#0ea5e9]", "bg-[#10b981]"];
const corAvatar = (s: string) => AVATAR[[...s].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR.length];
const iniciais = (n: string) =>
  n.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join("") || "?";

const fuso = { timeZone: "America/Sao_Paulo" } as const;
const quando = (d: Date) => {
  if (d.getTime() <= 0) return "";
  const hoje = new Date().toLocaleDateString("pt-BR", fuso);
  const dia = d.toLocaleDateString("pt-BR", fuso);
  if (dia === hoje) return d.toLocaleTimeString("pt-BR", { ...fuso, hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString("pt-BR", { ...fuso, day: "2-digit", month: "2-digit", year: "2-digit" });
};
const diaLongo = (d: Date) => d.toLocaleDateString("pt-BR", { ...fuso, day: "2-digit", month: "long", year: "numeric" });

function Avatar({ nome, grande }: { nome: string; grande?: boolean }) {
  return (
    <span className={`grid shrink-0 place-items-center rounded-full font-bold text-white ${corAvatar(nome)} ${grande ? "h-10 w-10 text-[14px]" : "h-9 w-9 text-[12.5px]"}`}>
      {iniciais(nome)}
    </span>
  );
}

function PillAssunto({ a }: { a: string }) {
  return (
    <span className={`rounded px-1.5 py-px text-[10.5px] font-extrabold uppercase tracking-wide ${a === "SAC" ? "bg-critico/10 text-critico" : "bg-bom-suave text-bom"}`}>
      {a}
    </span>
  );
}

function PillOrigem({ o }: { o: string }) {
  return <span className={`rounded px-1.5 py-px text-[10.5px] font-bold ${COR_ORIGEM[o] ?? "bg-superficie-2 text-tinta-2"}`}>{o}</span>;
}

export default async function Clientes({ searchParams }: { searchParams: Promise<Params> }) {
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const pessoas = await buscarClientes({ q, origem: sp.origem, etiqueta: sp.tag, assunto: sp.assunto });
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

  // Telefone que só existe no WhatsApp (não comprou nem abriu chamado).
  const fone = /[a-z@]/i.test(q) ? null : telefoneE164(q);
  const soWhats = fone && !pessoas.some((p) => telefoneE164(p.telefone) === fone);
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
          <h1 className="text-[17px] font-extrabold tracking-tight">Clientes e conversas</h1>
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
          <p className="mb-1 mt-3 text-[10.5px] font-bold uppercase tracking-wider text-tenue">Assunto</p>
          <div className="flex flex-wrap gap-1">
            {ASSUNTOS.map((a) => {
              const on = sp.assunto === a;
              return (
                <Link key={a} href={url({ assunto: on ? "" : a })} className={`rounded-full border px-2 py-0.5 text-[11.5px] font-semibold ${on ? "border-marca bg-marca text-white" : "border-linha-2 text-tinta-2 hover:border-marca"}`}>
                  {a === "SAC" ? "SAC (defeito, garantia, reclamação)" : "Vendas"}
                </Link>
              );
            })}
          </div>
          <p className="mb-1 mt-2.5 text-[10.5px] font-bold uppercase tracking-wider text-tenue">Canal</p>
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
          {soWhats && (
            <li>
              <Link href={url({ d: "", e: "", t: fone! })} className="flex items-center gap-3 border-b border-linha bg-marca-suave px-4 py-3">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-marca text-white"><MessageCircle className="h-4 w-4" /></span>
                <span className="min-w-0">
                  <span className="block text-[13.5px] font-bold text-marca">WhatsApp +{fone}</span>
                  <span className="block text-[11.5px] text-tinta-2">Sem compra nem chamado com este número</span>
                </span>
              </Link>
            </li>
          )}
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
                      {c.assuntos.map((a) => <PillAssunto key={a} a={a} />)}
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
          {pessoas.length === 0 && !soWhats && <li className="px-4 py-6 text-center text-[13px] text-mudo">Ninguém encontrado.</li>}
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
            <p className="text-[12.5px]">Pedidos, chamados e WhatsApp aparecem aqui, na ordem em que aconteceram.</p>
          </div>
        </section>
      )}
    </div>
  );
}

type Ficha = Awaited<ReturnType<typeof fichaCliente>>;

function StatusEnvio({ wa }: { wa: WhatsappFicha }) {
  const linhas = podeEnviar(wa);
  return (
    <div className="flex flex-wrap gap-1.5 border-b border-linha bg-superficie px-4 py-1.5">
      {linhas.map((x, i) => (
        <span key={i} className={`rounded px-2 py-0.5 text-[11.5px] font-semibold ${x.pode ? "bg-bom-suave text-bom" : "bg-superficie-2 text-tinta-2"}`}>
          {x.texto}
        </span>
      ))}
      {wa.erro && <span className="rounded bg-critico/10 px-2 py-0.5 text-[11.5px] font-semibold text-critico">Conversas indisponível agora</span>}
    </div>
  );
}

type Evento =
  | { tipo: "msg"; quando: Date; m: WhatsappFicha["mensagens"][number] }
  | { tipo: "vibrinha"; quando: Date; v: Ficha["vibrinha"][number] }
  | { tipo: "pedido"; quando: Date; p: PedidoFicha }
  | { tipo: "chamado"; quando: Date; c: Ficha["chamados"][number] };

/** WhatsApp, pedidos e chamados na mesma linha do tempo, como num chat. */
function Linha({ ficha }: { ficha: Ficha }) {
  const eventos: Evento[] = [
    ...ficha.whatsapp.mensagens.map((m) => ({ tipo: "msg" as const, quando: new Date(m.ordem_ts), m })),
    ...ficha.pedidos.map((p) => ({ tipo: "pedido" as const, quando: p.data, p })),
    ...ficha.chamados.map((c) => ({ tipo: "chamado" as const, quando: c.criadoEm, c })),
    ...ficha.vibrinha.map((v) => ({ tipo: "vibrinha" as const, quando: v.criadoEm, v })),
  ].sort((a, b) => a.quando.getTime() - b.quando.getTime());

  const blocos: React.ReactNode[] = [];
  let diaAnterior = "";
  eventos.forEach((ev, i) => {
    const dia = ev.quando.toLocaleDateString("pt-BR", fuso);
    if (dia !== diaAnterior) {
      diaAnterior = dia;
      blocos.push(
        <li key={`d${i}`} className="my-2 text-center">
          <span className="rounded-full bg-superficie px-3 py-0.5 text-[11px] font-semibold text-mudo shadow-sm">{diaLongo(ev.quando)}</span>
        </li>,
      );
    }
    if (ev.tipo === "msg") {
      const m = ev.m;
      const hora = ev.quando.toLocaleTimeString("pt-BR", { ...fuso, hour: "2-digit", minute: "2-digit" });
      if (m.direcao === "interna") {
        blocos.push(
          <li key={i} className="mx-auto max-w-[80%] rounded-lg border border-dashed border-ouro bg-ouro/10 px-3 py-1.5 text-[12px] text-ouro-txt">
            <p className="whitespace-pre-wrap break-words">{m.corpo}</p>
            <p className="mt-0.5 text-[10.5px] opacity-80">Nota · {m.autor ?? ""} · {m.numero} · {hora}</p>
          </li>,
        );
      } else {
        const nosso = m.direcao === "saida";
        blocos.push(
          <li key={i} className={`flex ${nosso ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[75%] rounded-xl px-3 py-1.5 text-[13px] shadow-sm ${nosso ? "rounded-tr-sm bg-marca-suave" : "rounded-tl-sm bg-superficie"}`}>
              <p className="whitespace-pre-wrap break-words">{m.corpo || `[${m.tipo}]`}</p>
              <p className="mt-0.5 text-right text-[10.5px] text-mudo">
                {nosso ? `${m.autor ?? "Nós"} · ` : ""}{m.numero} · {hora}
              </p>
            </div>
          </li>,
        );
      }
    } else if (ev.tipo === "vibrinha") {
      const v = ev.v;
      const hora = ev.quando.toLocaleTimeString("pt-BR", { ...fuso, hour: "2-digit", minute: "2-digit" });
      blocos.push(
        <li key={`vh${i}`} className="mx-auto my-1 flex w-full max-w-[460px] items-center gap-2 rounded-lg border border-marca/30 bg-marca-suave px-3 py-1.5 text-[12px]">
          <MessageCircle aria-hidden className="h-3.5 w-3.5 text-marca" />
          <span className="font-bold text-marca">Chat do site · Vibrinha</span>
          <PillAssunto a={v.assunto} />
          <span className="ml-auto text-mudo">{v.origem ? `saiu pelo ${v.origem} · ` : ""}{hora}</span>
        </li>,
      );
      v.mensagens.forEach((m, k) => {
        const nosso = m.de === "vibrinha";
        blocos.push(
          <li key={`v${i}-${k}`} className={`flex ${nosso ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[75%] rounded-xl px-3 py-1.5 text-[13px] shadow-sm ${nosso ? "rounded-tr-sm bg-marca-suave" : "rounded-tl-sm bg-superficie"}`}>
              <p className="whitespace-pre-wrap break-words">{m.texto}</p>
              {nosso && <p className="mt-0.5 text-right text-[10.5px] text-mudo">Vibrinha · chat do site</p>}
            </div>
          </li>,
        );
      });
    } else if (ev.tipo === "pedido") {
      const p = ev.p;
      blocos.push(
        <li key={i} className="mx-auto w-full max-w-[460px] rounded-lg border border-linha bg-superficie px-3 py-2 text-[12.5px]">
          <p className="flex items-center gap-2">
            <ShoppingBag aria-hidden className="h-3.5 w-3.5 text-marca" />
            <span className="font-bold">Pedido #{p.numero}</span>
            <span className="text-mudo">{p.canal}</span>
            <span className="num ml-auto font-bold">{brl(p.total)}</span>
          </p>
          <p className="mt-0.5 text-[11.5px] text-tinta-2">
            {STATUS_SITE[p.situacao] ?? p.situacao}
            {p.itens.length ? ` · ${p.itens.join(" · ")}` : ""}
          </p>
        </li>,
      );
    } else {
      const c = ev.c;
      blocos.push(
        <li key={i} className="mx-auto w-full max-w-[460px]">
          <Link href={`/admin/assistencia/chamados/${c.protocolo}`} className="flex items-center gap-2 rounded-lg border border-ouro/50 bg-ouro/10 px-3 py-2 text-[12.5px] hover:border-ouro">
            <Wrench aria-hidden className="h-3.5 w-3.5 text-ouro-txt" />
            <span className="font-bold">Chamado {c.protocolo}</span>
            <span className="text-tinta-2">{c.modelo ?? ""}</span>
            <span className="ml-auto"><SeloStatus s={c.status} /></span>
          </Link>
        </li>,
      );
    }
  });

  return (
    // flex-col-reverse: abre já no fim, no mais recente, como um chat.
    <div className="flex min-h-0 flex-1 flex-col-reverse overflow-y-auto px-4 py-3">
      <ol className="space-y-1.5">
        {blocos.length ? blocos : <li className="py-10 text-center text-[13px] text-mudo">Nada registrado ainda com este cliente.</li>}
      </ol>
    </div>
  );
}

function Dados({ ficha }: { ficha: Ficha }) {
  const titulo = "mb-1.5 mt-4 text-[10.5px] font-bold uppercase tracking-wider text-tenue first:mt-0";
  const totalBling = ficha.pedidos.reduce((s, p) => s + p.total, 0);
  const abertos = ficha.chamados.filter((c) => !["CONCLUIDO", "ENCERRADO", "NEGADO", "RECUSADO", "ORIENTADO_MARKETPLACE"].includes(c.status));
  return (
    <>
      <p className={titulo}>Contato</p>
      <dl className="space-y-1 text-[12.5px]">
        {ficha.documento && <div><dt className="inline text-mudo">CPF/CNPJ </dt><dd className="num inline font-semibold">{mascararDocumento(ficha.documento)}</dd></div>}
        {ficha.telefones.map((t) => <div key={t} className="num font-semibold">+{t}</div>)}
        {ficha.emails.map((e) => <div key={e} className="truncate font-semibold">{e}</div>)}
      </dl>

      <p className={titulo}>Resumo</p>
      <dl className="grid grid-cols-2 gap-2 text-center">
        <div className="rounded-lg bg-fundo p-2"><dd className="num text-[17px] font-extrabold text-marca">{ficha.pedidos.length}</dd><dt className="text-[10.5px] text-mudo">pedidos</dt></div>
        <div className="rounded-lg bg-fundo p-2"><dd className="num text-[14px] font-extrabold text-marca">{brl(totalBling)}</dd><dt className="text-[10.5px] text-mudo">em compras</dt></div>
      </dl>

      {abertos.length > 0 && (
        <>
          <p className={titulo}>Chamado aberto</p>
          {abertos.map((c) => (
            <Link key={c.protocolo} href={`/admin/assistencia/chamados/${c.protocolo}`} className="mb-1 flex items-center justify-between rounded-lg bg-ouro/10 px-2.5 py-1.5 text-[12px] font-bold text-ouro-txt">
              {c.protocolo} <span className="font-semibold">{ROTULO_STATUS[c.status].r}</span>
            </Link>
          ))}
        </>
      )}

      <p className={titulo}>Últimos pedidos</p>
      {ficha.pedidos.length === 0 ? (
        <p className="text-[12px] text-mudo">Nenhum{ficha.documento ? "" : " (sem CPF/CNPJ para achar no Bling)"}.</p>
      ) : (
        <ul className="space-y-1">
          {ficha.pedidos.slice(0, 8).map((p) => (
            <li key={`${p.origem}-${p.numero}`} className="flex items-center gap-2 text-[12px]">
              <span className="num font-mono font-bold">#{p.numero}</span>
              <span className="truncate text-mudo">{p.canal}</span>
              <span className="num ml-auto font-semibold">{brl(p.total)}</span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
