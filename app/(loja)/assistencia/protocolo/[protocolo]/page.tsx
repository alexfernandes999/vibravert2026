import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { chaveValida } from "@/lib/assistencia/acesso";
import type { ConteudoLaudo } from "@/lib/assistencia/laudo";
import { ESPACOS_FOTO, type EspacoFoto } from "@/lib/assistencia/esquemas";
import { RE_PROTOCOLO } from "@/lib/assistencia/protocolo";
import { whatsappLink, WHATSAPP_BONITO, SAC_EMAIL } from "@/lib/contato";
import {
  AtualizarEnquantoAnalisa,
  CopiarProtocolo,
  FormRastreio,
  ReenviarFotos,
} from "@/components/assistencia/protocolo-cliente";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Seu chamado", robots: { index: false, follow: false } };

const ENDERECO = "Vibra Vert · Assistência Técnica · Rua Charles Darwin, 707 · Vila Santa Catarina · São Paulo/SP · CEP 04379-074";

type Props = { params: Promise<{ protocolo: string }>; searchParams: Promise<{ k?: string }> };

export default async function Protocolo({ params, searchParams }: Props) {
  const { protocolo } = await params;
  const { k } = await searchParams;
  if (!RE_PROTOCOLO.test(protocolo) || !chaveValida(protocolo, k)) notFound();

  const c = await prisma.chamado.findUnique({
    where: { protocolo },
    include: {
      laudos: { where: { liberado: true }, orderBy: { criadoEm: "desc" }, take: 1 },
      decisoes: { orderBy: { criadoEm: "desc" }, take: 1 },
      fotos: { select: { espaco: true, caminho: true } },
    },
  });
  if (!c) notFound();

  const laudo = c.laudos[0];
  const conteudo = laudo?.conteudo as unknown as ConteudoLaudo | undefined;
  const linkPdf = laudo ? `/assistencia/protocolo/${protocolo}/laudo?k=${k}` : null;
  const ultima = c.decisoes[0]?.detalhes as { faltando?: string[] } | null;
  const fotosOk = new Set(c.fotos.filter((f) => !f.caminho.startsWith("tmp/")).map((f) => f.espaco));
  const faltam = ESPACOS_FOTO.filter((e) => !fotosOk.has(e)) as EspacoFoto[];
  const zap = (t: string) => whatsappLink(`Protocolo ${protocolo}: ${t}`);

  const BotaoPdf = () =>
    linkPdf ? (
      <a href={linkPdf} className="inline-flex rounded-lg bg-marca px-5 py-3 text-[14px] font-bold text-white">
        Baixar laudo (PDF)
      </a>
    ) : null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-5">
      {c.status === "ANALISANDO" && <AtualizarEnquantoAnalisa />}

      <section className="rounded-caixa bg-marca-escuro p-6 text-white">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-ouro">Seu protocolo</p>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <p className="num font-mono text-3xl font-extrabold tracking-tight">{protocolo}</p>
          <CopiarProtocolo protocolo={protocolo} />
        </div>
        <p className="mt-3 rounded-lg bg-white/10 px-3 py-2 text-[13.5px] font-semibold">
          Anote o número. É com ele que você acompanha o chamado e identifica a bomba se precisar enviá-la.
        </p>
      </section>

      <section className="mt-6 rounded-caixa border border-linha bg-superficie p-6" aria-live="polite">
        {c.status === "ANALISANDO" && (
          <>
            <h1 className="text-xl font-extrabold">Analisando o seu chamado</h1>
            <p className="mt-2 text-[15px] text-tinta-2">Isso leva alguns segundos. Esta página se atualiza sozinha.</p>
          </>
        )}

        {c.status === "EM_ANALISE" && (
          <>
            <h1 className="text-xl font-extrabold">Em análise pela equipe</h1>
            <p className="mt-2 text-[15px] text-tinta-2">
              O seu caso está com a nossa equipe. O resultado sai em até 1 dia útil e você recebe o aviso por WhatsApp e e-mail.
            </p>
          </>
        )}

        {c.status === "PENDENTE_INFORMACAO" && (
          <>
            <h1 className="text-xl font-extrabold">Falta {faltam.length === 1 ? "uma foto" : "algumas fotos"}</h1>
            <p className="mt-2 mb-4 text-[15px] text-tinta-2">
              Sem as 6 fotos não conseguimos analisar. Envie {faltam.length === 1 ? "a que falta" : "as que faltam"} aqui mesmo.
              {ultima?.faltando?.length ? ` (${ultima.faltando.join(", ")})` : ""}
            </p>
            <ReenviarFotos protocolo={protocolo} chave={k!} espacos={faltam.length ? faltam : [...ESPACOS_FOTO]} />
            <p className="mt-3 text-[12.5px] text-mudo">Sem resposta em 15 dias, o chamado é encerrado.</p>
          </>
        )}

        {c.status === "AGUARDANDO_ENVIO" && conteudo && (
          <>
            <h1 className="text-xl font-extrabold">{conteudo.titulo}</h1>
            <p className="mt-2 text-[15px] text-tinta-2">{conteudo.resultado}</p>
            <div className="mt-4"><BotaoPdf /></div>
            {c.faixa === "troca_expressa" ? (
              <div className="mt-5 text-[14.5px] text-tinta-2">
                <h2 className="font-extrabold text-tinta">Como enviar</h2>
                <p className="mt-1">
                  Você recebe o código de postagem da logística reversa em até 1 dia útil, por WhatsApp e e-mail. O frete de
                  ida é por nossa conta. Não precisa imprimir nada: a etiqueta já identifica o chamado.
                </p>
              </div>
            ) : (
              <div className="mt-5 text-[14.5px] text-tinta-2">
                <h2 className="font-extrabold text-tinta">Como enviar</h2>
                <p className="mt-1">{conteudo.frete}</p>
                <p className="mt-2 font-semibold">{ENDERECO}</p>
                <ul className="mt-2 list-disc pl-5">
                  <li>Escreva o protocolo <span className="num font-mono font-bold">{protocolo}</span> na caixa. Não precisa imprimir nada.</li>
                  <li>Envie a bomba seca, com o cabo enrolado e protegida.</li>
                  <li>Imprima o laudo só se puder; ele não é obrigatório.</li>
                </ul>
                <div className="mt-5"><FormRastreio protocolo={protocolo} chave={k!} /></div>
              </div>
            )}
          </>
        )}

        {c.status === "A_CAMINHO" && (
          <>
            <h1 className="text-xl font-extrabold">Bomba a caminho</h1>
            <p className="mt-2 text-[15px] text-tinta-2">
              Rastreio <span className="num font-mono font-bold">{c.rastreio}</span>. Quando chegar, o técnico avalia em até 48 horas.
            </p>
          </>
        )}

        {c.status === "NA_BANCADA" && (
          <>
            <h1 className="text-xl font-extrabold">Na bancada</h1>
            <p className="mt-2 text-[15px] text-tinta-2">A bomba chegou. O técnico avalia em até 48 horas e você recebe o laudo aqui.</p>
          </>
        )}

        {(c.status === "NEGADO" || c.status === "RECUSADO") && conteudo && (
          <>
            <h1 className="text-xl font-extrabold text-critico">{conteudo.titulo}</h1>
            <p className="mt-2 text-[15px] text-tinta-2">{conteudo.fundamentacao}</p>
            <p className="mt-3 text-[14.5px] font-semibold">{conteudo.frase}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <BotaoPdf />
              <a href={zap("quero a análise física da bomba.")} target="_blank" rel="noopener" className="rounded-lg border-[1.5px] border-marca px-5 py-3 text-[14px] font-bold text-marca">
                Quero a análise física
              </a>
              <a href={zap("quero o conserto pelo custo.")} target="_blank" rel="noopener" className="rounded-lg border-[1.5px] border-marca px-5 py-3 text-[14px] font-bold text-marca">
                Quero o conserto pelo custo
              </a>
            </div>
          </>
        )}

        {c.status === "ARREPENDIMENTO" && (
          <>
            <h1 className="text-xl font-extrabold">Devolução por arrependimento registrada</h1>
            <p className="mt-2 text-[15px] text-tinta-2">
              Você recebe o código de postagem em até 1 dia útil, por WhatsApp e e-mail. O frete é por nossa conta e o valor é
              estornado integralmente quando a bomba chegar, com a embalagem e os acessórios.
            </p>
          </>
        )}

        {c.status === "ORIENTADO_MARKETPLACE" && (
          <>
            <h1 className="text-xl font-extrabold">Devolução pelo marketplace</h1>
            <p className="mt-2 text-[15px] text-tinta-2">Compras em marketplace há até 30 dias são trocadas pelo próprio marketplace. Abra a devolução no pedido.</p>
          </>
        )}

        {c.status === "CONCLUIDO" && (
          <>
            <h1 className="text-xl font-extrabold">Chamado concluído</h1>
            <div className="mt-4"><BotaoPdf /></div>
          </>
        )}

        {c.status === "ENCERRADO" && (
          <>
            <h1 className="text-xl font-extrabold">Chamado encerrado</h1>
            <p className="mt-2 text-[15px] text-tinta-2">Encerrado por falta de resposta. Se ainda precisar, abra um novo chamado.</p>
          </>
        )}
      </section>

      {conteudo && c.status !== "ANALISANDO" && (
        <section className="mt-6 rounded-caixa border border-linha bg-superficie p-6">
          <h2 className="text-[15px] font-extrabold">Prévia do laudo</h2>
          <div className={`mt-3 rounded-t-lg px-4 py-2 text-[13px] font-extrabold text-white ${conteudo.banner === "vermelho" ? "bg-[#9b2c2c]" : "bg-marca"}`}>
            {conteudo.titulo} · Análise Preliminar
          </div>
          <dl className="rounded-b-lg border border-t-0 border-linha p-4 text-[13.5px]">
            <dt className="font-bold">Fundamentação</dt>
            <dd className="mb-3 text-tinta-2">{conteudo.fundamentacao}</dd>
            <dt className="font-bold">Conclusão</dt>
            <dd className="mb-3 text-tinta-2">{conteudo.conclusao}</dd>
            <dt className="font-bold">Frete</dt>
            <dd className="text-tinta-2">{conteudo.frete}</dd>
          </dl>
          <div className="mt-4"><BotaoPdf /></div>
        </section>
      )}

      <p className="mt-8 text-center text-[13px] text-mudo">
        Dúvidas: WhatsApp {WHATSAPP_BONITO} · {SAC_EMAIL} ·{" "}
        <Link href="/assistencia" className="font-bold text-marca underline">Assistência técnica</Link>
      </p>
    </div>
  );
}
