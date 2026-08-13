import { prisma } from "@/lib/prisma";
import { DESCONTO_PIX } from "@/lib/loja";

export const revalidate = 3600;

const base = process.env.NEXT_PUBLIC_URL || "https://www.vibravert.com.br";
const esc = (s: string) => s.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[c]!));

/**
 * Feed do Google Merchant Center.
 *
 * Duas decisões que definem se o produto é aprovado ou reprovado:
 *
 * 1. Quase nenhum produto de marca própria tem GTIN — o fabricante não emite.
 *    O feed sobe com `brand` + `mpn` e `identifier_exists: false`, que o Google
 *    aceita nesse caso. Inventar um GTIN seria motivo de suspensão da conta.
 *
 * 2. O preço aqui é o cheio, não o do PIX. O Merchant Center compara o feed
 *    com a página, e anunciar o preço com desconto que só vale num meio de
 *    pagamento é a causa nº 1 de reprovação por "preço divergente".
 *
 * As quatro montagens entram todas, agrupadas por `item_group_id`: no Shopping
 * cada versão é uma oferta com preço próprio, ao contrário do site, onde uma
 * página só concentra a força.
 */
export async function GET() {
  const produtos = await prisma.produto.findMany({
    where: { ativo: true },
    include: {
      imagens: { orderBy: { ordem: "asc" }, take: 11 },
      especificacoes: { where: { nome: { in: ["Vazão máxima", "Poço", "Garantia"] } } },
      estoque: true,
    },
  });

  const itens = produtos
    .map((p) => {
      const [capa, ...outras] = p.imagens;
      if (!capa) return "";

      const vazao = p.especificacoes.find((e) => e.nome === "Vazão máxima")?.valor;
      const poco = p.especificacoes.find((e) => e.nome === "Poço")?.valor;
      const descricao =
        p.metaDescricao ||
        [p.nome, vazao && `Vazão de até ${vazao}.`, poco && `${poco}.`, "Direto da fábrica, com assistência técnica própria."]
          .filter(Boolean)
          .join(" ");

      return `  <item>
    <g:id>${esc(p.sku)}</g:id>
    <g:title>${esc(p.nome.slice(0, 150))}</g:title>
    <g:description>${esc(descricao.slice(0, 5000))}</g:description>
    <g:link>${base}/produto/${p.slug}</g:link>
    <g:image_link>${esc(capa.url)}</g:image_link>
${outras.map((i) => `    <g:additional_image_link>${esc(i.url)}</g:additional_image_link>`).join("\n")}
    <g:availability>in stock</g:availability>
    <g:price>${Number(p.preco).toFixed(2)} BRL</g:price>
    <g:brand>${esc(p.marca)}</g:brand>
    <g:mpn>${esc(p.sku)}</g:mpn>
${p.ean ? `    <g:gtin>${esc(p.ean)}</g:gtin>` : `    <g:identifier_exists>false</g:identifier_exists>`}
    <g:condition>new</g:condition>
    <g:product_type>Bombas Submersas Vibratórias &gt; ${esc(p.marca)}</g:product_type>
    <g:google_product_category>2918</g:google_product_category>
${p.familia ? `    <g:item_group_id>${esc(p.familia)}</g:item_group_id>` : ""}
  </item>`;
    })
    .filter(Boolean)
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
<channel>
  <title>Loja Oficial Vibra Vert</title>
  <link>${base}</link>
  <description>Bombas submersas vibratórias Vibra Vert e Rymer, direto da fábrica.</description>
${itens}
</channel>
</rss>`;

  return new Response(xml, {
    headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600" },
  });
}
