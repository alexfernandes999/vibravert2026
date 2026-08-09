import type { MetadataRoute } from "next";

const base = process.env.NEXT_PUBLIC_URL ?? "https://www.vibravert.com.br";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Carrinho, checkout e pedido não têm o que indexar e ainda expõem
        // combinações infinitas de URL ao rastreador.
        disallow: ["/admin", "/carrinho", "/checkout", "/pedido/", "/api/", "/fora-de-linha"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
