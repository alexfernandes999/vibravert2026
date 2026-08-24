import { prisma } from "@/lib/prisma";
import { DESCONTO_PIX, FRETE_GRATIS_EM_BOMBAS, FRETE_PADRAO } from "@/lib/loja";

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
/**
 * O frete que o Google mostra ao lado do preço.
 *
 * Declarar aqui é o que faz o "Frete grátis" aparecer no anúncio, e é o
 * atributo que mais muda o clique · quem compara duas bombas parecidas decide
 * pelo total, não pelo preço.
 *
 * Peça vai com o frete padrão. Anunciar zero e cobrar no checkout é a forma
 * mais rápida de a conta ser suspensa por preço divergente.
 */
function freteDe(tipo: string) {
  return tipo === "BOMBA" && FRETE_GRATIS_EM_BOMBAS ? 0 : FRETE_PADRAO;
}

/**
 * Rótulos para segmentar campanha no Google Ads.
 *
 * Não afetam o anúncio · servem para quem gerencia lance poder separar bomba
 * de peça, marca de marca e faixa de preço sem refazer o feed. Sem eles, a
 * única forma de segmentar é por produto, um a um.
 */
function faixaDePreco(v: number) {
  if (v < 50) return "ate-50";
  if (v < 150) return "50-150";
  if (v < 300) return "150-300";
  if (v < 600) return "300-600";
  return "acima-600";
}

export async function GET() {
  const produtos = await prisma.produto.findMany({
    where: { ativo: true },
    include: {
      imagens: { orderBy: { ordem: "asc" }, take: 11 },
      especificacoes: { where: { nome: { in: ["Vazão máxima", "Poço", "Garantia"] } } },
      estoque: true,
    },
  });

  // Sem estoque a oferta continua no feed, marcada como indisponível · tirar e
  // repor faz o Google reprocessar o item do zero e perder o histórico de
  // desempenho que ele já tinha.
  const disponivel = (q?: number | null) => ((q ?? 0) > 0 ? "in stock" : "out of stock");

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
    <g:availability>${disponivel(p.estoque?.quantidade)}</g:availability>
    <g:price>${Number(p.preco).toFixed(2)} BRL</g:price>
    <g:brand>${esc(p.marca)}</g:brand>
    <g:mpn>${esc(p.sku)}</g:mpn>
${p.ean ? `    <g:gtin>${esc(p.ean)}</g:gtin>` : `    <g:identifier_exists>false</g:identifier_exists>`}
    <g:condition>new</g:condition>
    <g:product_type>Bombas Submersas Vibratórias &gt; ${esc(p.marca)}</g:product_type>
    <g:google_product_category>2918</g:google_product_category>
${p.familia ? `    <g:item_group_id>${esc(p.familia)}</g:item_group_id>` : ""}
    <g:shipping>
      <g:country>BR</g:country>
      <g:service>Padrão</g:service>
      <g:price>${freteDe(p.tipo).toFixed(2)} BRL</g:price>
    </g:shipping>
${p.pesoGramas ? `    <g:shipping_weight>${(p.pesoGramas / 1000).toFixed(2)} kg</g:shipping_weight>` : ""}
    <g:custom_label_0>${esc(p.tipo === "BOMBA" ? "bomba" : "peca")}</g:custom_label_0>
    <g:custom_label_1>${esc(p.marca)}</g:custom_label_1>
    <g:custom_label_2>${esc(faixaDePreco(Number(p.preco)))}</g:custom_label_2>
${p.voltagem ? `    <g:custom_label_3>${esc(p.voltagem)}</g:custom_label_3>` : ""}
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
