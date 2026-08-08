import type { NextConfig } from "next";

const config: NextConfig = {
  experimental: { optimizePackageImports: ["lucide-react"] },
  images: { formats: ["image/avif", "image/webp"] },
  async redirects() {
    // Os 301 do catálogo antigo são servidos por middleware, a partir da
    // tabela `redirecionamentos` — links de anúncio e de WhatsApp seguem
    // circulando muito depois de a página mudar.
    return [];
  },
};

export default config;
