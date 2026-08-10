"use client";

import { useState } from "react";

/**
 * Fachada de vídeo.
 *
 * Mostra a capa e só carrega o iframe no clique. O embed do YouTube traz cerca
 * de meio megabyte de JavaScript de terceiros antes de alguém apertar o play, e
 * numa loja cuja performance é metade do argumento contra o marketplace isso
 * não se paga em toda visita. O domínio nocookie evita o cookie de rastreio
 * enquanto o visitante não decidiu assistir.
 *
 * A capa vem em maxresdefault, e cai para hqdefault quando o vídeo não tem a
 * versão grande: a padrão do YouTube é de 480 pixels e fica lavada esticada num
 * cartão de 400.
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
  const [capa, setCapa] = useState(`https://i.ytimg.com/vi/${youtubeId}/maxresdefault.jpg`);

  return (
    <figure className="group relative overflow-hidden rounded-caixa bg-marca-escuro shadow-lg shadow-marca/10 transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-marca/20">
      <div className="relative aspect-video">
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
            className="absolute inset-0 h-full w-full cursor-pointer text-left"
            aria-label={`Assistir: ${titulo}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={capa}
              alt=""
              loading="lazy"
              onError={() => setCapa(`https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`)}
              className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
            />

            {/* O degradado dá contraste ao texto e tira o aspecto lavado da
                miniatura do YouTube, que é clara e sem contorno. */}
            <span
              aria-hidden
              className="absolute inset-0 bg-gradient-to-t from-marca-escuro via-marca-escuro/25 to-transparent"
            />

            {/* O botão do próprio YouTube: é a forma que todo mundo reconhece
                sem pensar. Um círculo dourado com um triângulo dentro parecia
                improviso, e ninguém sabia de onde era o vídeo. */}
            <span className="absolute inset-0 grid place-items-center">
              <span className="grid h-[46px] w-[68px] place-items-center rounded-[14px] bg-[#212121]/80 shadow-lg backdrop-blur-[2px] transition duration-300 group-hover:bg-[#FF0000] group-hover:shadow-[0_8px_28px_-6px_rgba(255,0,0,.6)]">
                <svg viewBox="0 0 24 24" className="ml-0.5 h-6 w-6 fill-white">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </span>
            </span>

            <span className="absolute inset-x-0 bottom-0 p-4">
              <span className="block text-[10px] font-extrabold uppercase tracking-[0.14em] text-ouro">
                Canal Vibra Vert
              </span>
              <span className="mt-1 block text-[15px] font-extrabold leading-snug text-white">
                {titulo}
              </span>
              {resumo && (
                <span className="mt-1 block text-[12px] leading-snug text-white/70">{resumo}</span>
              )}
            </span>
          </button>
        )}
      </div>
    </figure>
  );
}
