"use client";

import { whatsappLink } from "@/lib/contato";
import { guardarConversa, recomendarNoChat, versaoNoChat, type VersaoChat } from "@/lib/acoes-vibrinha";
import { brl, precoPix, parcela, PARCELAS_MAX, litros } from "@/lib/formato";
import { FRETE_GRATIS_EM_BOMBAS, PRAZO_DESPACHO } from "@/lib/loja";
import { PERDA_POR_METRO } from "@/lib/recomendacao";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ROTEIRO, INICIO, type Opcao } from "@/lib/roteiro-vibrinha";

/**
 * Vibrinha, a atendente da loja.
 *
 * Não é inteligência artificial e não finge ser: é um roteiro de perguntas
 * frequentes com respostas escritas, sem custo por mensagem e sem inventar
 * dado técnico. Numa loja de bomba, uma resposta errada sobre vazão ou
 * garantia volta como devolução, então nada aqui é gerado na hora.
 *
 * O papel dela é resolver o que é simples e passar o resto para o WhatsApp com
 * o assunto já escrito, para o vendedor não recomeçar a conversa do zero.
 *
 * O nome vem do modelo Vibrinha, que tem mascote próprio na embalagem: é da
 * casa, e não um robô genérico com nome de startup.
 */

type Msg = { de: "ela" | "eu"; texto: string; acao?: { rotulo: string; href: string } };

/**
 * As quatro perguntas da calculadora, uma por vez. Altura e cano se digitam;
 * poço e tensão se escolhem, porque as opções são poucas e um "110" escrito à
 * mão viraria dúvida sobre qual bomba mandar.
 */
type Conta = {
  etapa: "altura" | "tubo" | "poco" | "tensao" | "vazao";
  altura?: number;
  tubo?: number;
  poco?: number;
  tensao?: string;
};

/** A instalação já respondida e a bomba indicada: base para os pedidos que vêm depois. */
type Instalacao = { altura: number; tubo: number; poco: number; tensao: string; slug: string; nome: string };

/** Opções que não são do roteiro: agem sobre a última recomendação. */
const VERSOES: { chave: string; versao: VersaoChat; rotulo: string; descricao: string }[] = [
  { chave: "acao:boia", versao: "BOIA", rotulo: "Com boia de nível", descricao: "com boia de nível" },
  { chave: "acao:kit", versao: "KIT", rotulo: "Com kit de manutenção", descricao: "com kit de manutenção" },
  { chave: "acao:boia_kit", versao: "BOIA_KIT", rotulo: "Com boia e kit", descricao: "com boia de nível e kit de manutenção" },
];

const POCOS = [
  { v: 4, r: "4 polegadas" },
  { v: 6, r: "6 polegadas" },
  { v: 8, r: "8 polegadas ou mais" },
  { v: 99, r: "Cisterna ou cacimbão" },
];

const TENSOES = [
  { v: "110/127V", r: "127 V (110)" },
  { v: "220V", r: "220 V" },
];

const OI = "Oi! Eu sou a Vibrinha, da Vibra Vert. Antes de mais nada, como posso te chamar?";

export function Vibrinha() {
  const [aberto, setAberto] = useState(false);
  const [nome, setNome] = useState("");
  const [rascunho, setRascunho] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([{ de: "ela", texto: OI }]);
  const [digitando, setDigitando] = useState(false);
  const [opcoes, setOpcoes] = useState<Opcao[]>([]);
  const [encaminhar, setEncaminhar] = useState(false);
  // O que já foi apurado vai junto para o WhatsApp: o vendedor não recomeça
  // do zero, e ninguém repete a mesma história duas vezes.
  const [apurado, setApurado] = useState<string[]>([]);
  const [conta, setConta] = useState<Conta | null>(null);
  const [instalacao, setInstalacao] = useState<Instalacao | null>(null);
  const fim = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fim.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [msgs, digitando, aberto]);

  /** Pequeno atraso antes de responder: resposta instantânea denuncia robô. */
  function responder(itens: Msg[], seguintes?: Opcao[], encaminha = false) {
    setDigitando(true);
    setOpcoes([]);
    setTimeout(() => {
      setDigitando(false);
      setMsgs((m) => [...m, ...itens]);
      setOpcoes(seguintes ?? []);
      setEncaminhar(encaminha);
    }, 700);
  }

  /** Caminha um passo no roteiro. */
  function ir(chave: string, rotulo?: string) {
    const no = ROTEIRO[chave];
    if (!no) return;
    setConta(no.calcula ? { etapa: "altura" } : null);
    if (rotulo) {
      setMsgs((m) => [...m, { de: "eu", texto: rotulo }]);
      setApurado((a) => [...a, rotulo]);
    }
    responder(
      no.fala.map((texto, i) => ({
        de: "ela" as const,
        texto,
        acao: i === no.fala.length - 1 ? no.acao : undefined,
      })),
      no.opcoes,
      Boolean(no.encaminha),
    );
  }

  /** O que a pessoa respondeu, na conversa e no resumo que vai ao vendedor. */
  function eu(texto: string, nota: string) {
    setMsgs((m) => [...m, { de: "eu", texto }]);
    setApurado((a) => [...a, nota]);
  }

  /** Altura, cano e vazão chegam digitados: aceita vírgula e recusa o que não é medida. */
  function responderMetros(valor: string) {
    if (!conta) return;
    const vazao = conta.etapa === "vazao";
    // Em litros o ponto separa milhar ("1.200"); em metros é decimal ("2.5").
    const bruto = valor.trim();
    const n = Number((vazao ? bruto.replace(/\./g, "") : bruto).replace(",", "."));
    setRascunho("");
    if (!(n > 0) || n > (vazao ? 20000 : 500)) {
      responder([{
        de: "ela",
        texto: vazao ? "Me diz só o número, em litros por hora. Por exemplo: 1200." : "Me diz só o número, em metros. Por exemplo: 25.",
      }]);
      return;
    }
    const m = n.toLocaleString("pt-BR");
    if (conta.etapa === "altura") {
      eu(`${m} m`, `Altura até a caixa: ${m} m`);
      setConta({ etapa: "tubo", altura: n });
      responder([{ de: "ela", texto: "E o comprimento do cano, do poço até a caixa? Também em metros." }]);
    } else if (conta.etapa === "tubo") {
      eu(`${m} m`, `Cano: ${m} m`);
      setConta({ ...conta, etapa: "poco", tubo: n });
      responder([{ de: "ela", texto: "Qual o diâmetro do poço?" }]);
    } else if (vazao && instalacao) {
      eu(`${m} L/h`, `Precisa de: ${m} L/h`);
      setConta(null);
      void calcular(instalacao, rotuloTensao(instalacao.tensao), n);
    }
  }

  function escolherPoco(v: number, rotulo: string) {
    if (!conta) return;
    eu(rotulo, `Poço: ${rotulo}`);
    setConta({ ...conta, etapa: "tensao", poco: v });
    responder([{ de: "ela", texto: "Última: a tensão aí é 127 V (que muita gente chama de 110) ou 220 V?" }]);
  }

  const rotuloTensao = (v: string) => TENSOES.find((t) => t.v === v)?.r ?? v;

  function escolherTensao(v: string, rotulo: string) {
    if (!conta || conta.altura == null || conta.tubo == null || conta.poco == null) return;
    eu(rotulo, `Tensão: ${rotulo}`);
    setConta(null);
    void calcular({ altura: conta.altura, tubo: conta.tubo, poco: conta.poco, tensao: v }, rotulo);
  }

  /**
   * Roda a conta no servidor e responde.
   *
   * Sem `vazaoMinima`, indica a que mais entrega água na instalação. Com ela,
   * a mais barata que alcança o que a pessoa pediu · o mesmo critério do motor
   * que o Gustavo montou para o atendimento.
   */
  async function calcular(
    dados: { altura: number; tubo: number; poco: number; tensao: string },
    rotulo: string,
    vazaoMinima?: number,
  ) {
    const { altura, tubo, poco, tensao } = dados;
    setOpcoes([]);
    setDigitando(true);

    try {
      const r = await recomendarNoChat({ altura, tubo, poco, tensao, vazaoMinima });
      const ondeTxt =
        poco === 99 ? "cisterna ou cacimbão" : `poço de ${poco === 8 ? "8 polegadas ou mais" : `${poco} polegadas`}`;

      if (r.semSaida) {
        responder(
          [{
            de: "ela",
            texto: `Com a perda no cano, a altura total dá ${r.hTotal} metros, e isso passa do limite de 65 m de toda bomba vibratória. Para essa instalação o caminho é bomba multiestágio ou submersa tipo caneta. Melhor falar com o técnico antes de comprar.`,
          }],
          undefined,
          true,
        );
        return;
      }

      if (!r.indicada) {
        responder(
          [{
            de: "ela",
            texto: vazaoMinima
              ? `Nenhuma bomba vibratória entrega ${litros(vazaoMinima)} a ${r.hTotal} m de altura total nessa instalação. Fala com o técnico, que ele te mostra o caminho.`
              : poco === 4
                ? "Poço de 4 polegadas é estreito demais para a nossa linha: a menor bomba pede 6. Fala com o técnico, que ele te mostra o caminho."
                : `Não temos bomba de ${rotulo} que sirva para ${ondeTxt}. Fala com o técnico, que ele te mostra o caminho.`,
          }],
          undefined,
          true,
        );
        return;
      }

      const b = r.indicada;
      const perda = Math.round(tubo * PERDA_POR_METRO);
      setInstalacao({ ...dados, slug: b.slug, nome: b.nome });
      setApurado((a) => [...a, `Indicada: ${b.nome} (${litros(b.vazao)})`]);

      const itens: Msg[] = [
        {
          de: "ela",
          texto: `Para ${ondeTxt}, com a caixa a ${altura.toLocaleString("pt-BR")} m e ${tubo.toLocaleString("pt-BR")} m de cano, ${
            vazaoMinima
              ? `a mais em conta que entrega pelo menos ${litros(vazaoMinima)} é a ${b.nome}.`
              : `a indicada é a ${b.nome}.`
          }${b.saiaProtecao ? " Ela tem saia de proteção lateral, que evita que bata na parede do poço enquanto vibra." : ""}`,
        },
        {
          de: "ela",
          texto: `${
            b.vazao < b.vazaoMaxima
              ? `Na sua instalação ela entrega ${litros(b.vazao)}. A vazão máxima dela é ${litros(b.vazaoMaxima)}, medida a 0 m: a diferença vem dos ${r.hTotal} m de altura total, já contando ${perda} m de perda no cano.`
              : `Na sua instalação ela entrega ${litros(b.vazao)}.`
          } Se o cano tiver muitas curvas e registros, ou um desnível grande no caminho, vale confirmar com o técnico.`,
        },
        {
          de: "ela",
          texto: `Sai por ${brl(precoPix(b.preco))} no PIX ou ${brl(b.preco)} em ${PARCELAS_MAX}× de ${brl(parcela(b.preco))} sem juros${
            FRETE_GRATIS_EM_BOMBAS ? ", com frete grátis" : ""
          }. O pedido ${PRAZO_DESPACHO}.${b.garantia ? ` Garantia de ${b.garantia.toLowerCase()}.` : ""}`,
          acao: { rotulo: "Ver e comprar", href: `/produto/${b.slug}` },
        },
      ];
      if (r.alternativas.length) {
        itens.push({
          de: "ela",
          texto: `Também servem: ${r.alternativas
            .map((a) => `${a.nome} (${litros(a.vazao)}, ${brl(precoPix(a.preco))} no PIX)`)
            .join("; ")}.`,
        });
      }
      itens.push({ de: "ela", texto: "Quer com boia de nível, com kit de manutenção ou com os dois?" });
      responder(itens, depoisDaIndicacao(vazaoMinima != null));
    } catch {
      responder(
        [{
          de: "ela",
          texto: "Não consegui fazer a conta agora. A calculadora da loja faz a mesma coisa, ou fala com um vendedor.",
          acao: { rotulo: "Abrir a calculadora", href: "/qual-bomba" },
        }],
        undefined,
        true,
      );
    }
  }

  function depoisDaIndicacao(jaPediuVazao: boolean, sem?: string): Opcao[] {
    return [
      ...VERSOES.filter((v) => v.chave !== sem).map((v) => ({ rotulo: v.rotulo, proximo: v.chave })),
      ...(jaPediuVazao ? [] : [{ rotulo: "Preciso de uma vazão mínima", proximo: "acao:vazao" }]),
      { rotulo: "Refazer a conta", proximo: "escolher" },
      { rotulo: "Voltar ao início", proximo: "menu" },
    ];
  }

  /** A mesma bomba indicada, na versão que a pessoa pediu, com preço e link próprios. */
  async function mostrarVersao(chave: string) {
    const v = VERSOES.find((x) => x.chave === chave);
    if (!v || !instalacao) return;
    eu(v.rotulo, `Versão: ${v.descricao}`);
    setOpcoes([]);
    setDigitando(true);
    const p = await versaoNoChat(instalacao.slug, v.versao).catch(() => null);
    if (!p) {
      responder(
        [{ de: "ela", texto: `Essa versão da ${instalacao.nome} não está disponível no site agora. Um vendedor confere para você.` }],
        undefined,
        true,
      );
      return;
    }
    responder(
      [
        {
          de: "ela",
          texto: `A ${instalacao.nome} ${v.descricao} sai por ${brl(precoPix(p.preco))} no PIX ou ${brl(p.preco)} em ${PARCELAS_MAX}× de ${brl(parcela(p.preco))} sem juros${
            FRETE_GRATIS_EM_BOMBAS ? ", com frete grátis" : ""
          }.${
            v.versao !== "KIT"
              ? " A boia desliga a bomba quando a água do poço baixa: é o que evita ela trabalhar seca, que é o que mais estraga bomba vibratória."
              : ""
          }`,
          acao: { rotulo: "Ver e comprar", href: `/produto/${p.slug}` },
        },
      ],
      depoisDaIndicacao(true, chave),
    );
  }

  /** Opção clicada: as do roteiro andam no roteiro; as `acao:` agem sobre a indicação. */
  function escolherOpcao(o: Opcao) {
    if (o.proximo === "acao:vazao") {
      if (!instalacao) return;
      eu(o.rotulo, o.rotulo);
      setConta({ etapa: "vazao" });
      responder([{ de: "ela", texto: "Quantos litros de água por hora você precisa? Pode ser aproximado." }]);
    } else if (o.proximo.startsWith("acao:")) {
      void mostrarVersao(o.proximo);
    } else {
      ir(o.proximo, o.rotulo);
    }
  }

  function enviarNome(valor: string) {
    const n = valor.trim();
    if (!n) return;
    setNome(n);
    setRascunho("");
    setMsgs((m) => [...m, { de: "eu", texto: n }]);
    setDigitando(true);
    setTimeout(() => {
      setDigitando(false);
      setMsgs((m) => [
        ...m,
        {
          de: "ela",
          texto: `Prazer, ${n.split(" ")[0]}! Trabalho aqui na Vibra Vert há um tempo. Antes de te dar qualquer palpite eu prefiro entender o caso direito, então vou fazer algumas perguntas.`,
        },
        ...ROTEIRO[INICIO].fala.map((texto) => ({ de: "ela" as const, texto })),
      ]);
      setOpcoes(ROTEIRO[INICIO].opcoes ?? []);
    }, 700);
  }



  // O que a Vibrinha já apurou vai junto na mensagem: quem atende do outro
  // lado não precisa refazer as mesmas três perguntas, e quem escreve não
  // precisa contar a história de novo.
  /**
   * A conversa inteira, do jeito que o vendedor precisa ler.
   *
   * Antes ia só uma linha com as opções clicadas. O vendedor abria o WhatsApp
   * sabendo que a pessoa "informou três coisas" e tinha de perguntar tudo de
   * novo · que é exatamente o que a Vibrinha existe para evitar.
   *
   * As falas dela vão encurtadas: o vendedor precisa do fio da conversa, não
   * do texto completo de um roteiro que ele já conhece. O que a pessoa disse
   * vai inteiro, porque é ali que está a informação nova.
   */
  const dialogo = msgs
    .slice(1) // a saudação não informa nada
    .map((m) =>
      m.de === "eu"
        ? `— ${m.texto}`
        : `Vibrinha: ${m.texto.length > 130 ? `${m.texto.slice(0, 130)}…` : m.texto}`,
    )
    .join("\n");

  const contexto = [
    nome ? `Olá! Meu nome é ${nome}.` : "Olá!",
    "Vim pelo site e conversei com a Vibrinha.",
    apurado.length ? `\n\nO que já respondi:\n${apurado.map((a) => `· ${a}`).join("\n")}` : "",
    dialogo ? `\n\n— — — conversa — — —\n${dialogo.slice(0, 1400)}` : "",
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  /**
   * Guarda antes de sair.
   *
   * O clique abre o WhatsApp e a página fica para trás · se o registro
   * dependesse do que acontece depois, se perderia sempre.
   */
  function aoPassarParaVendedor(de: string) {
    void guardarConversa({
      nome: nome || undefined,
      dialogo,
      apurado: apurado.join(" · ") || undefined,
      origem: de,
    });
  }

  return (
    <>
      {aberto && (
        <div className="fixed bottom-24 right-5 z-50 flex h-[min(560px,72vh)] w-[min(370px,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-2xl border border-linha bg-superficie shadow-2xl shadow-black/25">
          <header className="flex items-center gap-3 bg-marca-escuro px-4 py-3 text-white">
            <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full bg-ouro">
              <Image src="/vibrinha.png" alt="" width={44} height={44} className="h-11 w-11 object-contain" />
            </span>
            <span className="leading-tight">
              <span className="block text-[14px] font-extrabold">Vibrinha</span>
              <span className="block text-[11px] text-white/60">atendimento da Vibra Vert</span>
            </span>
            {/* A saída para gente de verdade fica sempre à vista, e não só no
                fim de um caminho. Quem já decidiu que quer falar com alguém
                não deveria ter de responder três perguntas antes · e saber que
                a porta está aberta é o que faz a pessoa aceitar conversar com
                a Vibrinha primeiro. */}
            <a
              href={whatsappLink(contexto)}
              target="_blank"
              rel="noopener"
              onClick={() => aoPassarParaVendedor("cabeçalho")}
              title="Falar agora com um vendedor no WhatsApp"
              className="ml-auto flex items-center gap-1.5 rounded-lg bg-[#25D366] px-2.5 py-1.5 text-[11.5px] font-extrabold text-white transition hover:brightness-110"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
                <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.46 1.32 4.96L2 22l5.25-1.38a9.87 9.87 0 004.79 1.22C17.5 21.84 21.96 17.38 21.96 11.9 21.96 6.45 17.5 2 12.04 2z" />
              </svg>
              Falar com uma pessoa
            </a>
            <button
              onClick={() => setAberto(false)}
              aria-label="Fechar conversa"
              className="rounded-lg p-1.5 text-white/70 hover:bg-white/10 hover:text-white"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
                <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
              </svg>
            </button>
          </header>

          <div className="flex-1 space-y-2.5 overflow-y-auto bg-superficie-2 p-3.5">
            {msgs.map((m, i) => (
              <div key={i} className={m.de === "eu" ? "flex justify-end" : ""}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13.2px] leading-relaxed ${
                    m.de === "eu"
                      ? "rounded-br-sm bg-marca text-white"
                      : "rounded-bl-sm bg-superficie text-tinta shadow-sm"
                  }`}
                >
                  {m.texto}
                  {m.acao && (
                    <Link
                      href={m.acao.href}
                      onClick={() => setAberto(false)}
                      className="mt-2 block rounded-lg bg-marca px-3 py-2 text-center text-[12.5px] font-bold text-white"
                    >
                      {m.acao.rotulo}
                    </Link>
                  )}
                </div>
              </div>
            ))}

            {digitando && (
              <div className="flex gap-1 rounded-2xl rounded-bl-sm bg-superficie px-3.5 py-3 shadow-sm" style={{ width: "fit-content" }}>
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="h-1.5 w-1.5 animate-bounce rounded-full bg-mudo"
                    style={{ animationDelay: `${i * 0.12}s` }}
                  />
                ))}
              </div>
            )}
            <div ref={fim} />
          </div>

          <div className="border-t border-linha bg-superficie p-3">
            {!nome ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  enviarNome(rascunho);
                }}
                className="flex gap-2"
              >
                <input
                  value={rascunho}
                  onChange={(e) => setRascunho(e.target.value)}
                  placeholder="Seu nome"
                  autoFocus
                  className="flex-1 rounded-lg border border-linha-2 px-3 py-2 text-[13.5px] font-semibold"
                />
                <button className="rounded-lg bg-marca px-4 py-2 text-[13px] font-bold text-white">
                  Enviar
                </button>
              </form>
            ) : (
              <>
                {conta && !digitando && (conta.etapa === "altura" || conta.etapa === "tubo" || conta.etapa === "vazao") && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      responderMetros(rascunho);
                    }}
                    className="flex gap-2"
                  >
                    <input
                      value={rascunho}
                      onChange={(e) => setRascunho(e.target.value)}
                      inputMode="decimal"
                      placeholder={conta.etapa === "vazao" ? "Litros por hora, por exemplo 1200" : "Em metros, por exemplo 25"}
                      aria-label={
                        conta.etapa === "altura"
                          ? "Altura até a caixa d'água, em metros"
                          : conta.etapa === "tubo"
                            ? "Comprimento do cano, em metros"
                            : "Vazão que você precisa, em litros por hora"
                      }
                      autoFocus
                      className="num flex-1 rounded-lg border border-linha-2 px-3 py-2 text-[13.5px] font-semibold"
                    />
                    <button className="rounded-lg bg-marca px-4 py-2 text-[13px] font-bold text-white">
                      Enviar
                    </button>
                  </form>
                )}

                {conta && !digitando && (conta.etapa === "poco" || conta.etapa === "tensao") && (
                  <div className="flex flex-col gap-1.5">
                    {(conta.etapa === "poco" ? POCOS : TENSOES).map((o) => (
                      <button
                        key={o.r}
                        onClick={() =>
                          conta.etapa === "poco"
                            ? escolherPoco(o.v as number, o.r)
                            : escolherTensao(o.v as string, o.r)
                        }
                        className="rounded-lg border border-linha-2 px-3 py-2 text-left text-[12.5px] font-semibold text-tinta-2 transition hover:border-marca hover:bg-marca-suave hover:text-marca"
                      >
                        {o.r}
                      </button>
                    ))}
                    {conta.etapa === "poco" && (
                      <button
                        onClick={() => ir("escolher_nao_sei", "Não sei medir")}
                        className="rounded-lg border border-linha-2 px-3 py-2 text-left text-[12.5px] font-semibold text-tinta-2 transition hover:border-marca hover:bg-marca-suave hover:text-marca"
                      >
                        Não sei medir
                      </button>
                    )}
                  </div>
                )}

                {opcoes.length > 0 && (
                  <div className="flex flex-col gap-1.5">
                    {opcoes.map((o) => (
                      <button
                        key={o.proximo + o.rotulo}
                        onClick={() => escolherOpcao(o)}
                        className="rounded-lg border border-linha-2 px-3 py-2 text-left text-[12.5px] font-semibold text-tinta-2 transition hover:border-marca hover:bg-marca-suave hover:text-marca"
                      >
                        {o.rotulo}
                      </button>
                    ))}
                  </div>
                )}

                {!encaminhar && (
                  <p className="mt-3 border-t border-linha pt-2.5 text-center text-[11.5px] leading-snug text-mudo">
                    Prefere falar com uma pessoa?{" "}
                    <a
                      href={whatsappLink(contexto)}
                      target="_blank"
                      rel="noopener"
                      onClick={() => aoPassarParaVendedor("rodapé da resposta")}
                      className="font-bold text-[#128C4A] underline underline-offset-2"
                    >
                      Chame no WhatsApp
                    </a>{" "}
                    · de segunda a sexta-feira, das 08h30 às 17h00.
                  </p>
                )}

                {encaminhar && (
                  <a
                    href={whatsappLink(contexto)}
                    target="_blank"
                    rel="noopener"
                    onClick={() => aoPassarParaVendedor("fim do roteiro")}
                    className="mt-2.5 flex items-center justify-center gap-2 rounded-lg bg-[#25D366] py-2.5 text-[13px] font-extrabold text-white"
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.46 1.32 4.96L2 22l5.25-1.38a9.87 9.87 0 004.79 1.22C17.5 21.84 21.96 17.38 21.96 11.9 21.96 6.45 17.5 2 12.04 2z" />
                    </svg>
                    Falar com um técnico no WhatsApp
                  </a>
                )}
              </>
            )}
          </div>
        </div>
      )}

      <button
        onClick={() => setAberto((a) => !a)}
        aria-expanded={aberto}
        // No celular o texto do botão some e fica só a mascote · sem isto o
        // leitor de tela anuncia "botão" e mais nada.
        aria-label={aberto ? "Fechar a conversa com a Vibrinha" : "Falar com um vendedor agora"}
        className="group fixed bottom-5 right-5 z-50 transition-[bottom] duration-300 [body[data-barra-compra]_&]:bottom-[5.5rem] md:[body[data-barra-compra]_&]:bottom-5 flex items-center gap-3 rounded-full bg-[#25D366] py-2.5 pl-2.5 pr-3 shadow-xl shadow-black/25 transition hover:brightness-105 sm:pr-5"
      >
        {/* A mascote no lugar do ícone genérico: é da casa, está na embalagem
            que o cliente já viu na prateleira, e dá rosto ao atendimento. */}
        <span className={`grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full bg-white/20 ${aberto ? "" : "pulso"}`}>
          <Image src="/vibrinha.png" alt="" width={44} height={44} className="h-10 w-10 object-contain" priority />
        </span>
        <span className="hidden leading-tight text-white sm:block">
          <span className="block text-[13.5px] font-extrabold">Falar com um vendedor agora</span>
          <span className="block text-[11px] font-semibold text-white/80">
            a Vibrinha responde na hora
          </span>
        </span>
      </button>
    </>
  );
}
