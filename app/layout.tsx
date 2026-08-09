import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { bannerAtivo } from "@/lib/banners";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_URL ?? "https://www.vibravert.com.br"),
  title: {
    default: "Vibra Vert — Bombas Submersas Vibratórias | Loja Oficial",
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

function Logotipo({ largura = 186 }: { largura?: number }) {
  return (
    <Image
      src="/logo-vibravert.png"
      alt="Vibra Vert — Bombas Submersas Vibratórias"
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

  return (
    <html lang="pt-BR">
      <body>
        {tarja && (
          <p className="bg-marca-escuro px-4 py-2 text-center text-[11.5px] font-bold text-white">
            {tarja.link ? (
              <Link href={tarja.link} className="underline decoration-white/40 underline-offset-2">
                {tarja.titulo}
              </Link>
            ) : (
              tarja.titulo
            )}
          </p>
        )}

        {/* Numa categoria em que o cliente está sem água, telefone converte
            mais que carrinho — por isso é o primeiro elemento da página. */}
        <div className="border-b border-linha bg-superficie-2">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-6 gap-y-1 px-5 py-1.5 text-[12.5px] text-tinta-2">
            <p className="font-medium">
              <span className="font-extrabold text-marca">VIBRA PHONE</span>{" "}
              <a href="tel:+551140002440" className="font-bold">11 4000-2440</a>
              <span className="text-mudo"> · falamos de bomba, não é SAC</span>
            </p>
            <p className="text-mudo">
              Fábrica e assistência técnica própria em São Paulo · Entregamos nos 27 estados
            </p>
          </div>
        </div>

        <header className="border-b border-linha bg-superficie">
          <div className="mx-auto flex max-w-7xl items-center gap-6 px-5 py-4">
            <Link href="/" aria-label="Página inicial">
              <Logotipo />
            </Link>
            <Link
              href="/bombas"
              className="hidden flex-1 rounded-lg border border-linha bg-superficie-2 px-3.5 py-2 text-sm font-medium text-mudo md:block"
            >
              Buscar por modelo, vazão ou voltagem…
            </Link>
            <nav className="ml-auto flex items-center gap-5 text-sm font-semibold text-tinta-2">
              <Link href="/pedidos">Meus pedidos</Link>
              <Link href="/carrinho">Carrinho</Link>
            </nav>
          </div>
          <nav className="mx-auto flex max-w-7xl gap-7 overflow-x-auto px-5 text-sm">
            {DEPARTAMENTOS.map((d) => (
              <Link
                key={d.href}
                href={d.href}
                className="whitespace-nowrap border-b-2 border-transparent py-3 font-semibold text-tinta-2 hover:border-marca hover:text-marca"
              >
                {d.rotulo}
              </Link>
            ))}
          </nav>
        </header>

        <main>{children}</main>

        <footer className="mt-16 border-t border-linha bg-superficie-2">
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
                <li><Link href="/quem-somos">Quem somos</Link></li>
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
