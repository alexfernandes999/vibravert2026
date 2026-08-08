import { NextResponse, type NextRequest } from "next/server";
import redirects from "@/lib/redirects.json";

/**
 * A loja antiga tinha 3.852 produtos; a nova tem 48, só das marcas próprias.
 * O domínio é o mesmo, então três destinos diferentes convivem nas URLs
 * antigas — e a diferença entre eles não é cosmética.
 *
 *  · Os 48 que continuam  → 301 para o endereço novo. Preserva o histórico
 *    do link, que segue circulando em anúncio e no WhatsApp de revendedor.
 *
 *  · Os outros 3.804      → 410 Gone, e não 404. O 404 diz "não achei agora",
 *    e o Google volta a tentar por meses; o 410 diz "não existe mais", e ele
 *    remove do índice rapidamente. Redirecionar tudo para a home seria pior
 *    ainda: o Google trata isso como soft 404 e o link perde o valor de todo
 *    jeito, com o agravante de jogar o visitante numa página que não responde
 *    o que ele procurava.
 *
 * O 410 é servido com uma página que explica o que houve e oferece a linha
 * atual. Quem chegou procurando uma bomba ainda é um comprador.
 */

const mapa = redirects as Record<string, string>;

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // padrão de produto da VTEX: /nome-do-produto/p
  const m = pathname.match(/^\/([^/]+)\/p\/?$/);
  if (!m) return NextResponse.next();

  const destino = mapa[m[1]];
  if (destino) {
    return NextResponse.redirect(new URL(`/produto/${destino}`, req.url), 301);
  }

  const url = req.nextUrl.clone();
  url.pathname = "/fora-de-linha";
  return NextResponse.rewrite(url, { status: 410 });
}

export const config = {
  matcher: "/((?!_next|api|produtos|fonts|favicon).*)",
};
