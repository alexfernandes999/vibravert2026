import type { NextConfig } from "next";

const config: NextConfig = {
  experimental: { optimizePackageImports: ["lucide-react"] },
  // A assistência lê do disco o Guia (regras em cache na API da Claude) e o
  // logo (PDF do laudo). Sem declarar, a função na Vercel sobe sem eles.
  outputFileTracingIncludes: {
    "/assistencia/**": ["./docs/assistencia/regras/**", "./public/logo-vibravert.png"],
    "/admin/assistencia/**": ["./docs/assistencia/regras/**", "./public/logo-vibravert.png"],
    "/api/mcp": ["./docs/assistencia/regras/**"],
  },
  // O react-pdf roda no servidor como pacote externo (ESM com subpaths).
  serverExternalPackages: ["@react-pdf/renderer"],
  images: {
    formats: ["image/avif", "image/webp"],
    // As fotos vêm do Storage do Supabase. Sem liberar o host aqui, o
    // next/image recusa a origem e a loja fica sem nenhuma imagem.
    remotePatterns: [
      {
        // Fotos das peças, servidas pelo CDN da loja do mesmo grupo. É
        // provisório: quando a chave de serviço do Storage estiver à mão, elas
        // passam a ser hospedadas aqui, como as das bombas.
        protocol: "https",
        hostname: "acasasaopaulo.vteximg.com.br",
      },
      {
        protocol: "https",
        hostname: "bcshyedkqssuzpucpkiy.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  async redirects() {
    // Os 301 do catálogo antigo são servidos por middleware, a partir da
    // tabela `redirecionamentos` — links de anúncio e de WhatsApp seguem
    // circulando muito depois de a página mudar.
    return [];
  },
};

export default config;
