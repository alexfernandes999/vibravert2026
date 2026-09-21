import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { brl, precoPix, parcela, PARCELAS_MAX, DESCONTO_PIX, litros } from "@/lib/formato";
import { FRETE_GRATIS_EM_BOMBAS } from "@/lib/loja";
import { Medir } from "@/components/medir";
import { VerLista } from "@/components/rastreio";
import { CartaoBombaLanding, type ModeloCartao } from "@/components/cartao-bomba-landing";
import { FormularioIndicacao } from "@/components/formulario-indicacao";
import { TELEFONE, whatsappLink } from "@/lib/contato";

const SITE = process.env.NEXT_PUBLIC_URL || "https://www.vibravert.com.br";
const LISTA = "Bomba para poço · página de campanha";

/**
 * Página de campanha para quem procura bomba de poço no Google.
 *
 * Quem cai aqui vem de uma busca comparativa e ainda não sabe qual modelo
 * serve. A página responde na ordem em que a dúvida aparece: em que poço
 * entra, quanto entrega, quanto custa e quem garante · e oferece um vendedor
 * para quem continua na dúvida, que é a maioria.
 *
 * Nenhum concorrente é citado. Os nomes de marca rival ficam só nas palavras
 * que compram o clique, nunca no texto: comparar marca por nome numa página
 * própria é convite a reclamação e não vende nada.
 *
 * Preço, vazão, voltagem e garantia saem do cadastro da loja em cada carga da
 * página. Repetir número em código é como duas verdades passam a existir.
 */
export const revalidate = 300;

export const metadata: Metadata = {
  title: "Bomba Para Poço com Preço de Fábrica | Vibra Vert Bombas",
  description:
    "Compre bomba para poço, bomba sapo e bomba submersa direto da fábrica. Preços a partir de R$ 199,90 no PIX, 10% de desconto no PIX, até 10× sem juros, garantia de fábrica e envio para todo o Brasil.",
  alternates: { canonical: "/bomba-sapo/alternativa" },
  openGraph: {
    title: "Bomba Para Poço com Preço de Fábrica | Vibra Vert Bombas",
    description:
      "Bomba sapo e bomba submersa para poço de 6 e 8 polegadas, 110V e 220V, direto de quem fabrica desde 1974.",
    url: `${SITE}/bomba-sapo/alternativa`,
    type: "website",
  },
};

/** Os modelos principais, na ordem do mais barato para o mais forte. */
const VITRINE = ["RY-15A", "RY-20A", "RY-25A", "VT-6A", "VT-8A", "VT-9A"];

const TITULO: Record<string, { titulo: string; marca: string }> = {
  "RY-15A": { titulo: "Rymer 1500", marca: "Rymer" },
  "RY-20A": { titulo: "Rymer 2000", marca: "Rymer" },
  "RY-25A": { titulo: "Rymer 2500", marca: "Rymer" },
  "VT-6A": { titulo: "Vibrinha", marca: "Vibra Vert" },
  "VT-8A": { titulo: "Vibra Vert 800", marca: "Vibra Vert" },
  "VT-9A": { titulo: "Vibra Vert 900", marca: "Vibra Vert" },
};

const PERGUNTAS = [
  {
    p: "Qual bomba serve para poço caipira?",
    r: "Poço caipira costuma ser escavado e largo, com água que pode trazer areia fina. Para ele o que decide é a profundidade e a altura até a caixa d'água: quanto mais alto a água precisa subir, menos a bomba entrega. Qualquer modelo desta página atende poço caipira dentro do diâmetro indicado · o cuidado é deixar a bomba sem encostar no fundo, para não sugar barro.",
  },
  {
    p: "Qual bomba submersa usar em poço de 6 polegadas?",
    r: "As linhas Rymer 1500, 2000 e 2500 são as que entram em poço de 6 polegadas. A diferença entre elas é a vazão: quanto maior o número, mais água por hora.",
  },
  {
    p: "Qual bomba usar em poço de 8 polegadas?",
    r: "A Vibrinha, a Vibra Vert 800 e a Vibra Vert 900 são feitas para poço de 8 polegadas. A 900 é a de maior vazão da linha.",
  },
  {
    p: "Bomba sapo funciona em 110V e 220V?",
    r: "Cada bomba é fabricada para uma tensão só. Todos os modelos desta página existem em 110/127V e em 220V · a escolha é feita na própria página do produto, e ligar em tensão errada queima o equipamento e perde a garantia.",
  },
  {
    p: "Qual a diferença entre os modelos Rymer e Vibra Vert?",
    r: "São as duas linhas da mesma fábrica. A Rymer é a linha para poço de 6 polegadas; a Vibra Vert, para poço de 8 polegadas, com vazão maior e garantia de 2 anos nos modelos 800, 900 e Vibrinha.",
  },
  {
    p: "Como escolher a vazão ideal?",
    r: "Some o consumo da casa e veja a altura entre a bomba e a caixa d'água. A vazão do catálogo é a máxima, medida sem altura: a cada metro que a água precisa subir, a entrega cai. Na página de cada bomba há a curva completa, que mostra quanto ela entrega na altura da sua instalação.",
  },
  {
    p: "A bomba tem garantia?",
    r: "Tem garantia de fábrica, e o prazo aparece na página de cada modelo porque muda de um para o outro. A assistência técnica é da própria fábrica, em São Paulo · não é posto terceirizado.",
  },
  {
    p: "A loja entrega para todo o Brasil?",
    r: "Sim, para os 27 estados, com frete grátis nas bombas. O prazo aparece no checkout depois do CEP.",
  },
];

export default async function BombaParaPoco() {
  const produtos = await prisma.produto.findMany({
    where: { ativo: true, sku: { in: VITRINE } },
    select: {
      sku: true, slug: true, nome: true, marca: true, preco: true, ean: true,
      voltagem: true, pocoPolegadas: true, vazaoMaxima: true, familia: true, tipo: true,
      estoque: { select: { quantidade: true } },
      especificacoes: { select: { nome: true, valor: true } },
      imagens: { where: { principal: true }, select: { url: true, alt: true }, take: 1 },
    },
  });

  // As duas tensões de cada modelo, para o cartão dizer que existem as duas.
  const familias = await prisma.produto.findMany({
    where: { ativo: true, familia: { in: produtos.map((p) => p.familia).filter(Boolean) as string[] } },
    select: { familia: true, voltagem: true },
  });

  const modelos: ModeloCartao[] = VITRINE.map((sku) => {
    const p = produtos.find((x) => x.sku === sku);
    if (!p) return null;
    const preco = Number(p.preco);
    const tensoes = [
      ...new Set(familias.filter((f) => f.familia === p.familia).map((f) => f.voltagem).filter(Boolean)),
    ] as string[];
    return {
      sku: p.sku,
      slug: p.slug,
      nome: p.nome,
      marca: TITULO[sku]?.marca ?? p.marca,
      titulo: TITULO[sku]?.titulo ?? p.nome,
      poco: p.pocoPolegadas,
      voltagens: tensoes.length > 1 ? "110V e 220V" : tensoes[0] ?? p.voltagem ?? "",
      vazao: p.vazaoMaxima ? litros(p.vazaoMaxima) : null,
      garantia: p.especificacoes.find((e) => e.nome === "Garantia")?.valor ?? null,
      preco,
      precoCheio: brl(preco),
      precoPix: brl(precoPix(preco)),
      parcela: brl(parcela(preco)),
      imagem: p.imagens[0] ?? null,
      freteGratis: FRETE_GRATIS_EM_BOMBAS && p.tipo === "BOMBA",
      categoria: "Bombas Submersas Vibratórias",
    };
  }).filter(Boolean) as ModeloCartao[];

  const maisBarata = Math.min(...modelos.map((m) => m.preco));
  const capa = modelos.find((m) => m.sku === "VT-9A")?.imagem ?? modelos[0]?.imagem ?? null;

  const itens = modelos.map((m) => ({
    sku: m.sku,
    quantidade: 1,
    precoUnitario: m.preco,
    nome: m.nome,
    marca: m.marca,
    categoria: m.categoria,
    variacao: m.voltagens,
  }));

  const disponivel = (q?: number | null) =>
    q === undefined || q === null || q > 0
      ? "https://schema.org/InStock"
      : "https://schema.org/OutOfStock";

  const listaJson = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Bombas para poço · Vibra Vert Bombas",
    itemListElement: modelos.map((m, i) => {
      const p = produtos.find((x) => x.sku === m.sku)!;
      return {
        "@type": "ListItem",
        position: i + 1,
        item: {
          "@type": "Product",
          name: p.nome,
          sku: p.sku,
          mpn: p.sku,
          ...(p.ean ? { gtin13: p.ean } : {}),
          brand: { "@type": "Brand", name: m.marca },
          image: m.imagem ? [m.imagem.url] : [],
          url: `${SITE}/produto/${p.slug}`,
          offers: {
            "@type": "Offer",
            url: `${SITE}/produto/${p.slug}`,
            price: m.preco.toFixed(2),
            priceCurrency: "BRL",
            priceValidUntil: new Date(Date.now() + 365 * 864e5).toISOString().slice(0, 10),
            availability: disponivel(p.estoque?.quantidade),
            itemCondition: "https://schema.org/NewCondition",
            seller: { "@type": "Organization", name: "Vibra Vert" },
          },
        },
      };
    }),
  };

  const faqJson = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: PERGUNTAS.map((q) => ({
      "@type": "Question",
      name: q.p,
      acceptedAnswer: { "@type": "Answer", text: q.r },
    })),
  };

  const trilhaJson = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Início", item: SITE },
      { "@type": "ListItem", position: 2, name: "Bomba para poço", item: `${SITE}/bomba-sapo/alternativa` },
    ],
  };

  return (
    <article>
      {/* É uma entrada na loja, não a ficha de um produto · marcar como
          produto inflaria a etapa do funil que mede interesse em um modelo. */}
      <Medir etapa="VISITA" />
      <VerLista lista={LISTA} itens={itens} />

      {/* ── topo ─────────────────────────────────────────────── */}
      <section className="border-b border-linha bg-gradient-to-br from-marca-suave via-superficie-2 to-superficie">
        <div className="mx-auto grid max-w-7xl items-center gap-8 px-5 py-10 md:grid-cols-[1.15fr_1fr] md:py-14">
          <div>
            <p className="text-[10.5px] font-extrabold uppercase tracking-[0.16em] text-marca">
              Loja oficial · Vibra Vert Bombas
            </p>
            <h1 className="mt-3 text-[32px] font-extrabold leading-[1.1] tracking-tight text-balance md:text-5xl">
              Bomba para poço com preço de fábrica
            </h1>
            <p className="mt-4 max-w-xl text-[15.5px] leading-relaxed text-tinta-2">
              Compare vazão, voltagem, garantia e preço. Encontre a bomba submersa ideal para o seu
              poço e compre direto da fábrica · modelos para poço de 6 e 8 polegadas, em 110V e 220V.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href="#modelos"
                className="rounded-lg bg-ouro px-6 py-3.5 text-[15px] font-extrabold text-ouro-txt shadow-lg shadow-ouro/25"
              >
                Ver bombas com preço de fábrica
              </a>
              <a
                href="#indicacao"
                className="rounded-lg border-[1.5px] border-marca px-6 py-3.5 text-[15px] font-extrabold text-marca"
              >
                Preciso de ajuda para escolher
              </a>
            </div>

            <ul className="mt-7 grid grid-cols-2 gap-x-5 gap-y-3 sm:grid-cols-4">
              {[
                ["A partir de", brl(precoPix(maisBarata))],
                ["No PIX", `${DESCONTO_PIX * 100}% de desconto`],
                ["No cartão", `até ${PARCELAS_MAX}× sem juros`],
                ["Frete", "grátis para o Brasil"],
              ].map(([r, v]) => (
                <li key={r}>
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-mudo">{r}</p>
                  <p className="num text-[14.5px] font-extrabold leading-tight text-marca-escuro">{v}</p>
                </li>
              ))}
            </ul>
          </div>

          {capa && (
            <div className="relative mx-auto aspect-square w-full max-w-[380px] overflow-hidden rounded-caixa border border-linha bg-white">
              <Image
                src={capa.url}
                alt={capa.alt || "Bomba submersa para poço Vibra Vert"}
                fill
                priority
                sizes="(max-width: 768px) 80vw, 380px"
                className="object-contain p-4"
              />
            </div>
          )}
        </div>
      </section>

      {/* ── faixa de confiança ───────────────────────────────── */}
      <section className="border-b border-linha bg-superficie">
        <ul className="mx-auto grid max-w-7xl grid-cols-2 gap-x-5 gap-y-4 px-5 py-6 sm:grid-cols-3 lg:grid-cols-6">
          {[
            ["Loja oficial", "Vibra Vert Bombas"],
            ["Fábrica", "em São Paulo"],
            ["No ramo", "desde 1974"],
            ["Garantia", "de fábrica"],
            ["Assistência", "técnica própria"],
            ["Envio", "para todo o Brasil"],
          ].map(([t, d]) => (
            <li key={t} className="flex gap-2.5">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-marca">
                <path d="M12 3l8 3v6c0 5-3.4 8.1-8 9-4.6-.9-8-4-8-9V6z" />
                <path d="M9 12l2 2 4-4" />
              </svg>
              <span className="text-[13px] leading-snug">
                <strong className="block font-extrabold">{t}</strong>
                <span className="text-mudo">{d}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* ── modelos ──────────────────────────────────────────── */}
      <section id="modelos" className="mx-auto max-w-7xl scroll-mt-20 px-5 py-11">
        <h2 className="text-[26px] font-extrabold tracking-tight">Escolha a bomba ideal</h2>
        <p className="mt-1.5 max-w-2xl text-[14.5px] leading-relaxed text-tinta-2">
          O primeiro filtro é o diâmetro do poço. Depois vem a vazão, que é quanta água a bomba
          entrega por hora. Todos os modelos existem em 110V e 220V.
        </p>

        <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-3">
          {modelos.map((m) => (
            <CartaoBombaLanding key={m.sku} m={m} lista={LISTA} />
          ))}
        </div>

        <p className="mt-5 text-[13.5px] text-mudo">
          Também temos as versões com boia de nível e com kit de manutenção.{" "}
          <Link href="/bombas" className="font-bold text-marca underline underline-offset-2">
            Ver a linha completa
          </Link>
        </p>
      </section>

      {/* ── orientação ───────────────────────────────────────── */}
      <section className="border-y border-linha bg-superficie">
        <div className="mx-auto max-w-7xl px-5 py-11">
          <h2 className="text-[26px] font-extrabold tracking-tight">Qual bomba para poço eu preciso?</h2>
          <p className="mt-1.5 max-w-2xl text-[14.5px] leading-relaxed text-tinta-2">
            Quatro respostas resolvem quase todos os casos. Se ficar dúvida em alguma, fale com a
            fábrica antes de comprar · bomba errada no poço é o motivo número um de devolução.
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[
              ["Meu poço é de 6 ou 8 polegadas?", "É a medida da boca do poço, não da profundidade. Na dúvida, meça o tubo: 6 polegadas dão cerca de 15 cm de diâmetro interno e 8 polegadas, cerca de 20 cm."],
              ["Preciso de 110V ou 220V?", "É a tensão da tomada onde a bomba vai ligar. Cada bomba é fabricada para uma só · ligar na errada queima o motor e perde a garantia."],
              ["Qual profundidade e vazão preciso?", "Meça a altura entre a bomba e a caixa d'água. A vazão do catálogo é a máxima, sem altura: a curva na página do produto mostra quanto sobra na sua instalação."],
              ["Preciso de boia automática?", "A boia desliga a bomba sozinha quando a caixa enche ou quando o poço baixa. Evita trabalhar seca, que é o que mais queima bomba."],
              ["Qual modelo atende poço caipira?", "Qualquer um dentro do diâmetro certo. O cuidado é pendurar a bomba longe do fundo, para não sugar barro e areia."],
              ["Quando escolher uma bomba submersa?", "Quando a água está abaixo do nível do chão. A bomba submersa trabalha dentro do poço e empurra a água para cima, em vez de puxar da superfície."],
            ].map(([p, r]) => (
              <div key={p} className="rounded-caixa border border-linha bg-fundo p-4">
                <h3 className="text-[14.5px] font-extrabold leading-snug">{p}</h3>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-tinta-2">{r}</p>
              </div>
            ))}
          </div>

          <a
            href="#indicacao"
            className="mt-6 inline-block rounded-lg bg-marca px-6 py-3.5 text-[15px] font-extrabold text-white shadow-lg shadow-marca/20"
          >
            Falar com um especialista
          </a>
        </div>
      </section>

      {/* ── formulário ───────────────────────────────────────── */}
      <section id="indicacao" className="mx-auto max-w-3xl scroll-mt-20 px-5 py-11">
        <h2 className="text-[26px] font-extrabold tracking-tight">Encontre a bomba ideal para o seu poço</h2>
        <p className="mt-1.5 text-[14.5px] leading-relaxed text-tinta-2">
          Conte o que você tem e um vendedor da fábrica indica o modelo. Se preferir, fale direto
          no WhatsApp{" "}
          <a href={whatsappLink("Olá! Quero ajuda para escolher a bomba do meu poço.")} target="_blank" rel="noopener" className="font-bold text-marca underline underline-offset-2">
            {TELEFONE}
          </a>
          .
        </p>

        <div className="mt-6 rounded-caixa border border-linha bg-superficie p-5 sm:p-6">
          <FormularioIndicacao id="form-indicacao" />
        </div>
      </section>

      {/* ── compra segura ────────────────────────────────────── */}
      <section className="border-y border-linha bg-superficie">
        <div className="mx-auto max-w-7xl px-5 py-11">
          <h2 className="text-[26px] font-extrabold tracking-tight">
            Compra direta da fábrica, com suporte de verdade
          </h2>
          <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              ["Garantia de fábrica", "O prazo de cada modelo está na página do produto, porque muda de um para o outro."],
              ["Assistência técnica própria", "Quem conserta é a fábrica, em São Paulo · não é posto terceirizado."],
              ["Pagamento seguro", `PIX com ${DESCONTO_PIX * 100}% de desconto, cartão em até ${PARCELAS_MAX}× sem juros e boleto.`],
              ["Envio para todo o Brasil", "Frete grátis nas bombas, para os 27 estados."],
              ["Ajuda para escolher", "Antes de comprar, alguém que conhece o produto responde qual modelo serve."],
              ["Peças e manutenção", "A mesma fábrica fornece boia, kit de manutenção e peças de reposição."],
            ].map(([t, d]) => (
              <li key={t} className="rounded-caixa border border-linha bg-fundo p-4">
                <p className="text-[14.5px] font-extrabold">{t}</p>
                <p className="mt-1 text-[13.5px] leading-relaxed text-tinta-2">{d}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── perguntas frequentes ─────────────────────────────── */}
      <section className="mx-auto max-w-3xl px-5 py-11">
        <h2 className="text-[26px] font-extrabold tracking-tight">Perguntas frequentes</h2>
        <div className="mt-5 divide-y divide-linha rounded-caixa border border-linha bg-superficie">
          {PERGUNTAS.map((q) => (
            <details key={q.p} className="group px-5 py-4">
              <summary className="flex cursor-pointer list-none items-center gap-3 text-[15px] font-extrabold leading-snug">
                <span className="flex-1">{q.p}</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden className="h-4 w-4 shrink-0 text-marca transition-transform group-open:rotate-45">
                  <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                </svg>
              </summary>
              <p className="mt-2 text-[14px] leading-relaxed text-tinta-2">{q.r}</p>
            </details>
          ))}
        </div>

        <div className="mt-8 rounded-caixa border border-marca-linha bg-marca-suave p-6 text-center">
          <p className="text-[18px] font-extrabold tracking-tight text-marca-escuro">
            Ainda em dúvida sobre o modelo?
          </p>
          <p className="mx-auto mt-1.5 max-w-lg text-[14px] leading-relaxed text-tinta-2">
            Diga o diâmetro do poço e a voltagem da sua propriedade · a fábrica indica a bomba certa.
          </p>
          <a
            href="#indicacao"
            className="mt-4 inline-block rounded-lg bg-marca px-6 py-3.5 text-[15px] font-extrabold text-white"
          >
            Receber indicação de bomba
          </a>
        </div>
      </section>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(listaJson) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJson) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(trilhaJson) }} />
    </article>
  );
}
