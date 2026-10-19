import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SeloStatus } from "@/components/assistencia/selo-status";
import { FormCompraManual, FormDecisao } from "@/components/assistencia/portal-forms";
import { ROTULO_ESPACO, ESPACOS_FOTO, type EspacoFoto } from "@/lib/assistencia/esquemas";
import { ROTULO_FAIXA, mascararDocumento, type ConteudoLaudo } from "@/lib/assistencia/laudo";
import { ROTULO_SUGESTAO } from "@/lib/assistencia/portal";
import { urlAssinada } from "@/lib/assistencia/storage";
import { ROTULO_ITEM, type ItemListaFechada } from "@/lib/regras/lista-fechada";
import { decomporChave } from "@/lib/regras/nf";
import { NOME_MODELO, type Faixa, type Modelo } from "@/lib/regras/tipos";
import { PENDENCIAS } from "@/lib/regras/pendencias";

export const dynamic = "force-dynamic";
export const metadata = { title: "Assistência · Ficha do chamado" };

const RESULTADO_COR: Record<string, string> = {
  encontrado: "bg-critico/10 text-critico",
  inconclusivo: "bg-atencao/10 text-atencao",
  nao_encontrado: "bg-bom-suave text-bom",
};

export default async function Ficha({ params }: { params: Promise<{ protocolo: string }> }) {
  const { protocolo } = await params;
  const c = await prisma.chamado.findUnique({
    where: { protocolo },
    include: {
      respostas: { orderBy: { ordem: "asc" } },
      fotos: { orderBy: { criadoEm: "desc" } },
      avaliacoes: { orderBy: { criadoEm: "asc" } },
      decisoes: { orderBy: { criadoEm: "asc" }, include: { usuario: { select: { nome: true } } } },
      laudos: { orderBy: { criadoEm: "desc" } },
    },
  });
  if (!c) notFound();

  // Fotos: só por URL assinada de poucos minutos.
  const fotos = await Promise.all(
    ESPACOS_FOTO.map(async (e) => {
      const f = c.fotos.find((x) => x.espaco === e && !x.caminho.startsWith("tmp/"));
      return { e, url: f ? await urlAssinada(f.caminhoReduzido).catch(() => null) : null };
    }),
  );
  const ultima = c.decisoes.filter((d) => d.autor !== "pessoa").at(-1);
  const det = (ultima?.detalhes ?? {}) as { motivos?: string[]; acao?: string };
  const sinais = c.avaliacoes.filter((a) => a.categoria === "sinal");
  const lista = c.avaliacoes.filter((a) => a.categoria === "lista_fechada").slice(-4);
  const rascunho = c.laudos[0]?.conteudo as unknown as ConteudoLaudo | undefined;
  const chave = c.nfChave ? decomporChave(c.nfChave) : null;
  const caixa = "rounded-caixa border border-linha bg-superficie p-4";

  return (
    <div className="p-6">
      <Link href="/admin/assistencia/fila" className="text-[12.5px] font-bold text-marca">← Fila</Link>
      <div className="mt-1 flex flex-wrap items-center gap-3">
        <h1 className="num font-mono text-xl font-extrabold">{c.protocolo}</h1>
        <SeloStatus s={c.status} />
        <span className="text-[13px] text-mudo">{ROTULO_FAIXA[c.faixa as Faixa] ?? c.faixa}</span>
        {c.controleLegado && <span className="text-[12px] text-mudo">planilha: {c.controleLegado}</span>}
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          {ultima && (
            <section className={caixa}>
              <h2 className="text-[13px] font-extrabold uppercase tracking-wide text-mudo">Sugestão do motor</h2>
              <p className="mt-1 text-[17px] font-extrabold">{ROTULO_SUGESTAO[ultima.sugestao ?? ""] ?? ultima.sugestao}</p>
              <ul className="mt-1 list-disc pl-5 text-[13px] text-tinta-2">
                {(det.motivos ?? []).map((m) => <li key={m}>{m}</li>)}
                {ultima.nota && <li>{ultima.nota}</li>}
              </ul>
              {c.pendenciaRegra && (
                <p className="mt-2 rounded-lg bg-atencao/10 px-3 py-2 text-[12.5px] text-atencao">
                  Regra não definida: {(PENDENCIAS as Record<string, string>)[c.pendenciaRegra] ?? c.pendenciaRegra}
                </p>
              )}
            </section>
          )}

          <section className={caixa}>
            <h2 className="text-[13px] font-extrabold uppercase tracking-wide text-mudo">Fotos</h2>
            <ul className="mt-2 grid grid-cols-3 gap-2">
              {fotos.map(({ e, url }) => {
                const marcada = lista.some((l) => l.fotoRef === e && l.resultado !== "nao_encontrado");
                return (
                  <li key={e} className={`overflow-hidden rounded-lg border-2 ${marcada ? "border-critico" : "border-linha"}`}>
                    {url ? (
                      <a href={url} target="_blank" rel="noopener">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt={ROTULO_ESPACO[e as EspacoFoto].t} className="aspect-square w-full object-cover" />
                      </a>
                    ) : (
                      <span className="flex aspect-square items-center justify-center bg-superficie-2 text-[12px] text-mudo">sem foto</span>
                    )}
                    <span className="block px-2 py-1 text-[11.5px] font-bold">{ROTULO_ESPACO[e as EspacoFoto].t}</span>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className={caixa}>
            <h2 className="text-[13px] font-extrabold uppercase tracking-wide text-mudo">Lista fechada (Claude)</h2>
            {lista.length === 0 ? (
              <p className="mt-1 text-[13px] text-mudo">Não analisada.</p>
            ) : (
              <ul className="mt-2 space-y-1 text-[13px]">
                {lista.map((l) => (
                  <li key={l.id} className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-extrabold ${RESULTADO_COR[l.resultado]}`}>{l.resultado.replace("_", " ")}</span>
                    {ROTULO_ITEM[l.codigo as ItemListaFechada] ?? l.codigo}
                    {l.fotoRef && <span className="text-mudo">· foto {l.fotoRef}</span>}
                    {l.motivoInconclusivo && <span className="text-atencao">· {l.motivoInconclusivo}</span>}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className={caixa}>
            <h2 className="text-[13px] font-extrabold uppercase tracking-wide text-mudo">Triagem das respostas</h2>
            <ul className="mt-2 space-y-1 text-[13px]">
              {sinais.length === 0 && <li className="text-bom">Verde: tudo dentro do manual.</li>}
              {sinais.map((s) => (
                <li key={s.id} className={s.resultado === "vermelho" ? "font-semibold text-critico" : "text-atencao"}>
                  ● {s.texto}
                </li>
              ))}
            </ul>
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-[12.5px]">
              {c.respostas.map((r) => (
                <div key={r.id} className="contents">
                  <dt className="text-mudo">{r.pergunta}</dt>
                  <dd className="font-semibold">{r.texto}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 whitespace-pre-wrap rounded-lg bg-superficie-2 p-3 text-[13px]">{c.ocorrido}</p>
          </section>
        </div>

        <div className="space-y-4">
          {c.status === "EM_ANALISE" && (
            <section className={`${caixa} border-marca`}>
              <h2 className="mb-2 text-[13px] font-extrabold uppercase tracking-wide text-mudo">Decidir</h2>
              {c.faixa === "indefinida" ? (
                <>
                  <p className="mb-2 text-[13px] text-tinta-2">Faixa não confirmada. Informe a data de emissão e o canal; o chamado é reanalisado.</p>
                  <FormCompraManual protocolo={c.protocolo} />
                </>
              ) : (
                <FormDecisao protocolo={c.protocolo} sugestao={ultima?.sugestao ?? null} troca={c.faixa === "troca_expressa"} />
              )}
            </section>
          )}

          <section className={caixa}>
            <h2 className="text-[13px] font-extrabold uppercase tracking-wide text-mudo">Cliente e compra</h2>
            <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[13px]">
              <dt className="text-mudo">Nome</dt><dd>{c.nome}</dd>
              <dt className="text-mudo">CPF/CNPJ</dt><dd className="num">{mascararDocumento(c.documento)}</dd>
              <dt className="text-mudo">WhatsApp</dt><dd className="num">{c.telefone}</dd>
              <dt className="text-mudo">E-mail</dt><dd>{c.email}</dd>
              <dt className="text-mudo">Canal</dt><dd>{c.canal} {c.canalConfirmado ? "· confirmado" : "· declarado"}</dd>
              <dt className="text-mudo">NF</dt><dd className="num">{c.nfTexto}</dd>
              {chave && (<><dt className="text-mudo">Chave</dt><dd className="num text-[12px]">{`${chave.mes}/${chave.ano} · série ${chave.serie} · nº ${chave.numero} · emitente ${chave.cnpjEmitente}${chave.propria ? " (própria)" : ""}`}</dd></>)}
              <dt className="text-mudo">Emissão</dt><dd>{c.emissao ? c.emissao.toISOString().slice(0, 10).split("-").reverse().join("/") : "não confirmada"} {c.emissaoFonte ? `· ${c.emissaoFonte}` : ""}</dd>
              {c.blingPedido && (<><dt className="text-mudo">Bling</dt><dd>Pedido {c.blingPedido}</dd></>)}
              <dt className="text-mudo">Recebeu em</dt><dd>{c.recebimento?.toISOString().slice(0, 10).split("-").reverse().join("/")}</dd>
              <dt className="text-mudo">Modelo</dt><dd>{c.modelo ? `${NOME_MODELO[c.modelo as Modelo]} · ${c.tensao}V` : "—"} {c.serie ? `· série ${c.serie}` : ""}</dd>
            </dl>
          </section>

          {rascunho && (
            <section className={caixa}>
              <h2 className="text-[13px] font-extrabold uppercase tracking-wide text-mudo">
                Laudo {c.laudos[0].liberado ? "liberado" : "· rascunho da Claude"} (v{c.laudos[0].versao})
              </h2>
              <p className="mt-1 text-[13px] font-bold">{rascunho.titulo}</p>
              <p className="mt-1 text-[13px] text-tinta-2">{rascunho.fundamentacao}</p>
              <p className="mt-1 text-[13px] text-tinta-2">{rascunho.conclusao}</p>
            </section>
          )}

          <section className={caixa}>
            <h2 className="text-[13px] font-extrabold uppercase tracking-wide text-mudo">Histórico (imutável)</h2>
            <ol className="mt-2 space-y-2 text-[12.5px]">
              {c.decisoes.map((d) => (
                <li key={d.id} className="border-l-2 border-linha pl-2.5">
                  <span className="num text-mudo">{d.criadoEm.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}</span>{" "}
                  <span className="font-bold">{d.autor === "pessoa" ? (d.usuario?.nome ?? "pessoa") : d.autor === "claude" ? "Claude" : "Motor"}</span>
                  {d.sugestao && <> · sugeriu {ROTULO_SUGESTAO[d.sugestao] ?? d.sugestao}</>}
                  {d.decisaoFinal && <> · decidiu <strong>{ROTULO_SUGESTAO[d.decisaoFinal] ?? d.decisaoFinal}</strong></>}
                  {d.conferiuFotos && <> · conferiu as fotos</>}
                  {d.motivoAlteracao && <span className="block text-tinta-2">Motivo: {d.motivoAlteracao}</span>}
                  {d.nota && <span className="block text-tinta-2">{d.nota}</span>}
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>
    </div>
  );
}
