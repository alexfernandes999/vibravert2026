"use client";

import { useEffect, useRef, useState } from "react";
import { useForm, useWatch, type UseFormReturn } from "react-hook-form";
import { useRouter } from "next/navigation";
import type { ZodTypeAny } from "zod";
import {
  CANAIS,
  ESPACOS_FOTO,
  ROTULO_ESPACO,
  etapaCompra,
  etapaDados,
  etapaInstalacao,
  etapaOcorrido,
  etapaProduto,
  MSG_NF,
  type EspacoFoto,
} from "@/lib/assistencia/esquemas";
import { abrirChamado } from "@/lib/assistencia/abrir";
import { enviarFoto } from "./enviar-foto";
import { lerNF } from "@/lib/regras/nf";
import { MODELOS, NOME_MODELO } from "@/lib/regras/tipos";

/**
 * Formulário de garantia em 7 etapas.
 *
 * Quem usa está no campo, no celular, com sinal ruim: cada etapa valida antes
 * de seguir, o erro é dito em texto (e anunciado ao leitor de tela) e a foto
 * é reduzida no próprio aparelho antes de subir.
 *
 * As perguntas de instalação NÃO mostram os limites do manual (45 min, 40 cm):
 * mostrar induz a resposta e estraga a triagem. "Não sei" sempre aparece.
 */

type Valores = {
  nome: string;
  documento: string;
  telefone: string;
  email: string;
  canal: string;
  nf: string;
  recebimento: string;
  usou: string;
  modelo: string;
  tensao: string;
  serie: string;
  instalacao: Record<string, string>;
  ocorrido: string;
  lgpd: boolean;
};

const ETAPAS = ["Seus dados", "Compra", "Produto", "Instalação", "O que aconteceu", "Fotos", "Revisão"];

type Fluxo = "garantia" | "arrependimento" | "marketplace";

const PERGUNTAS: { k: string; t: string; d: string; o: [string, string, string?][] }[] = [
  { k: "tempo", t: "Quanto tempo ela ficava ligada de cada vez?", d: "Pense numa vez normal de uso, do ligar ao desligar.", o: [["ate15", "Até 15 min"], ["15a30", "15 a 30 min"], ["30a45", "30 a 45 min"], ["45a60", "45 min a 1 hora"], ["mais60", "Mais de 1 hora"], ["ns", "Não sei"]] },
  { k: "rede", t: "Qual a tensão da tomada?", d: "É a da tomada onde a bomba era ligada.", o: [["127", "127V", "também chamada de 110V"], ["220", "220V"], ["254", "254V"], ["ns", "Não sei"]] },
  { k: "submersa", t: "Ela ficava sempre debaixo d'água?", d: "Inclusive quando o nível do poço baixava.", o: [["sim", "Sim, sempre"], ["nao", "Às vezes ficava fora"], ["ns", "Não sei"]] },
  { k: "distancia", t: "Qual a distância entre a bomba e o fundo?", d: "Da parte de baixo da bomba até o fundo do poço.", o: [["mais40", "Mais de 40 cm"], ["20a40", "20 a 40 cm"], ["menos20", "Menos de 20 cm"], ["ns", "Não sei"]] },
  { k: "sustentacao", t: "Ela ficava pendurada por quê?", d: "O que segurava o peso da bomba dentro do poço.", o: [["corda", "Corda ou cabo de aço", "preso na alça da bomba"], ["cabo", "Pelo próprio fio elétrico"], ["ns", "Não sei"]] },
  { k: "emenda", t: "Como foi feita a emenda do fio?", d: "Se o fio da bomba foi emendado para chegar até a tomada.", o: [["autofusao", "Fita de autofusão + isolante"], ["comum", "Só fita isolante"], ["sem", "Não tem emenda"], ["ns", "Não sei"]] },
  { k: "agua", t: "Como era a água do poço?", d: "", o: [["limpa", "Limpa"], ["areia", "Com areia ou barro"], ["ns", "Não sei"]] },
  { k: "energia", t: "A energia do local cai ou oscila?", d: "Luz piscando, quedas frequentes ou disjuntor desarmando.", o: [["nao", "Não"], ["sim", "Sim"], ["ns", "Não sei"]] },
];

const MARKETPLACES = ["ml", "shopee", "magalu", "amazon"];
const hojeLocal = () => new Date().toLocaleDateString("en-CA");
const diasDesde = (iso: string) =>
  Math.round((Date.parse(`${hojeLocal()}T00:00:00Z`) - Date.parse(`${iso}T00:00:00Z`)) / 86_400_000);

const input =
  "w-full rounded-lg border border-linha-2 bg-superficie px-3 py-2.5 text-[15px] font-medium aria-[invalid=true]:border-critico focus:border-marca focus:outline-none focus-visible:ring-2 focus-visible:ring-marca/40";

export function FormularioGarantia() {
  const router = useRouter();
  const form = useForm<Valores>({
    defaultValues: { instalacao: {}, lgpd: false, serie: "", usou: "", canal: "", tensao: "", modelo: "" },
  });
  const [etapa, setEtapa] = useState(0);
  const [fluxo, setFluxo] = useState<Fluxo>("garantia");
  const [fotos, setFotos] = useState<Partial<Record<EspacoFoto, { caminho: string; previa: string }>>>({});
  const [enviandoFoto, setEnviandoFoto] = useState<EspacoFoto | null>(null);
  const [erroFoto, setErroFoto] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const rascunho = useRef<string | null>(null);
  const titulo = useRef<HTMLHeadingElement>(null);

  // Ao trocar de etapa o foco vai para o título: o leitor de tela anuncia onde está.
  useEffect(() => {
    titulo.current?.focus();
  }, [etapa, fluxo]);

  function validar(schema: ZodTypeAny, valores: unknown, prefixo = ""): boolean {
    const r = schema.safeParse(valores);
    if (r.success) return true;
    let primeiro: string | null = null;
    for (const i of r.error.issues) {
      const campo = `${prefixo}${i.path.join(".")}` as keyof Valores;
      form.setError(campo, { message: i.message });
      primeiro ??= campo;
    }
    if (primeiro) form.setFocus(primeiro as keyof Valores);
    return false;
  }

  function avancar() {
    form.clearErrors();
    const v = form.getValues();
    setErroGeral(null);

    if (etapa === 0 && !validar(etapaDados, v)) return;
    if (etapa === 1) {
      if (!validar(etapaCompra, v)) return;
      const nf = lerNF(v.nf, v.documento);
      if (nf.tipo === "invalida") {
        form.setError("nf", { message: MSG_NF[nf.motivo] });
        form.setFocus("nf");
        return;
      }
      // ── desvio cedo ──────────────────────────────────────────────
      const dias = diasDesde(v.recebimento);
      if (dias < 0) {
        form.setError("recebimento", { message: "A data de recebimento não pode ser no futuro." });
        return;
      }
      if (v.usou === "nao" && dias <= 7) {
        setFluxo("arrependimento");
        setEtapa(6);
        return;
      }
      if (MARKETPLACES.includes(v.canal) && dias <= 30) {
        setFluxo("marketplace");
        return;
      }
    }
    if (etapa === 2 && !validar(etapaProduto, v)) return;
    if (etapa === 3 && !validar(etapaInstalacao, v.instalacao, "instalacao.")) return;
    if (etapa === 4 && !validar(etapaOcorrido, v)) return;
    if (etapa === 5) {
      const faltam = ESPACOS_FOTO.filter((e) => !fotos[e]);
      if (faltam.length) {
        setErroFoto(`Faltam ${faltam.length === 1 ? "1 foto" : `${faltam.length} fotos`}: ${faltam.map((e) => ROTULO_ESPACO[e].t).join(", ")}.`);
        return;
      }
    }
    setFluxo("garantia");
    setEtapa((e) => Math.min(e + 1, 6));
  }

  async function escolherFoto(espaco: EspacoFoto, arquivo: File | undefined) {
    if (!arquivo) return;
    setErroFoto(null);
    setEnviandoFoto(espaco);
    try {
      const r = await enviarFoto(rascunho.current, espaco, arquivo);
      rascunho.current = r.rascunho;
      setFotos((f) => ({ ...f, [espaco]: { caminho: r.caminho, previa: r.previa } }));
    } catch (e) {
      setErroFoto(e instanceof Error ? e.message : "Não foi possível enviar a foto.");
    } finally {
      setEnviandoFoto(null);
    }
  }

  async function enviar() {
    form.clearErrors();
    const v = form.getValues();
    if (!v.lgpd) {
      form.setError("lgpd", { message: "Marque a autorização para enviar." });
      return;
    }
    setEnviando(true);
    setErroGeral(null);
    const base = { nome: v.nome, documento: v.documento, telefone: v.telefone, email: v.email, canal: v.canal, nf: v.nf, recebimento: v.recebimento, usou: v.usou, lgpd: true };
    const dados =
      fluxo === "arrependimento"
        ? { ...base, tipo: "arrependimento" }
        : {
            ...base,
            tipo: "garantia",
            modelo: v.modelo,
            tensao: v.tensao,
            serie: v.serie,
            ocorrido: v.ocorrido,
            instalacao: { ...v.instalacao, tempoMinutos: v.instalacao.tempoMinutos ? Number(v.instalacao.tempoMinutos) : null },
            fotos: Object.fromEntries(Object.entries(fotos).map(([k, f]) => [k, f!.caminho])),
          };
    try {
      const r = await abrirChamado(dados);
      if (r.ok) {
        router.push(r.link);
        return;
      }
      const [campo, msg] = Object.entries(r.erros)[0] ?? [];
      setErroGeral(msg ? `Confira: ${msg}` : "Confira os dados e tente de novo.");
      if (campo) form.setError(campo as keyof Valores, { message: msg });
    } catch {
      setErroGeral("Não conseguimos enviar agora. Verifique a conexão e tente de novo · seus dados continuam aqui.");
    }
    setEnviando(false);
  }

  if (fluxo === "marketplace") {
    const canal = CANAIS.find(([c]) => c === form.getValues("canal"))?.[1] ?? "marketplace";
    return (
      <section className="rounded-caixa border border-linha bg-superficie p-6">
        <h2 ref={titulo} tabIndex={-1} className="text-xl font-extrabold tracking-tight outline-none">
          Abra a devolução no {canal}
        </h2>
        <p className="mt-3 text-[15px] text-tinta-2">
          Compras feitas no {canal} há até 30 dias são trocadas pelo próprio {canal}: é mais rápido para você e o frete
          sai por conta deles. Abra a devolução em <strong>Minhas compras</strong>, no pedido da bomba.
        </p>
        <p className="mt-3 text-[13.5px] text-mudo">Não é preciso abrir chamado aqui.</p>
        <button type="button" onClick={() => setFluxo("garantia")} className="mt-5 text-[14px] font-bold text-marca underline">
          Voltar e corrigir a data ou o canal
        </button>
      </section>
    );
  }

  const passo = fluxo === "arrependimento" ? 6 : etapa;

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        if (passo === 6) enviar();
        else avancar();
      }}
      className="rounded-caixa border border-linha bg-superficie p-5 sm:p-7"
    >
      <ol className="mb-6 flex gap-1" aria-label="Etapas">
        {ETAPAS.map((t, i) => (
          <li key={t} className={`h-1.5 flex-1 rounded-full ${i <= passo ? "bg-marca" : "bg-linha"}`} aria-current={i === passo ? "step" : undefined}>
            <span className="sr-only">{`${t}${i === passo ? " (atual)" : ""}`}</span>
          </li>
        ))}
      </ol>
      <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-marca">
        {fluxo === "arrependimento" ? "Arrependimento" : `Etapa ${passo + 1} de 7`}
      </p>
      <h2 ref={titulo} tabIndex={-1} className="mt-1 text-xl font-extrabold tracking-tight outline-none">
        {fluxo === "arrependimento" ? "Devolução por arrependimento" : ETAPAS[passo]}
      </h2>

      <div className="mt-5">
        {passo === 0 && <Dados form={form} />}
        {passo === 1 && <Compra form={form} />}
        {passo === 2 && <Produto form={form} />}
        {passo === 3 && <Instalacao form={form} />}
        {passo === 4 && (
          <Campo form={form} nome="ocorrido" rotulo="O que aconteceu" dica="Conte do seu jeito: quando parou, o que fez, se desarmou o disjuntor, se fez barulho.">
            {(p) => <textarea {...p} rows={6} className={input} />}
          </Campo>
        )}
        {passo === 5 && (
          <Fotos fotos={fotos} enviando={enviandoFoto} erro={erroFoto} escolher={escolherFoto} />
        )}
        {passo === 6 && <Revisao form={form} fluxo={fluxo} fotos={Object.keys(fotos).length} />}
      </div>

      {erroGeral && (
        <p role="alert" className="mt-4 rounded-lg border-l-[3px] border-critico bg-critico/[0.06] px-4 py-3 text-[13.5px] font-semibold text-critico">
          {erroGeral}
        </p>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        {passo > 0 && (
          <button
            type="button"
            onClick={() => {
              if (fluxo === "arrependimento") {
                setFluxo("garantia");
                setEtapa(1);
              } else setEtapa((e) => e - 1);
            }}
            className="rounded-lg border-[1.5px] border-linha-2 px-5 py-3 text-[14px] font-bold text-tinta-2"
          >
            Voltar
          </button>
        )}
        <button
          type="submit"
          disabled={enviando || enviandoFoto !== null}
          className="rounded-lg bg-marca px-6 py-3 text-[14px] font-bold text-white shadow-lg shadow-marca/25 disabled:opacity-60"
        >
          {passo === 6 ? (enviando ? "Enviando…" : "Enviar chamado") : "Continuar"}
        </button>
      </div>
    </form>
  );
}

// ── campos ──────────────────────────────────────────────────────────────

type F = UseFormReturn<Valores>;

function Campo({
  form,
  nome,
  rotulo,
  dica,
  children,
}: {
  form: F;
  nome: string;
  rotulo: string;
  dica?: string;
  children: (p: Record<string, unknown>) => React.ReactNode;
}) {
  const erro = (nome.split(".").reduce<unknown>((o, k) => (o as Record<string, unknown> | undefined)?.[k], form.formState.errors) as { message?: string } | undefined)?.message;
  const id = `c-${nome.replace(".", "-")}`;
  return (
    <div className="mb-4">
      <label htmlFor={id} className="mb-1.5 block text-[13.5px] font-bold">
        {rotulo}
      </label>
      {dica && (
        <p id={`${id}-dica`} className="mb-1.5 text-[12.5px] text-mudo">
          {dica}
        </p>
      )}
      {children({
        id,
        ...form.register(nome as keyof Valores),
        "aria-invalid": erro ? true : undefined,
        "aria-describedby": [dica ? `${id}-dica` : null, erro ? `${id}-erro` : null].filter(Boolean).join(" ") || undefined,
      })}
      {erro && (
        <p id={`${id}-erro`} role="alert" className="mt-1.5 text-[12.5px] font-semibold text-critico">
          {erro}
        </p>
      )}
    </div>
  );
}

function Opcoes({ form, nome, rotulo, opcoes, dica }: { form: F; nome: string; rotulo: string; opcoes: [string, string, string?][]; dica?: string }) {
  const erro = (nome.split(".").reduce<unknown>((o, k) => (o as Record<string, unknown> | undefined)?.[k], form.formState.errors) as { message?: string } | undefined)?.message;
  const id = `g-${nome.replace(".", "-")}`;
  return (
    <fieldset className="mb-5" aria-describedby={erro ? `${id}-erro` : undefined}>
      <legend className="mb-1 text-[14px] font-bold">{rotulo}</legend>
      {dica && <p className="mb-2 text-[12.5px] text-mudo">{dica}</p>}
      <div className="grid gap-2 sm:grid-cols-2">
        {opcoes.map(([v, t, d]) => (
          <label
            key={v}
            className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-linha-2 px-3.5 py-3 has-[:checked]:border-marca has-[:checked]:bg-marca-suave has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-marca/40"
          >
            <input type="radio" value={v} {...form.register(nome as keyof Valores)} className="mt-1 accent-marca" />
            <span>
              <span className="block text-[14px] font-bold">{t}</span>
              {d && <span className="block text-[12px] text-mudo">{d}</span>}
            </span>
          </label>
        ))}
      </div>
      {erro && (
        <p id={`${id}-erro`} role="alert" className="mt-1.5 text-[12.5px] font-semibold text-critico">
          {erro}
        </p>
      )}
    </fieldset>
  );
}

function Dados({ form }: { form: F }) {
  return (
    <>
      <Campo form={form} nome="nome" rotulo="Nome completo">{(p) => <input {...p} autoComplete="name" className={input} />}</Campo>
      <Campo form={form} nome="documento" rotulo="CPF ou CNPJ">{(p) => <input {...p} inputMode="numeric" className={`num ${input}`} />}</Campo>
      <Campo form={form} nome="telefone" rotulo="WhatsApp com DDD">{(p) => <input {...p} type="tel" autoComplete="tel" inputMode="tel" className={`num ${input}`} />}</Campo>
      <Campo form={form} nome="email" rotulo="E-mail">{(p) => <input {...p} type="email" autoComplete="email" className={input} />}</Campo>
    </>
  );
}

function Compra({ form }: { form: F }) {
  return (
    <>
      <Campo form={form} nome="canal" rotulo="Onde comprou">
        {(p) => (
          <select {...p} className={input}>
            <option value="">Escolha</option>
            {CANAIS.map(([v, t]) => (
              <option key={v} value={v}>{t}</option>
            ))}
          </select>
        )}
      </Campo>
      <Campo form={form} nome="nf" rotulo="Nota fiscal" dica="O número da nota (até 9 dígitos) ou a chave de acesso de 44 dígitos. Não é o CPF.">
        {(p) => <input {...p} inputMode="numeric" className={`num ${input}`} />}
      </Campo>
      <Campo form={form} nome="recebimento" rotulo="Data em que recebeu a bomba">
        {(p) => <input {...p} type="date" max={hojeLocal()} className={`num ${input}`} />}
      </Campo>
      <Opcoes form={form} nome="usou" rotulo="A bomba chegou a ser usada?" opcoes={[["sim", "Sim"], ["nao", "Não, está sem uso"]]} />
    </>
  );
}

function Produto({ form }: { form: F }) {
  return (
    <>
      <Campo form={form} nome="modelo" rotulo="Modelo">
        {(p) => (
          <select {...p} className={input}>
            <option value="">Escolha o modelo</option>
            {MODELOS.map((m) => (
              <option key={m} value={m}>{NOME_MODELO[m]}</option>
            ))}
          </select>
        )}
      </Campo>
      <Opcoes form={form} nome="tensao" rotulo="Tensão da bomba" opcoes={[["127", "127V"], ["220", "220V"], ["254", "254V"]]} />
      <Campo form={form} nome="serie" rotulo="Número de série (opcional)" dica="Na etiqueta da bomba. Se não encontrar, deixe em branco.">
        {(p) => <input {...p} className={`num ${input}`} />}
      </Campo>
    </>
  );
}

function Instalacao({ form }: { form: F }) {
  const tempo = useWatch({ control: form.control, name: "instalacao.tempo" as "nome" });
  return (
    <>
      <p className="mb-4 text-[14px] text-tinta-2">
        Responda como estava antes de parar. Se não souber, tudo bem: marque &quot;Não sei&quot;.
      </p>
      {PERGUNTAS.map((q) => (
        <div key={q.k}>
          <Opcoes form={form} nome={`instalacao.${q.k}`} rotulo={q.t} dica={q.d} opcoes={q.o} />
          {q.k === "tempo" && tempo === "mais60" && (
            <Campo form={form} nome="instalacao.tempoMinutos" rotulo="Mais ou menos quantos minutos por vez?">
              {(p) => <input {...p} type="number" inputMode="numeric" min={61} className={`num ${input} max-w-[10rem]`} />}
            </Campo>
          )}
        </div>
      ))}
    </>
  );
}

function Fotos({
  fotos,
  enviando,
  erro,
  escolher,
}: {
  fotos: Partial<Record<EspacoFoto, { previa: string }>>;
  enviando: EspacoFoto | null;
  erro: string | null;
  escolher: (e: EspacoFoto, f: File | undefined) => void;
}) {
  const grupo = (titulo: string, sub: string, espacos: readonly EspacoFoto[]) => (
    <div className="mb-5">
      <h3 className="text-[14.5px] font-extrabold">{titulo}</h3>
      <p className="mb-2.5 text-[12.5px] text-mudo">{sub}</p>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {espacos.map((e) => (
          <li key={e}>
            <label className="block cursor-pointer overflow-hidden rounded-lg border-2 border-dashed border-linha-2 bg-superficie-2 text-center has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-marca/40">
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="sr-only"
                aria-label={`Foto: ${ROTULO_ESPACO[e].t} (${ROTULO_ESPACO[e].d})`}
                onChange={(ev) => escolher(e, ev.target.files?.[0])}
              />
              {fotos[e] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={fotos[e]!.previa} alt="" className="aspect-square w-full object-cover" />
              ) : (
                <span className="flex aspect-square items-center justify-center px-2 text-[12px] font-semibold text-mudo">
                  {enviando === e ? "Enviando…" : "Toque para fotografar"}
                </span>
              )}
              <span className="block border-t border-linha px-2 py-1.5">
                <span className="block text-[12.5px] font-bold">{ROTULO_ESPACO[e].t}{fotos[e] ? " ✓" : ""}</span>
                <span className="block text-[11px] text-mudo">{ROTULO_ESPACO[e].d}</span>
              </span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
  return (
    <>
      <p className="mb-4 text-[14px] text-tinta-2">Em local iluminado, com a peça inteira no quadro. São 6 fotos obrigatórias.</p>
      {grupo("Da bomba", "Tire a bomba do poço e fotografe em cima de uma superfície.", ESPACOS_FOTO.slice(0, 4))}
      {grupo("Do local de instalação", "Ajudam a entender as condições de uso.", ESPACOS_FOTO.slice(4))}
      <p aria-live="polite" className="text-[13px] font-semibold text-critico">{erro}</p>
    </>
  );
}

function Revisao({ form, fluxo, fotos }: { form: F; fluxo: Fluxo; fotos: number }) {
  const v = form.getValues();
  const erro = form.formState.errors.lgpd?.message;
  const linha = (t: string, d: string) => (
    <div className="flex justify-between gap-4 border-b border-linha py-1.5 text-[13.5px]">
      <dt className="text-mudo">{t}</dt>
      <dd className="text-right font-semibold">{d || "—"}</dd>
    </div>
  );
  return (
    <>
      {fluxo === "arrependimento" && (
        <p className="mb-4 rounded-lg bg-marca-suave px-4 py-3 text-[14px] text-tinta-2">
          Recebeu há até 7 dias e não usou: é devolução por arrependimento. Não precisa de fotos nem de explicar o motivo.
          Enviamos o código de postagem em até 1 dia útil e o valor é estornado integralmente.
        </p>
      )}
      <dl>
        {linha("Nome", v.nome)}
        {linha("CPF/CNPJ", v.documento)}
        {linha("WhatsApp", v.telefone)}
        {linha("E-mail", v.email)}
        {linha("Onde comprou", CANAIS.find(([c]) => c === v.canal)?.[1] ?? "")}
        {linha("Nota fiscal", v.nf)}
        {linha("Recebeu em", v.recebimento ? v.recebimento.split("-").reverse().join("/") : "")}
        {fluxo === "garantia" && linha("Modelo", v.modelo ? `${NOME_MODELO[v.modelo as keyof typeof NOME_MODELO]} · ${v.tensao}V` : "")}
        {fluxo === "garantia" && linha("Fotos", `${fotos} de 6`)}
      </dl>
      <label className="mt-5 flex items-start gap-2.5 text-[13.5px]">
        <input
          type="checkbox"
          {...form.register("lgpd")}
          aria-invalid={erro ? true : undefined}
          aria-describedby={erro ? "lgpd-erro" : undefined}
          className="mt-0.5 h-4 w-4 accent-marca"
        />
        <span>
          Autorizo a Vibra Vert a usar estes dados e fotos para analisar a garantia e me contatar sobre este chamado,
          conforme a <a href="/politica-de-privacidade" className="font-bold text-marca underline">Política de Privacidade</a>.
        </span>
      </label>
      {erro && (
        <p id="lgpd-erro" role="alert" className="mt-1.5 text-[12.5px] font-semibold text-critico">
          {erro}
        </p>
      )}
    </>
  );
}
