import Link from "next/link";
import { MessageCircle, ShoppingBag, Wrench } from "lucide-react";
import { fichaCliente, podeEnviar, type PedidoFicha, type WhatsappFicha } from "@/lib/clientes";
import { mascararDocumento } from "@/lib/assistencia/laudo";
import { SeloStatus } from "@/components/assistencia/selo-status";
import { ROTULO_STATUS } from "@/lib/assistencia/portal";
import { brl } from "@/lib/formato";

/**
 * Peças da ficha da pessoa, no desenho do Conversas: avatar, selos de assunto
 * e canal, a linha do tempo em formato de chat e o painel de dados. Usadas em
 * Clientes e em Atendimento, para as duas telas falarem a mesma língua.
 */

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

export const fuso = { timeZone: "America/Sao_Paulo" } as const;
export const quando = (d: Date) => {
  if (d.getTime() <= 0) return "";
  const hoje = new Date().toLocaleDateString("pt-BR", fuso);
  const dia = d.toLocaleDateString("pt-BR", fuso);
  if (dia === hoje) return d.toLocaleTimeString("pt-BR", { ...fuso, hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString("pt-BR", { ...fuso, day: "2-digit", month: "2-digit", year: "2-digit" });
};
const diaLongo = (d: Date) => d.toLocaleDateString("pt-BR", { ...fuso, day: "2-digit", month: "long", year: "numeric" });

export function Avatar({ nome, grande }: { nome: string; grande?: boolean }) {
  return (
    <span className={`grid shrink-0 place-items-center rounded-full font-bold text-white ${corAvatar(nome)} ${grande ? "h-10 w-10 text-[14px]" : "h-9 w-9 text-[12.5px]"}`}>
      {iniciais(nome)}
    </span>
  );
}

export function PillAssunto({ a }: { a: string }) {
  return (
    <span className={`rounded px-1.5 py-px text-[10.5px] font-extrabold uppercase tracking-wide ${a === "SAC" ? "bg-critico/10 text-critico" : "bg-bom-suave text-bom"}`}>
      {a}
    </span>
  );
}

export function PillOrigem({ o }: { o: string }) {
  return <span className={`rounded px-1.5 py-px text-[10.5px] font-bold ${COR_ORIGEM[o] ?? "bg-superficie-2 text-tinta-2"}`}>{o}</span>;
}


export type Ficha = Awaited<ReturnType<typeof fichaCliente>>;

export function StatusEnvio({ wa }: { wa: WhatsappFicha }) {
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
export function Linha({ ficha }: { ficha: Ficha }) {
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

export function Dados({ ficha }: { ficha: Ficha }) {
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
