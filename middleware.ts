import { NextResponse, type NextRequest } from "next/server";
import redirects from "@/lib/redirects.json";
import legado from "@/lib/vtex-categorias.json";

/**
 * As URLs da loja antiga, e para onde cada uma vai.
 *
 * O domínio é o mesmo de antes, mas a loja mudou de escopo: a VTEX vendia
 * 3.901 produtos de vários fabricantes, e a nova vende só as marcas próprias.
 * Três destinos convivem, e a diferença entre eles vale posicionamento.
 *
 *  · O que continua aqui   → 301 para o endereço novo. O link segue circulando
 *    em anúncio antigo e no WhatsApp de revendedor, e continua valendo.
 *
 *  · O que é de terceiro   → 301 para a Casa São Paulo, que é a loja do grupo
 *    que vende aquilo, com o MESMO caminho · o slug da VTEX é idêntico lá.
 *    Quem procurava uma bomba Famac encontra uma bomba Famac, e a autoridade
 *    do link vai junto em vez de evaporar.
 *
 *  · O que não bate com nada → 410 Gone, nunca 404. O 404 diz "não achei
 *    agora" e o Google insiste por meses; o 410 diz "não existe mais" e ele
 *    tira do índice. A página do 410 oferece a linha atual, porque quem
 *    chegou procurando bomba continua sendo um comprador.
 *
 * A versão anterior mandava tudo o que não era nosso para 410. Era o certo
 * enquanto se achava que aqueles produtos tinham sumido · descobrir que eles
 * seguem vivos noutro domínio do grupo transformou 3.804 páginas mortas em
 * 3.804 redirecionamentos úteis.
 */

const CASA = "https://www.acasasaopaulo.com.br";

const mapa = redirects as Record<string, string>;
const categorias = legado.nosso as Record<string, string>;
const deTerceiro = new Set(legado.alheio as string[]);

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const limpo = pathname.replace(/\/+$/, "") || "/";

  // ── categoria antiga da nossa linha ──────────────────────────────
  const nossa = categorias[limpo];
  if (nossa) return NextResponse.redirect(new URL(nossa, req.url), 301);

  // ── categoria antiga de marca de terceiro ────────────────────────
  if (deTerceiro.has(limpo)) {
    return NextResponse.redirect(`${CASA}${limpo}`, 301);
  }

  // ── produto: o padrão /nome-do-produto/p da VTEX ─────────────────
  const m = limpo.match(/^\/([^/]+)\/p$/);
  if (!m) return NextResponse.next();

  const destino = mapa[m[1]];
  if (destino) {
    return NextResponse.redirect(new URL(`/produto/${destino}`, req.url), 301);
  }

  // Não é nosso, mas o slug da VTEX é o mesmo lá. Se por acaso não for, quem
  // responde 404 é a Casa São Paulo · e ela sabe oferecer o similar, coisa
  // que uma página de erro nossa não saberia.
  return NextResponse.redirect(`${CASA}${limpo}`, 301);
}

export const config = {
  matcher: "/((?!_next|api|produtos|fonts|favicon).*)",
};
