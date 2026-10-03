"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";

export type SlideBanner = { src: string; href: string; alt: string };

/**
 * As peças fixas da marca, que entram depois do banner principal do painel.
 *
 * O principal continua vindo do painel e abre o carrossel · é o que o
 * comercial troca. Estas duas não mudam a cada campanha.
 *
 * Os arquivos chegaram pelo WhatsApp, que reduz a imagem para 1600 px. Estão
 * ampliados para 3200 com filtro Lanczos e um pouco de nitidez: numa tela
 * Retina, 1600 px esticados pelo navegador ficavam borrados. Quando vierem os
 * originais do designer, basta sobrescrever os arquivos.
 */
const FIXOS: SlideBanner[] = [
  {
    src: "/banners/direto-da-fabrica.jpg",
    href: "/bombas",
    alt: "Compre direto da fábrica Vibra Vert · fabricação própria desde 1974, frete grátis para todo o Brasil, 10% no PIX e assistência técnica própria",
  },
  {
    src: "/banners/rymer-1500.jpg",
    href: "/produto/bomba-submersa-vibratoria-de-poco-rymer-1500-em-110-127v",
    alt: "Rymer 1500, a bomba sapo mais vendida do Brasil · 280 W, 65 m de altura máxima, até 1.650 L/h, 127 V ou 220 V",
  },
];

const INTERVALO = 5000;

export function CarrosselBanners({ principais = [] }: { principais?: SlideBanner[] }) {
  const banners = [...principais, ...FIXOS];
  const [atual, setAtual] = useState(0);
  const [pausado, setPausado] = useState(false);

  useEffect(() => {
    // Quem pediu ao sistema menos movimento não vê nada girar sozinho.
    if (pausado || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setAtual((i) => (i + 1) % banners.length), INTERVALO);
    return () => clearInterval(t);
  }, [pausado, banners.length]);

  return (
    <div
      // 3:1 é a medida das peças fixas. O principal do painel é 2098 × 750
      // (2,8:1) e perde só uma lasca em cima e embaixo · altura fixa evita
      // que a página pule a cada troca.
      className="relative w-full overflow-hidden bg-marca-escuro"
      style={{ aspectRatio: "3 / 1" }}
      role="region"
      aria-label="Destaques da loja"
      aria-roledescription="carrossel"
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
      onFocus={() => setPausado(true)}
      onBlur={() => setPausado(false)}
    >
      {banners.map((b, i) => (
        <Link
          key={b.src}
          href={b.href}
          aria-hidden={i !== atual}
          tabIndex={i === atual ? 0 : -1}
          className={`absolute inset-0 transition-opacity duration-700 ${
            i === atual ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
        >
          <Image
            src={b.src}
            alt={b.alt}
            fill
            // Até 3840 px em tela Retina larga; o celular recebe 750 ou 1080.
            sizes="100vw"
            quality={92}
            priority={i === 0}
            // O `priority` do Next só pré-carrega: a tag sai sem prioridade e o
            // Chrome pedia o banner como "Low", atrás dos scripts.
            fetchPriority={i === 0 ? "high" : "low"}
            className="object-cover"
          />
        </Link>
      ))}

      <div className="absolute bottom-0 left-1/2 flex -translate-x-1/2 gap-1 sm:bottom-1.5">
        {banners.map((b, i) => (
          <button
            key={b.src}
            type="button"
            onClick={() => setAtual(i)}
            aria-label={`Banner ${i + 1} de ${banners.length}`}
            aria-current={i === atual}
            // O ponto é pequeno, mas a área de toque tem 24 px: abaixo disso o
            // dedo erra no celular.
            className="group flex h-6 min-w-6 items-center justify-center"
          >
            <span
              className={`block h-2 rounded-full transition-all ${
                i === atual ? "w-6 bg-ouro" : "w-2 bg-white/50 group-hover:bg-white/80"
              }`}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
