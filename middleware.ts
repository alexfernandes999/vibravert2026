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
 *  · O que é de terceiro   → 410 Gone, servido com a página de fora de linha,
 *    que oferece a linha atual.
 *
 *  · O que não bate com nada → 410 também, nunca 404. O 404 diz "não achei
 *    agora" e o Google insiste por meses; o 410 diz "não existe mais" e ele
 *    tira do índice.
 *
 * Por um tempo o que era de terceiro ia em 301 para a Casa São Paulo, onde o
 * slug da VTEX é o mesmo. Funcionava para o visitante, mas 3.800 endereços do
 * domínio despachando para outra loja é exatamente o que o Merchant Center
 * chama de "página criada para direcionar o cliente a outro lugar", e ele
 * reprovou o catálogo inteiro por isso (Afiliados). Nenhum endereço daqui
 * leva a outra loja.
 */

const mapa = redirects as Record<string, string>;
const categorias = legado.nosso as Record<string, string>;
const deTerceiro = new Set(legado.alheio as string[]);

/** O que saiu de linha responde 410, com uma página que ainda vende. */
function foraDeLinha(req: NextRequest) {
  const url = req.nextUrl.clone();
  url.pathname = "/fora-de-linha";
  return NextResponse.rewrite(url, { status: 410 });
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const limpo = pathname.replace(/\/+$/, "") || "/";

  /**
   * Uma única direção canônica: tudo vai para o www.
   *
   * O www é o endereço que a loja antiga tinha indexado, com milhares de URLs
   * · manter o histórico dele vale mais do que a preferência estética por um
   * domínio curto.
   *
   * O redirecionamento mora aqui e não na configuração da Vercel de propósito.
   * Lá ele acontece antes de tudo, inclusive antes do `.well-known`, e trava a
   * emissão do certificado: a autoridade entra por HTTP, é empurrada para o
   * HTTPS de um domínio que ainda não tem certificado, e desiste. Circular, e
   * difícil de enxergar. Aqui o `.well-known` já está fora do matcher.
   */
  const host = req.headers.get("host") ?? "";

  /**
   * Só o domínio de verdade é indexável.
   *
   * Os endereços da Vercel servem a mesma loja e o Google os trata como cópia.
   * O canonical na página já aponta para cá, mas ele é uma sugestão · o
   * cabeçalho não é. Vale para os endereços de pré-visualização também, que
   * aparecem em cada deploy e ninguém lembra de bloquear.
   */
  if (host && !host.endsWith("vibravert.com.br") && !host.startsWith("localhost")) {
    const r = NextResponse.next();
    r.headers.set("X-Robots-Tag", "noindex, nofollow");
    return r;
  }

  if (host === "vibravert.com.br") {
    const url = req.nextUrl.clone();
    url.host = "www.vibravert.com.br";
    url.protocol = "https:";
    url.port = "";
    return NextResponse.redirect(url, 301);
  }

  // ── categoria antiga da nossa linha ──────────────────────────────
  const nossa = categorias[limpo];
  if (nossa) return NextResponse.redirect(new URL(nossa, req.url), 301);

  // ── categoria antiga de marca de terceiro ────────────────────────
  if (deTerceiro.has(limpo)) return foraDeLinha(req);

  // ── produto: o padrão /nome-do-produto/p da VTEX ─────────────────
  const m = limpo.match(/^\/([^/]+)\/p$/);
  if (!m) return NextResponse.next();

  const destino = mapa[m[1]];
  if (destino) {
    return NextResponse.redirect(new URL(`/produto/${destino}`, req.url), 301);
  }

  return foraDeLinha(req);
}

export const config = {
  // `.well-known` fica de fora: é por lá que a autoridade certificadora prova
  // que o domínio é nosso, e um middleware no caminho faz o desafio falhar ·
  // o site fica sem HTTPS sem que nada no código pareça errado.
  matcher: "/((?!_next|api|produtos|fonts|favicon|\\.well-known).*)",
};
