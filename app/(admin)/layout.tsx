import type { Metadata } from "next";
import "../globals.css";

/**
 * Raiz do painel, separada da raiz da loja.
 *
 * Enquanto o painel ficava sob o layout da loja, ele herdava a tarja
 * promocional, o telefone, a busca e o menu de departamentos — tudo aquilo
 * existe para vender a quem chega de fora, e não para quem já está lá dentro
 * separando pedido. No Next isso não se resolve escondendo o cabeçalho: são
 * dois grupos de rota, cada um com a sua raiz.
 */
export const metadata: Metadata = {
  title: { default: "Administração · Vibra Vert", template: "%s · Administração" },
  robots: { index: false, follow: false },
  // O painel usa o mesmo ícone da loja: quem opera costuma ter as duas abas
  // abertas, e reconhecer a aba pelo desenho vale mais do que diferenciá-las.
  icons: { icon: "/icon.png", apple: "/apple-icon.png" },
};

export default function RaizAdmin({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="bg-fundo">{children}</body>
    </html>
  );
}
