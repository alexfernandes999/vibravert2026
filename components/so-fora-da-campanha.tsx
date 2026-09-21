"use client";

import { usePathname } from "next/navigation";

/**
 * Esconde um bloco nas páginas de campanha.
 *
 * O rodapé leva às outras lojas do grupo, com os logotipos delas. Na loja
 * normal isso é útil · quem procura uma centrífuga encontra onde comprar. Numa
 * página que recebe clique pago é o contrário: paga-se pela visita e ela sai
 * para outro catálogo antes de ver o preço.
 *
 * Some também o nome de outras marcas do texto da página de anúncio, que é o
 * que a campanha pede.
 */
const CAMPANHAS = ["/bomba-sapo"];

export function SoForaDaCampanha({ children }: { children: React.ReactNode }) {
  const caminho = usePathname();
  if (CAMPANHAS.some((c) => caminho?.startsWith(c))) return null;
  return <>{children}</>;
}
