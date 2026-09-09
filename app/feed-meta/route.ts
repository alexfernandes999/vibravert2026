import { gerarFeed } from "@/lib/feed";

export const revalidate = 3600;

/**
 * O mesmo catálogo, noutro endereço.
 *
 * A Meta aceita o formato do Google, então um gerador só serve para os dois.
 * O segundo endereço existe de propósito: cada plataforma agenda a leitura no
 * seu ritmo, e quando uma para de atualizar dá para saber qual · com um
 * endereço só, a única resposta possível é "alguma das duas".
 *
 * Falha alto quando falha.
 *
 * Um 200 com feed vazio faz a plataforma apagar o catálogo inteiro e recomeçar
 * do zero · perde o histórico de desempenho de cada produto. O 503 diz "estou
 * fora agora", e ela tenta de novo mais tarde com tudo no lugar.
 */
export async function GET() {
  try {
    const xml = await gerarFeed();
    if (!xml.includes("<item>")) throw new Error("feed sem nenhum item");
    return new Response(xml, {
      headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600" },
    });
  } catch (e) {
    console.error("[feed-meta] falhou:", e instanceof Error ? e.message : e);
    return new Response("feed indisponível", { status: 503, headers: { "Retry-After": "600" } });
  }
}
