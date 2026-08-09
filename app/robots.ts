import type { MetadataRoute } from "next";

const base = process.env.NEXT_PUBLIC_URL ?? "https://www.vibravert.com.br";

/**
 * A Vercel publica cada deploy também num endereço .vercel.app. Se o Google
 * indexar esse endereço, a loja passa a existir duas vezes para ele — conteúdo
 * duplicado competindo consigo mesmo, e uma parte da autoridade indo para uma
 * URL que ninguém quer que apareça.
 *
 * Só o domínio de produção é rastreável. Qualquer outro host é bloqueado por
 * inteiro, incluindo os deploys de teste.
 */
const ehProducao = () => {
  const url = process.env.NEXT_PUBLIC_URL ?? "";
  return url.includes("vibravert.com.br") && process.env.VERCEL_ENV !== "preview";
};

export default function robots(): MetadataRoute.Robots {
  if (!ehProducao()) {
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }

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
