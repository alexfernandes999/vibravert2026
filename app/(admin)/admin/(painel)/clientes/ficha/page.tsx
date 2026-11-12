import Link from "next/link";
import { notFound } from "next/navigation";
import { fichaCliente, podeEnviar } from "@/lib/clientes";
import { mascararDocumento } from "@/lib/assistencia/laudo";
import { SeloStatus } from "@/components/assistencia/selo-status";
import { brl } from "@/lib/formato";

export const dynamic = "force-dynamic";
export const metadata = { title: "Ficha do cliente" };

const STATUS_SITE: Record<string, string> = {
  AGUARDANDO_PAGAMENTO: "Aguardando pagamento",
  PAGO: "Pago",
  SEPARANDO: "Separando",
  ENVIADO: "Enviado",
  ENTREGUE: "Entregue",
  CANCELADO: "Cancelado",
  REEMBOLSADO: "Reembolsado",
};

const dataBR = (d: Date | string, hora = false) =>
  new Date(d).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    ...(hora ? { hour: "2-digit", minute: "2-digit" } : {}),
  });

const caixa = "rounded-caixa border border-linha bg-superficie p-5";
const titulo = "text-[13px] font-extrabold uppercase tracking-wide text-mudo";

export default async function Ficha({ searchParams }: { searchParams: Promise<{ d?: string; e?: string; t?: string }> }) {
  const id = await searchParams;
  if (!id.d && !id.e && !id.t) notFound();
  const f = await fichaCliente(id);
  const envio = podeEnviar(f.whatsapp);
  const wa = f.whatsapp;

  return (
    <div className="p-6">
      <Link href="/admin/clientes" className="text-[12.5px] font-bold text-marca">← Clientes</Link>
      <h1 className="mt-1 text-xl font-extrabold tracking-tight">{f.nome}</h1>
      <p className="num mt-1 text-[13px] text-tinta-2">
        {[f.documento && mascararDocumento(f.documento), ...f.telefones.map((t) => `+${t}`), ...f.emails].filter(Boolean).join(" · ")}
      </p>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_380px]">
        <div className="space-y-4">
          {/* ── pedidos ─────────────────────────────────────────── */}
          <section className={caixa}>
            <h2 className={titulo}>Pedidos · {f.pedidos.length}</h2>
            {f.pedidos.length === 0 ? (
              <p className="mt-2 text-[13px] text-mudo">Nenhum pedido encontrado no site nem no Bling{f.documento ? "" : " (sem CPF/CNPJ para buscar no Bling)"}.</p>
            ) : (
              <ul className="mt-2 divide-y divide-linha">
                {f.pedidos.map((p) => (
                  <li key={`${p.origem}-${p.numero}`} className="py-2.5 text-[13px]">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="num font-mono font-bold">#{p.numero}</span>
                      <span className="rounded-full bg-superficie-2 px-2 py-0.5 text-[11.5px] font-bold">{p.canal}</span>
                      <span className="text-tinta-2">{STATUS_SITE[p.situacao] ?? p.situacao}</span>
                      <span className="num ml-auto font-bold">{brl(p.total)}</span>
                      <span className="num w-[70px] text-right text-mudo">{dataBR(p.data)}</span>
                    </div>
                    {p.itens.length > 0 && <p className="mt-0.5 text-[12.5px] text-mudo">{p.itens.join(" · ")}</p>}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* ── chamados ────────────────────────────────────────── */}
          <section className={caixa}>
            <h2 className={titulo}>Assistência técnica · {f.chamados.length}</h2>
            {f.chamados.length === 0 ? (
              <p className="mt-2 text-[13px] text-mudo">Nenhum chamado.</p>
            ) : (
              <ul className="mt-2 divide-y divide-linha">
                {f.chamados.map((c) => (
                  <li key={c.protocolo}>
                    <Link href={`/admin/assistencia/chamados/${c.protocolo}`} className="flex flex-wrap items-center gap-3 py-2.5 text-[13px] hover:text-marca">
                      <span className="num font-mono font-bold">{c.protocolo}</span>
                      <SeloStatus s={c.status} />
                      <span className="text-tinta-2">{c.modelo ?? ""}</span>
                      <span className="num ml-auto text-mudo">{dataBR(c.criadoEm)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* ── WhatsApp ───────────────────────────────────────────── */}
        <section className={`${caixa} lg:sticky lg:top-4 lg:self-start`}>
          <h2 className={titulo}>WhatsApp</h2>
          <ul className="mt-2 space-y-1.5">
            {envio.map((x, i) => (
              <li key={i} className={`rounded-lg px-3 py-2 text-[12.5px] font-semibold ${x.pode ? "bg-bom-suave text-bom" : "bg-superficie-2 text-tinta-2"}`}>
                {x.texto}
              </li>
            ))}
          </ul>
          {wa.erro && <p className="mt-2 text-[12.5px] font-semibold text-critico">Não deu para ler o Conversas agora: {wa.erro}</p>}
          {wa.conversas.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {[...new Map(wa.conversas.map((c) => [c.numero, c])).values()].map((c) => (
                <a key={c.id} href={c.link} target="_blank" rel="noopener" className="rounded-lg border-[1.5px] border-marca px-3 py-1.5 text-[12.5px] font-bold text-marca">
                  Abrir no Conversas · {c.numero}
                </a>
              ))}
            </div>
          )}
          {wa.mensagens.length > 0 ? (
            <ol className="mt-4 max-h-[60vh] space-y-2 overflow-y-auto pr-1">
              {wa.mensagens.map((m, i) => (
                <li
                  key={i}
                  className={`max-w-[88%] rounded-lg px-3 py-2 text-[12.5px] ${
                    m.direcao === "entrada"
                      ? "bg-superficie-2"
                      : m.direcao === "interna"
                        ? "mx-auto border border-dashed border-ouro bg-ouro/10 text-ouro-txt"
                        : "ml-auto bg-marca-suave"
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{m.corpo || `[${m.tipo}]`}</p>
                  <p className="mt-1 text-[10.5px] text-mudo">
                    {m.direcao === "entrada" ? "Cliente" : m.direcao === "interna" ? `Nota · ${m.autor ?? ""}` : m.autor ?? "Nós"} · {m.numero} · {dataBR(m.ordem_ts, true)}
                  </p>
                </li>
              ))}
            </ol>
          ) : (
            wa.configurado && !wa.erro && <p className="mt-3 text-[13px] text-mudo">Nenhuma mensagem no WhatsApp com {f.telefones.length ? "este número" : "este cliente (sem telefone cadastrado)"}.</p>
          )}
        </section>
      </div>
    </div>
  );
}
