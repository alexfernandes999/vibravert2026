import type { NextConfig } from "next";

const config: NextConfig = {
  experimental: { optimizePackageImports: ["lucide-react"] },
  images: {
    formats: ["image/avif", "image/webp"],
    // As fotos vêm do Storage do Supabase. Sem liberar o host aqui, o
    // next/image recusa a origem e a loja fica sem nenhuma imagem.
    remotePatterns: [
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
