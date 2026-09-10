import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { autenticado } from "@/lib/admin-auth";
import { gerarFeed } from "@/lib/feed";

export const dynamic = "force-dynamic";

/**
 * "Está funcionando?" · respondido sem abrir o Business Manager.
 *
 * É a pergunta que a agência faz toda semana, e conferir cada peça à mão leva
 * meia hora. Aqui sai num JSON: quantos itens tem o feed, se as chaves estão
 * no lugar, e os endereços para copiar.
 *
 * Atrás do login, porque diz quais chaves existem · não os valores, mas mesmo
 * a existência é informação de quem opera a loja.
 */
export async function GET() {
  if (!(await autenticado())) {
    return NextResponse.json({ erro: "não autenticado" }, { status: 401 });
  }

  const base = process.env.NEXT_PUBLIC_URL || "https://www.vibravert.com.br";
  const [m, comFoto, semFoto, pedidosPagos] = await Promise.all([
    prisma.marketing.findUnique({ where: { id: "unico" } }),
    prisma.produto.count({ where: { ativo: true, imagens: { some: {} } } }),
    prisma.produto.count({ where: { ativo: true, imagens: { none: {} } } }),
    prisma.pedido.count({ where: { status: { in: ["PAGO", "SEPARANDO", "ENVIADO", "ENTREGUE"] } } }),
  ]);

  let itensNoFeed = 0;
  let feedOk = true;
  try {
    itensNoFeed = (await gerarFeed()).split("<item>").length - 1;
  } catch {
    feedOk = false;
  }

  return NextResponse.json({
    rastreamento: {
      ativo: m?.ativo ?? false,
      pixelMeta: m?.pixelMeta ? `configurado (${m.pixelMeta})` : "FALTA",
      tokenConversoes: m?.tokenCapi ? "configurado" : "FALTA",
      gtm: m?.gtmId ? `configurado (${m.gtmId})` : "FALTA",
      googleAds: m?.googleAds ? `configurado (${m.googleAds})` : "FALTA",
      conversaoCompra: m?.rotuloCompra ? "configurada" : "FALTA · a campanha não sabe o que é uma venda",
      modoTeste: m?.testeCapi ? `LIGADO (${m.testeCapi}) · as vendas não contam` : "desligado",
      alteradoEm: m?.atualizadoEm ?? null,
    },
    catalogo: {
      feedOk,
      itensNoFeed,
      produtosComFoto: comFoto,
      produtosSemFoto: semFoto,
      aviso: semFoto > 0 ? `${semFoto} produto(s) fora do feed por não ter foto` : null,
    },
    enderecos: {
      google: `${base}/feed-google`,
      meta: `${base}/feed-meta`,
      sitemap: `${base}/sitemap.xml`,
      robots: `${base}/robots.txt`,
    },
    vendas: {
      pedidosPagos,
      nota: pedidosPagos === 0
        ? "A plataforma só libera o objetivo Compra depois de receber a primeira venda."
        : null,
    },
  });
}
