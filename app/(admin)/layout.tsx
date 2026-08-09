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
  title: { default: "Administração", template: "%s · Administração" },
  robots: { index: false, follow: false },
};

export default function RaizAdmin({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="bg-fundo">{children}</body>
    </html>
  );
}
