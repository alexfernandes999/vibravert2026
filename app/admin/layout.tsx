import type { Metadata } from "next";

/**
 * Layout externo do painel: só metadados, sem verificação.
 *
 * A verificação vive em (painel)/layout.tsx. Quando ela estava aqui, a própria
 * tela de login caía sob a regra e se redirecionava para si mesma — laço
 * infinito, tela em branco, e nenhum erro no log para explicar.
 */
export const metadata: Metadata = {
  title: "Administração",
  robots: { index: false, follow: false },
};

export default function AdminRaiz({ children }: { children: React.ReactNode }) {
  return children;
}
