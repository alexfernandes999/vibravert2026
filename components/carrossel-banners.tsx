"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";

/**
 * Os banners de abertura da home, girando sozinhos.
 *
 * Moram no código, e não no sistema de banners do painel, porque são peças
 * fixas da marca: trocar a cada campanha não é o caso, e subir pelo painel a
 * cada deploy era trabalho repetido.
 *
 * A arte é 1600 × 533 (3:1). A moldura segue essa proporção para que nada seja
 * cortado · os botões e o telefone estão desenhados dentro da imagem.
 */
const BANNERS = [
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

export function CarrosselBanners() {
  const [atual, setAtual] = useState(0);
  const [pausado, setPausado] = useState(false);

  useEffect(() => {
    // Quem pediu ao sistema menos movimento não vê nada girar sozinho.
    if (pausado || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setAtual((i) => (i + 1) % BANNERS.length), INTERVALO);
    return () => clearInterval(t);
  }, [pausado]);

  return (
    <div
      className="relative w-full overflow-hidden bg-marca-escuro"
      style={{ aspectRatio: "1600 / 533" }}
      role="region"
      aria-label="Destaques da loja"
      aria-roledescription="carrossel"
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
      onFocus={() => setPausado(true)}
      onBlur={() => setPausado(false)}
    >
      {BANNERS.map((b, i) => (
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
            sizes="100vw"
            // O arquivo original, sem recompressão: a arte tem texto miúdo e
            // ícones finos, e cada passada de compressão borra as bordas.
            unoptimized
            priority={i === 0}
            // O `priority` do Next só pré-carrega: a tag sai sem prioridade e o
            // Chrome pedia o banner como "Low", atrás dos scripts.
            fetchPriority={i === 0 ? "high" : "low"}
            className="object-cover"
          />
        </Link>
      ))}

      <div className="absolute bottom-0 left-1/2 flex -translate-x-1/2 gap-1 sm:bottom-1.5">
        {BANNERS.map((b, i) => (
          <button
            key={b.src}
            type="button"
            onClick={() => setAtual(i)}
            aria-label={`Banner ${i + 1} de ${BANNERS.length}`}
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
