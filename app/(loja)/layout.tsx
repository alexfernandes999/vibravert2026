import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { bannerAtivo } from "@/lib/banners";
import { RedeLojas } from "@/components/rede-lojas";
import { resumoCarrinho } from "@/lib/carrinho";
import { Revelar } from "@/components/revelar";
import { FaixaAvisos } from "@/components/faixa-avisos";
import { Vibrinha } from "@/components/vibrinha";
import { RodapePagamento } from "@/components/rodape-pagamento";
import { RodapeCanais, RodapeRedes } from "@/components/rodape-canais";
import { RodapeNewsletter } from "@/components/rodape-newsletter";
import { AcoesCabecalho } from "@/components/acoes-cabecalho";
import "../globals.css";

import { TELEFONE, TELEFONE_LINK } from "@/lib/contato";
export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_URL || "https://www.vibravert.com.br"),
  title: {
    default: "Vibra Vert · Bombas Submersas Vibratórias | Loja Oficial",
    template: "%s | Loja Oficial Vibra Vert",
  },
  description:
    "Bomba sapo Vibra Vert e Rymer, direto da fábrica. Bombas submersas vibratórias para poço, com assistência técnica própria e envio para todo o Brasil.",
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "Loja Oficial Vibra Vert",
  },
  robots: { index: true, follow: true },
  // O X/Twitter ignora as tags og: e usa as próprias. Sem isto, o link
  // compartilhado lá aparece sem imagem.
  twitter: {
    card: "summary_large_image",
    title: "Bomba sapo direto da fábrica · Vibra Vert e Rymer",
    description:
      "Bombas submersas vibratórias para poço de 6\" e 8\", direto de quem fabrica desde 1974. Frete grátis em todas as bombas e 10% no PIX.",
  },
};

const DEPARTAMENTOS = [
  { href: "/bombas", rotulo: "Bombas Vibratórias" },
  { href: "/bombas?acompanha=boia", rotulo: "Com Boia de Nível" },
  { href: "/bombas?acompanha=kit", rotulo: "Kits de Manutenção" },
  // Aponta para a seção da home enquanto as peças não têm página própria:
  // um item de menu que leva a lugar nenhum é pior que não ter o item.
  { href: "/#pecas", rotulo: "Peças Originais" },
  { href: "/qual-bomba", rotulo: "Qual bomba eu preciso?" },
  { href: "/assistencia", rotulo: "Assistência técnica" },
];

/**
 * A tarja é a primeira linha da loja e precisa ser lida de relance.
 *
 * O texto vem do painel como uma frase separada por "·". Os trechos que
 * decidem a compra ganham peso, e os demais ficam mais discretos · assim a
 * frase tem hierarquia sem exigir que o comercial escreva HTML.
 *
 * O dourado alterna entre os trechos fortes. Com todos dourados, "frete grátis"
 * e "10% no PIX" ficavam colados na mesma cor e viravam uma mancha só: dois
 * argumentos que competem entre si em vez de se somarem.
 */
function destacar(texto: string) {
  let fortes = 0;
  return texto.split("·").map((parte, i, todas) => {
    const t = parte.trim();
    // Só a oferta é "forte". Com qualquer número contando, o "nº 1 dos
    // marketplaces" roubava o dourado da promessa que de fato vende.
    const forte = /(grátis|gratis|desconto|% |%$|off|sem juros|\d+×)/i.test(t);
    const dourado = forte && fortes++ % 2 === 0;
    return (
      <span key={i}>
        <span className={dourado ? "font-extrabold text-ouro" : forte ? "font-extrabold text-white" : "text-white/80"}>
          {t}
        </span>
        {i < todas.length - 1 && <span aria-hidden className="mx-2.5 text-white/25">•</span>}
      </span>
    );
  });
}

function Logotipo({ largura = 186 }: { largura?: number }) {
  return (
    <Image
      src="/logo-vibravert.png"
      alt="Vibra Vert · Bombas Submersas Vibratórias"
      width={largura}
      height={Math.round((largura * 222) / 640)}
      priority
    />
  );
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // A tarja do topo vem do banco, não do código: é o espaço mais visto da loja
  // e quem decide o que vai nele é o time comercial, não o desenvolvedor.
  const tarja = await bannerAtivo("TARJA_TOPO");
  const carrinho = await resumoCarrinho();

  return (
    <html lang="pt-BR">
      <head>
        {/* Marca que há JavaScript antes da primeira pintura. Só então o CSS
            esconde os blocos que a animação vai revelar. */}
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
      </head>
      <body>
        {tarja && (
          <div className="relative overflow-hidden bg-marca-escuro">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{ background: "radial-gradient(600px 200px at 50% 0%, rgba(245,185,33,.28), transparent 70%)" }}
            />
            <p className="relative px-4 py-3 text-center text-[13px] font-extrabold tracking-tight text-white sm:text-[15px]">
              {tarja.link ? (
                <Link href={tarja.link}>{destacar(tarja.titulo)}</Link>
              ) : (
                destacar(tarja.titulo)
              )}
            </p>
          </div>
        )}

        <FaixaAvisos />

        <header className="border-b-2 border-marca bg-superficie">
          <div className="mx-auto flex max-w-7xl items-center gap-6 px-5 py-4">
            <Link href="/" aria-label="Página inicial">
              <Logotipo />
            </Link>
            <form action="/busca" className="hidden flex-1 md:block">
              <input
                name="q"
                type="search"
                placeholder="bomba sapo, Rymer 1500, 220V, peça…"
                aria-label="Buscar no catálogo"
                className="w-full rounded-lg border border-linha bg-superficie-2 px-3.5 py-2 text-sm font-medium placeholder:text-mudo focus:border-marca focus:bg-superficie"
              />
            </form>
            <AcoesCabecalho qtd={carrinho.qtd} total={carrinho.total} />
          </div>
          <nav className="mx-auto flex max-w-7xl gap-7 overflow-x-auto px-5 text-sm">
            {DEPARTAMENTOS.map((d) => (
              <Link
                key={d.href}
                href={d.href}
                className="whitespace-nowrap border-b-[3px] border-transparent py-3 font-bold text-tinta-2 transition-colors hover:border-marca hover:text-marca"
              >
                {d.rotulo}
              </Link>
            ))}
          </nav>
        </header>

        <main>{children}</main>

        {/* Organization com logotipo e contato: é o que alimenta o painel de
            conhecimento do Google e o cartão de marca na busca. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "Vibra Vert Bombas Submersas Vibratórias",
              url: process.env.NEXT_PUBLIC_URL || "https://www.vibravert.com.br",
              logo: `${process.env.NEXT_PUBLIC_URL || ""}/logo-vibravert.png`,
              foundingDate: "1974",
              contactPoint: {
                "@type": "ContactPoint",
                telephone: TELEFONE_LINK,
                contactType: "vendas",
                areaServed: "BR",
                availableLanguage: "Portuguese",
              },
              sameAs: ["https://www.youtube.com/@vibravertbombassubmersasvi9020"],
            }),
          }}
        />

        <Vibrinha />
        <Revelar />

        <div className="mt-16 border-t border-linha bg-superficie">
          <RedeLojas />
        </div>

        <footer className="border-t border-linha bg-superficie-2">
          {/* 1 · newsletter  2 · canais  3 · menus e pagamento
              4 · endereço e redes  5 · dados da empresa */}
          <RodapeNewsletter />
          <RodapeCanais />

          <div className="mx-auto grid max-w-7xl gap-8 border-t border-linha px-5 py-10 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <Logotipo largura={158} />
              <p className="mt-3 max-w-xs text-[13px] leading-relaxed text-mudo">
                Fábrica brasileira de bombas submersas vibratórias. Linhas Vibra Vert e Rymer,
                com assistência técnica própria, feita na nossa fábrica em São Paulo.
              </p>
            </div>
            <div>
              <h2 className="mb-3 text-[11px] font-extrabold uppercase tracking-[0.14em] text-marca">
                Institucional
              </h2>
              <ul className="space-y-1.5 text-[13px] font-medium text-tinta-2">
                <li><Link href="/sobre">Quem somos</Link></li>
                <li><Link href="/politica-de-entrega">Política de entrega</Link></li>
                <li><Link href="/politica-de-troca">Política de troca</Link></li>
                <li><Link href="/politica-de-privacidade">Política de privacidade</Link></li>
                <li><Link href="/termos-de-uso">Termos de uso</Link></li>
              </ul>
            </div>
            <div>
              <h2 className="mb-3 text-[11px] font-extrabold uppercase tracking-[0.14em] text-marca">
                Ajuda
              </h2>
              <ul className="space-y-1.5 text-[13px] font-medium text-tinta-2">
                <li><Link href="/qual-bomba">Qual bomba eu preciso?</Link></li>
                <li><Link href="/assistencia">Assistência técnica</Link></li>
                <li><Link href="/fale-conosco">Fale conosco</Link></li>
                <li><Link href="/pedidos">Rastrear pedido</Link></li>
              </ul>
            </div>
            <div>
              <RodapePagamento />
            </div>
          </div>

          {/* Decreto 7.962/2013, art. 2º: razão social, CNPJ e endereço físico
              são obrigatórios em local de destaque no comércio eletrônico.
              Faltavam por inteiro.

              O CNPJ é o da matriz (0001-32) — a A Casa São Paulo é filial, e
              publicar o dela apontaria o consumidor para o estabelecimento
              errado na hora de reclamar. */}
          <div className="border-t border-linha">
            {/* O endereço aparecia aqui e de novo no bloco legal logo abaixo.
                Repetido em duas linhas seguidas parece erro de montagem · fica
                só no bloco obrigatório, que é onde a lei exige. */}
            <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-3 px-5 py-4">
              <div className="flex items-center gap-3">
                <span className="text-[11px] font-extrabold uppercase tracking-[0.13em] text-mudo">
                  Redes
                </span>
                <RodapeRedes />
              </div>
            </div>
          </div>

          <div className="border-t border-linha px-5 py-5">
            <address className="mx-auto max-w-7xl text-center text-[11.5px] font-medium not-italic leading-relaxed text-mudo">
              <strong className="font-bold text-tinta-2">ARF Comércio de Bombas e Máquinas Ltda.</strong>
              <br />
              CNPJ 20.550.456/0001-32 · Inscrição Estadual 143.681.793.116
              <br />
              Rua Charles Darwin, 707 · Vila Santa Catarina · São Paulo/SP · CEP 04379-074 · Brasil
              <br />
              <a href="mailto:sac@vibravert.com.br" className="font-semibold text-marca">
                sac@vibravert.com.br
              </a>
              {" · "}
              <a href={`tel:${TELEFONE_LINK}`} className="font-semibold text-marca">
                Vibra Phone {TELEFONE}
              </a>
            </address>
            <p className="mt-3 text-center text-[11.5px] font-medium text-tenue">
              © {new Date().getFullYear()} Vibra Vert Bombas Submersas Vibratórias · Indústria Brasileira
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
