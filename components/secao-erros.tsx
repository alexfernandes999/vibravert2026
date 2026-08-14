import Link from "next/link";

/**
 * Os 11 erros que queimam uma bomba sapo.
 *
 * A maior parte do que chega na bancada não é defeito de fábrica: é
 * instalação. Publicar isso faz três coisas ao mesmo tempo — reduz devolução
 * indevida, vende kit de reparo, e é o tipo de conteúdo que o cliente procura
 * no Google antes de procurar a bomba.
 *
 * Cada erro vem com o sintoma entre aspas, do jeito que o cliente descreve no
 * telefone. É assim que ele reconhece o próprio problema: ninguém liga dizendo
 * "altura manométrica acima do especificado", liga dizendo "não sobe a água".
 *
 * Os ícones são desenhados aqui, com um traço só. Quando chegar o arquivo de
 * arte da embalagem, os vetores de lá entram no lugar destes — mas redesenhados
 * na identidade Vibra Vert, e sem a marca que está na embalagem original.
 */
const ERROS = [
  {
    t: "Ligação em tensão incorreta",
    d: "variação de mais ou menos 5% já basta",
    sintoma: "queimou",
    icone: <><path d="M13 2L4.5 13.5H11L9.5 22 19 10h-6.5z" /></>,
  },
  {
    t: "Uso em líquido que não seja água limpa",
    d: "areia, barro ou química atacam a borracha",
    sintoma: "perde força, entope",
    icone: <><path d="M12 2.7S5.5 9.4 5.5 14a6.5 6.5 0 0013 0C18.5 9.4 12 2.7 12 2.7z" /><path d="M8 15c.6 1.6 2 2.7 3.6 3" /></>,
  },
  {
    t: "Bomba encostando no fundo do poço",
    d: "precisa de 40 cm de folga, no mínimo",
    sintoma: "vibração e quebra",
    icone: <><path d="M12 3v11" /><path d="M8 10l4 4 4-4" /><path d="M4 20h16" /></>,
  },
  {
    t: "Entrada da bomba fora d'água",
    d: "tem que ficar totalmente submersa",
    sintoma: "liga mas não puxa",
    icone: <><path d="M2 15c2.5-2 5-2 7.5 0s5 2 7.5 0 3.5-1.6 5-.6" /><rect x="9" y="3" width="6" height="9" rx="1.5" /></>,
  },
  {
    t: "Cabo de segurança esticado",
    d: "precisa de folga para a bomba trabalhar",
    sintoma: "trinca ou cai",
    icone: <><path d="M4 4v16" /><path d="M4 6h11a4 4 0 010 8H9" /><path d="M12 11l-3 3 3 3" /></>,
  },
  {
    t: "Bomba encostando nas laterais do poço",
    d: "tem que ficar centralizada",
    sintoma: "barulho e desgaste",
    icone: <><path d="M5 3v18M19 3v18" /><rect x="9.5" y="7" width="5" height="10" rx="1.5" /></>,
  },
  {
    t: "Altura acima do que a bomba entrega",
    d: "cada modelo tem um limite de coluna d'água",
    sintoma: "não sobe a água",
    icone: <><path d="M12 20V5" /><path d="M7 10l5-5 5 5" /><path d="M4 20h16" /></>,
  },
  {
    t: "Bomba pendurada pelo cabo elétrico",
    d: "o peso vai no cabo de segurança, nunca no elétrico",
    sintoma: "o cabo arrebenta e a bomba cai",
    icone: <><path d="M12 3v7" /><rect x="8" y="10" width="8" height="11" rx="2" /><path d="M9 3h6" /></>,
  },
  {
    t: "Válvula, registro ou torneira restringindo o fluxo",
    d: "a bomba trabalha contra a própria saída",
    sintoma: "perde pressão e esquenta",
    icone: <><path d="M3 12h6M15 12h6" /><circle cx="12" cy="12" r="3" /><path d="M12 5v4M12 15v4" /></>,
  },
  {
    t: "Instalação fora do manual",
    d: "o manual vem na caixa e leva cinco minutos",
    sintoma: "vários",
    icone: <><path d="M4 4h9a3 3 0 013 3v13a2.5 2.5 0 00-2.5-2.5H4z" /><path d="M20 4h-4v13.5h1.5A2.5 2.5 0 0120 20z" /></>,
  },
  {
    t: "Mangueira dobrada",
    d: "vinco fecha a passagem sem aparecer por fora",
    sintoma: "não sai água",
    icone: <><path d="M5 4v7a5 5 0 005 5h3" /><path d="M11 13l3 3-3 3" /><path d="M19 4v16" /></>,
  },
];

/** Os sete passos do manual, do jeito que a fábrica escreve. */
const PASSOS = [
  "Certifique-se de que a voltagem da rede é a mesma indicada na bomba.",
  "Instale com mangueira de polietileno de parede mínima de 2 mm, no diâmetro da saída da bomba.",
  "Acople a mangueira à bomba com a abraçadeira que vem no kit de instalação.",
  "Conecte o cabo elétrico à rede, isolando a emenda com fita de auto fusão.",
  "Mantenha 40 cm de distância do fundo do poço, com a bomba totalmente submersa.",
  "Instale a curva suporte na mangueira, observando o sentido do fluxo indicado pela seta.",
  "Mantenha a bomba centralizada em relação às paredes do poço.",
];

export function SecaoErros() {
  return (
    <section id="erros" className="scroll-mt-16 border-t border-linha bg-superficie">
      <div className="mx-auto max-w-7xl px-5 py-14">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-marca">
          Antes que aconteça
        </p>
        <h2 className="revelar mt-2 max-w-3xl text-3xl font-extrabold tracking-tight text-balance">
          Os 11 erros que queimam uma bomba sapo
        </h2>
        <p className="revelar mt-3 max-w-2xl text-[15px] leading-relaxed text-tinta-2">
          A maioria dos problemas que chega na nossa bancada não é defeito de fábrica · é
          instalação. Veja o que evitar.
        </p>

        <ol className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ERROS.map((e, i) => (
            <li
              key={e.t}
              className="revelar group flex gap-3 rounded-caixa border border-linha bg-superficie-2 p-4 transition duration-300 hover:-translate-y-0.5 hover:border-marca hover:shadow-lg hover:shadow-marca/10"
              style={{ transitionDelay: `${(i % 3) * 50}ms` }}
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-superficie text-marca transition group-hover:bg-marca group-hover:text-white">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
                  strokeLinecap="round" strokeLinejoin="round" className="h-[22px] w-[22px]">
                  {e.icone}
                </svg>
              </span>
              <span className="min-w-0">
                <span className="block text-[13.8px] font-extrabold leading-tight">
                  <span className="num mr-1.5 text-mudo">{String(i + 1).padStart(2, "0")}</span>
                  {e.t}
                </span>
                <span className="mt-1 block text-[12.5px] leading-snug text-mudo">{e.d}</span>
                {/* O sintoma entre aspas é o gancho: é a frase que o cliente
                    usa ao telefone, e é por ela que ele se reconhece. */}
                <span className="mt-1.5 block text-[12.5px] font-bold text-marca">
                  “{e.sintoma}”
                </span>
              </span>
            </li>
          ))}
        </ol>

        {/* ── isso não é defeito ─────────────────────────────────── */}
        <div className="revelar mt-8 overflow-hidden rounded-caixa border border-marca/25 bg-marca-suave">
          <div className="grid gap-6 p-6 md:grid-cols-[1.4fr_1fr] md:p-8">
            <div>
              <h3 className="text-2xl font-extrabold tracking-tight text-marca">
                Isso aqui não é defeito
              </h3>
              <p className="mt-3 max-w-xl text-[14.5px] leading-relaxed text-tinta-2">
                Com o tempo, as borrachas da bomba · canopla, ventosa, amortecedor e válvula · se
                desgastam naturalmente. A bomba perde pressão e parece que está morrendo. Não está:
                é peça de desgaste, e a troca é simples.
              </p>
              <p className="mt-3 text-[14.5px] font-extrabold text-tinta">
                Toda bomba precisa de uma troca de borracha por ano.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href="/bombas?acompanha=kit"
                  className="rounded-lg bg-marca px-5 py-3 text-[13.5px] font-bold text-white shadow-lg shadow-marca/25 transition hover:brightness-110 active:scale-[0.98]"
                >
                  Comprar kit de reparo
                </Link>
                <Link
                  href="/#videos"
                  className="rounded-lg border border-marca bg-superficie px-5 py-3 text-[13.5px] font-bold text-marca transition hover:bg-marca-suave"
                >
                  Ver o vídeo de como trocar
                </Link>
              </div>
            </div>

            {/* ── os 7 passos ──────────────────────────────────── */}
            <div className="rounded-caixa border border-linha bg-superficie p-5">
              <h4 className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-marca">
                Instalação correta, em 7 passos
              </h4>
              <ol className="mt-3 space-y-2.5">
                {PASSOS.map((p, i) => (
                  <li key={p} className="flex gap-2.5 text-[12.8px] leading-snug text-tinta-2">
                    <span className="num grid h-5 w-5 shrink-0 place-items-center rounded-md bg-marca-suave text-[10.5px] font-extrabold text-marca">
                      {i + 1}
                    </span>
                    {p}
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
