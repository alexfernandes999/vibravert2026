import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { bannerAtivo } from "@/lib/banners";
import { RedeLojas } from "@/components/rede-lojas";
import { resumoCarrinho } from "@/lib/carrinho";
import { Revelar } from "@/components/revelar";
import { FaixaAvisos } from "@/components/faixa-avisos";
import { Vibrinha } from "@/components/vibrinha";
import { AcoesCabecalho } from "@/components/acoes-cabecalho";
import "../globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_URL ?? "https://www.vibravert.com.br"),
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
};

const DEPARTAMENTOS = [
  { href: "/bombas", rotulo: "Bombas Vibratórias" },
  { href: "/bombas?acompanha=boia", rotulo: "Com Boia de Nível" },
  { href: "/bombas?acompanha=kit", rotulo: "Kits de Manutenção" },
  { href: "/qual-bomba", rotulo: "Qual bomba eu preciso?" },
  { href: "/assistencia", rotulo: "Assistência técnica" },
];

/**
 * A tarja é a primeira linha da loja e precisa ser lida de relance.
 *
 * O texto vem do painel como uma frase separada por "·". Aqui os números e os
 * termos que decidem a compra ganham o dourado, e o resto fica branco: assim a
 * frase tem hierarquia sem exigir que o comercial escreva HTML.
 */
function destacar(texto: string) {
  return texto.split("·").map((parte, i, todas) => {
    const t = parte.trim();
    const forte = /(\d|grátis|gratis|desconto|off|frete)/i.test(t);
    return (
      <span key={i}>
        <span className={forte ? "text-ouro" : "text-white/85"}>{t}</span>
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

        <Vibrinha />
        <Revelar />

        <div className="mt-16 border-t border-linha bg-superficie">
          <RedeLojas />
        </div>

        <footer className="border-t border-linha bg-superficie-2">
          <div className="mx-auto grid max-w-7xl gap-8 px-5 py-10 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <Logotipo largura={158} />
              <p className="mt-3 max-w-xs text-[13px] leading-relaxed text-mudo">
                Fábrica brasileira de bombas submersas vibratórias. Linhas Vibra Vert e Rymer,
                com assistência técnica própria e rede de postos autorizados em todo o país.
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
                <li><Link href="/assistencia">Postos autorizados</Link></li>
                <li><Link href="/fale-conosco">Fale conosco</Link></li>
                <li><Link href="/pedidos">Rastrear pedido</Link></li>
              </ul>
            </div>
            <div>
              <h2 className="mb-3 text-[11px] font-extrabold uppercase tracking-[0.14em] text-marca">
                Pagamento
              </h2>
              <p className="text-[13px] font-medium text-tinta-2">
                PIX · Cartão em até {6}× · Boleto
              </p>
              <p className="mt-4 text-[13px] font-medium text-tinta-2">
                Atendimento de segunda a sexta, das 8h às 18h
              </p>
            </div>
          </div>
          <div className="border-t border-linha px-5 py-4 text-center text-[11.5px] font-medium text-mudo">
            © {new Date().getFullYear()} Vibra Vert Bombas Submersas Vibratórias · Indústria Brasileira
          </div>
        </footer>
      </body>
    </html>
  );
}
