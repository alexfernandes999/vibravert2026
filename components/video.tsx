"use client";

import { useState } from "react";

/**
 * Fachada de vídeo: mostra a capa do YouTube e só carrega o iframe no clique.
 *
 * O embed do YouTube traz cerca de meio megabyte de JavaScript de terceiros
 * antes de alguém apertar o play. Numa loja cuja performance é metade do
 * argumento contra o marketplace, pagar isso em toda visita — inclusive nas
 * que nunca assistem ao vídeo — não se justifica.
 *
 * O domínio nocookie evita o cookie de rastreio do YouTube enquanto o
 * visitante não decidiu assistir, o que também simplifica a conversa de LGPD.
 */
export function Video({
  youtubeId,
  titulo,
  resumo,
}: {
  youtubeId: string;
  titulo: string;
  resumo?: string | null;
}) {
  const [ativo, setAtivo] = useState(false);

  return (
    <figure className="overflow-hidden rounded-caixa border border-linha bg-superficie">
      <div className="relative aspect-video bg-marca-escuro">
        {ativo ? (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1&rel=0`}
            title={titulo}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 h-full w-full"
          />
        ) : (
          <button
            type="button"
            onClick={() => setAtivo(true)}
            className="group absolute inset-0 h-full w-full cursor-pointer"
            aria-label={`Assistir: ${titulo}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover"
            />
            <span className="absolute inset-0 grid place-items-center bg-marca-escuro/25 transition group-hover:bg-marca-escuro/10">
              <span className="grid h-14 w-14 place-items-center rounded-full bg-ouro shadow-lg">
                <svg viewBox="0 0 24 24" className="ml-1 h-6 w-6 fill-marca-escuro">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </span>
            </span>
          </button>
        )}
      </div>

      <figcaption className="p-3.5">
        <p className="text-[13.5px] font-extrabold leading-snug">{titulo}</p>
        {resumo && <p className="mt-1 text-[12.5px] leading-snug text-mudo">{resumo}</p>}
      </figcaption>
    </figure>
  );
}
