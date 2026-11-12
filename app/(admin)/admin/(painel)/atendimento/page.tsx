import Link from "next/link";
import { ArrowLeft, ClipboardList, ExternalLink, MessageCircle, MessageSquareText, Search, X } from "lucide-react";
import { abrirAtendimento, CANAIS_ATENDIMENTO, linkCliente, listarAtendimento, type ItemAtendimento } from "@/lib/atendimento";
import { Avatar, Dados, Linha, PillAssunto, quando, StatusEnvio, type Ficha } from "@/components/admin/ficha-cliente";
import { SeloStatus } from "@/components/assistencia/selo-status";
import { ROTULO_STATUS } from "@/lib/assistencia/portal";
import type { StatusChamado } from "@prisma/client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Atendimento" };

/**
 * Atendimento · caixa de entrada de quem falou com a Vibra Vert, no desenho do
 * Conversas. Separada de Clientes (quem comprou): aqui cada item é um contato,
 * com o canal (chat do site, formulário da assistência, WhatsApp) e o assunto
 * (Vendas ou SAC). Tudo pela URL: canal · assunto · q · ver = item aberto.
 */
type Params = { canal?: string; assunto?: string; q?: string; ver?: string };

const ICONE = { "Chat do site": MessageCircle, Formulário: ClipboardList, WhatsApp: MessageSquareText } as const;
const COR_CANAL = { "Chat do site": "text-marca", Formulário: "text-ouro-txt", WhatsApp: "text-[#128C4A]" } as const;

export default async function Atendimento({ searchParams }: { searchParams: Promise<Params> }) {
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const { itens, contagem, erroWhatsapp } = await listarAtendimento({ canal: sp.canal, assunto: sp.assunto, q });
  const aberto = sp.ver ? await abrirAtendimento(sp.ver) : null;
  const item = sp.ver ? itens.find((i) => i.chave === sp.ver) : undefined;
  const total = Object.values(contagem).reduce((a, b) => a + b, 0);

  const url = (m: Partial<Params>) => {
    const v = { ...sp, ...m };
    const p = new URLSearchParams();
    for (const k of ["canal", "assunto", "q", "ver"] as const) if (v[k]) p.set(k, v[k]!);
    return `/admin/atendimento${p.size ? `?${p}` : ""}`;
  };
  const aba = (on: boolean) =>
    `whitespace-nowrap border-b-2 px-2.5 pb-2 text-[12.5px] font-bold ${on ? "border-marca text-marca" : "border-transparent text-mudo hover:text-tinta"}`;
  const chip = (on: boolean) =>
    `rounded-full border px-2 py-0.5 text-[11.5px] font-semibold ${on ? "border-marca bg-marca text-white" : "border-linha-2 text-tinta-2 hover:border-marca"}`;

  return (
    <div className="flex h-[100dvh] min-h-0 bg-fundo">
      {/* ── caixa de entrada ──────────────────────────────────────── */}
      <aside className={`${sp.ver ? "hidden md:flex" : "flex"} w-full shrink-0 flex-col border-r border-linha bg-superficie md:w-[360px]`}>
        <div className="px-4 pt-4">
          <h1 className="text-[17px] font-extrabold tracking-tight">Atendimento</h1>
          <p className="text-[12px] text-mudo">Quem falou com a Vibra Vert. Compradores ficam em Clientes.</p>
          <form className="mt-2.5">
            {sp.canal && <input type="hidden" name="canal" value={sp.canal} />}
            {sp.assunto && <input type="hidden" name="assunto" value={sp.assunto} />}
            <label className="flex items-center gap-2 rounded-lg border border-linha-2 bg-fundo px-2.5 py-1.5 focus-within:border-marca">
              <Search aria-hidden className="h-4 w-4 text-mudo" />
              <input name="q" defaultValue={q} placeholder="Nome, telefone, protocolo ou o que escreveu" aria-label="Buscar no atendimento" className="w-full bg-transparent text-[13px] outline-none" />
              {q && (
                <Link href={url({ q: "" })} aria-label="Limpar busca" className="text-mudo hover:text-tinta"><X className="h-3.5 w-3.5" /></Link>
              )}
            </label>
          </form>
          <div className="mt-2 flex gap-1.5">
            <Link href={url({ assunto: "" })} className={chip(!sp.assunto)}>Tudo</Link>
            <Link href={url({ assunto: sp.assunto === "Vendas" ? "" : "Vendas" })} className={chip(sp.assunto === "Vendas")}>Vendas</Link>
            <Link href={url({ assunto: sp.assunto === "SAC" ? "" : "SAC" })} className={chip(sp.assunto === "SAC")}>SAC</Link>
          </div>
        </div>
        <nav className="mt-3 flex overflow-x-auto border-b border-linha px-2" aria-label="Canal">
          <Link href={url({ canal: "" })} className={aba(!sp.canal)}>Todos <span className="num font-semibold">{total}</span></Link>
          {CANAIS_ATENDIMENTO.map((c) => (
            <Link key={c} href={url({ canal: c })} className={aba(sp.canal === c)}>
              {c} <span className="num font-semibold">{contagem[c]}</span>
            </Link>
          ))}
        </nav>
        {erroWhatsapp && (!sp.canal || sp.canal === "WhatsApp") && (
          <p className="border-b border-linha bg-superficie-2 px-4 py-1.5 text-[11.5px] text-mudo">WhatsApp: {erroWhatsapp}</p>
        )}

        <ul className="min-h-0 flex-1 overflow-y-auto">
          {itens.map((i) => (
            <li key={i.chave}>
              <ItemLista i={i} sel={sp.ver === i.chave} href={url({ ver: i.chave })} />
            </li>
          ))}
          {itens.length === 0 && <li className="px-4 py-8 text-center text-[13px] text-mudo">Nada por aqui.</li>}
        </ul>
      </aside>

      {/* ── contato aberto ────────────────────────────────────────── */}
      {aberto ? (
        <>
          <section className="flex min-w-0 flex-1 flex-col">
            <Cabecalho aberto={aberto} item={item} voltar={url({ ver: "" })} />
            {aberto.ficha.telefones.length > 0 && <StatusEnvio wa={aberto.ficha.whatsapp} />}
            {aberto.tipo === "chamado" && <ResumoChamado c={aberto.chamado} />}
            <Linha ficha={soOContato(aberto)} />
          </section>
          <aside className="hidden w-[300px] shrink-0 overflow-y-auto border-l border-linha bg-superficie p-4 xl:block">
            {aberto.ficha.pedidos.length > 0 && (
              <Link
                href={linkCliente({ documento: aberto.ficha.documento, email: aberto.ficha.emails[0], telefone: aberto.ficha.telefones[0] })}
                className="mb-3 block rounded-lg bg-bom-suave px-3 py-2 text-center text-[12.5px] font-bold text-bom"
              >
                Também é cliente · ver compras
              </Link>
            )}
            <Dados ficha={aberto.ficha} />
          </aside>
        </>
      ) : (
        <section className="hidden flex-1 place-items-center md:grid">
          <div className="text-center text-mudo">
            <MessageCircle aria-hidden className="mx-auto h-10 w-10 text-tenue" strokeWidth={1.5} />
            <p className="mt-2 text-[14px] font-semibold">Escolha um atendimento na lista</p>
            <p className="text-[12.5px]">Chat do site, formulário da assistência e WhatsApp, cada um com o seu assunto.</p>
          </div>
        </section>
      )}
    </div>
  );
}

function ItemLista({ i, sel, href }: { i: ItemAtendimento; sel: boolean; href: string }) {
  const Icone = ICONE[i.canal];
  return (
    <Link href={href} aria-current={sel ? "true" : undefined} className={`flex gap-3 border-b border-linha px-4 py-2.5 ${sel ? "bg-marca-suave" : "hover:bg-fundo"}`}>
      <span className="relative">
        <Avatar nome={i.nome} />
        <span className={`absolute -bottom-1 -right-1 grid h-5 w-5 place-items-center rounded-full border border-linha bg-superficie ${COR_CANAL[i.canal]}`}>
          <Icone aria-hidden className="h-3 w-3" />
        </span>
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline gap-2">
          <span className="truncate text-[13.5px] font-semibold">{i.nome}</span>
          <span className="num ml-auto shrink-0 text-[11px] text-mudo">{quando(i.quando)}</span>
        </span>
        <span className="mt-0.5 block truncate text-[12px] text-tinta-2">{i.previa}</span>
        <span className="mt-1 flex items-center gap-1.5">
          <PillAssunto a={i.assunto} />
          <span className="text-[10.5px] font-semibold text-mudo">{i.canal}</span>
          {i.canal === "Formulário" && i.status && <span className="text-[10.5px] text-mudo">· {ROTULO_STATUS[i.status as StatusChamado]?.r ?? i.status}</span>}
          {i.aguardando && i.canal === "WhatsApp" && <span className="ml-auto rounded-full bg-critico px-1.5 text-[10px] font-bold text-white">responder</span>}
        </span>
      </span>
    </Link>
  );
}

type Aberto = NonNullable<Awaited<ReturnType<typeof abrirAtendimento>>>;

function Cabecalho({ aberto, item, voltar }: { aberto: Aberto; item?: ItemAtendimento; voltar: string }) {
  const canal = aberto.tipo === "chat" ? "Chat do site" : aberto.tipo === "chamado" ? "Formulário" : "WhatsApp";
  const Icone = ICONE[canal];
  const nome = aberto.tipo === "chat" ? (aberto.chat.nome ?? aberto.ficha.nome) : aberto.ficha.nome;
  const assunto = item?.assunto ?? (aberto.tipo === "chat" ? aberto.chat.assunto : aberto.tipo === "chamado" ? "SAC" : "SAC");
  const linkConversas = aberto.tipo === "whatsapp" ? aberto.whatsapp.link : aberto.ficha.whatsapp.conversas[0]?.link;
  return (
    <header className="flex items-center gap-3 border-b border-linha bg-superficie px-4 py-2.5">
      <Link href={voltar} className="md:hidden" aria-label="Voltar para a lista"><ArrowLeft className="h-5 w-5" /></Link>
      <Avatar nome={nome} grande />
      <div className="min-w-0">
        <p className="flex items-center gap-1.5 truncate text-[15px] font-extrabold">
          {nome} <PillAssunto a={assunto} />
        </p>
        <p className={`flex items-center gap-1 text-[12px] font-semibold ${COR_CANAL[canal]}`}>
          <Icone aria-hidden className="h-3.5 w-3.5" /> {canal}
          <span className="num font-normal text-mudo">
            {" · "}
            {[...aberto.ficha.telefones.map((t) => `+${t}`), ...aberto.ficha.emails].join(" · ") || "não deixou contato"}
          </span>
        </p>
      </div>
      <div className="ml-auto flex shrink-0 gap-2">
        {aberto.tipo === "chamado" && (
          <Link href={`/admin/assistencia/chamados/${aberto.chamado.protocolo}`} className="inline-flex items-center gap-1.5 rounded-lg border-[1.5px] border-marca px-3 py-1.5 text-[12.5px] font-bold text-marca">
            Abrir chamado
          </Link>
        )}
        {linkConversas && (
          <a href={linkConversas} target="_blank" rel="noopener" className="inline-flex items-center gap-1.5 rounded-lg bg-marca px-3 py-1.5 text-[12.5px] font-bold text-white">
            <ExternalLink className="h-3.5 w-3.5" /> Responder no Conversas
          </a>
        )}
      </div>
    </header>
  );
}

function ResumoChamado({ c }: { c: Extract<Aberto, { tipo: "chamado" }>["chamado"] }) {
  return (
    <div className="border-b border-linha bg-superficie px-4 py-2.5 text-[12.5px]">
      <p className="flex flex-wrap items-center gap-2">
        <span className="num font-mono font-bold">{c.protocolo}</span>
        <SeloStatus s={c.status} />
        <span className="text-tinta-2">{[c.modelo, c.tensao && `${c.tensao}V`, c.canal].filter(Boolean).join(" · ")}</span>
      </p>
      <p className="mt-1 line-clamp-2 text-tinta-2">{c.ocorrido}</p>
    </div>
  );
}

/**
 * No atendimento, a linha do tempo mostra só o contato: a conversa do chat, ou
 * o chamado com o WhatsApp dele. As compras ficam no painel ao lado e em Clientes.
 */
function soOContato(a: Aberto): Ficha {
  const f = a.ficha;
  if (a.tipo === "chat") return { ...f, pedidos: [], chamados: [], vibrinha: f.vibrinha.filter((v) => v.id === a.chat.id), whatsapp: { ...f.whatsapp, mensagens: [] } };
  if (a.tipo === "chamado") return { ...f, pedidos: [], vibrinha: [], chamados: f.chamados.filter((c) => c.protocolo === a.chamado.protocolo) };
  return { ...f, pedidos: [], chamados: [], vibrinha: [] };
}
