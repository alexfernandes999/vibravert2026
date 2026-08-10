import Link from "next/link";
import { Video } from "@/components/video";

/**
 * Bloco de vídeos da home.
 *
 * Quem vende bomba para poço vende para gente que vai instalar sozinha, muitas
 * vezes longe de qualquer assistência. Vídeo é o que responde a dúvida que o
 * texto não alcança, e é o único conteúdo que a concorrência revendedora não
 * tem: só quem fabrica e conserta consegue gravar isso.
 *
 * As capas carregam por fachada, então quatro vídeos aqui não custam nada até
 * alguém apertar o play.
 */
export function SecaoVideos({
  videos,
  canal = "https://www.youtube.com/@vibravertbombassubmersasvi9020",
}: {
  videos: { youtubeId: string; titulo: string; resumo: string | null }[];
  canal?: string;
}) {
  if (!videos.length) return null;

  return (
    <section className="border-y border-linha bg-superficie-2">
      <div className="mx-auto max-w-7xl px-5 py-12">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <p className="text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-marca">
              Canal Vibra Vert
            </p>
            <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-balance">
              Veja a bomba funcionando antes de comprar
            </h2>
            <p className="mt-1.5 max-w-xl text-[14px] text-mudo">
              Quem fabrica e conserta é quem sabe explicar. No canal mostramos os modelos por
              dentro, a instalação passo a passo e o que fazer quando a bomba para.
            </p>
          </div>

          <a
            href={canal}
            target="_blank"
            rel="noopener"
            className="ml-auto inline-flex items-center gap-2.5 rounded-lg bg-[#FF0000] px-5 py-3 text-[13.5px] font-extrabold text-white transition hover:brightness-110"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
              <path d="M23 12s0-3.9-.5-5.8a3 3 0 00-2.1-2.1C18.5 3.6 12 3.6 12 3.6s-6.5 0-8.4.5A3 3 0 001.5 6.2C1 8.1 1 12 1 12s0 3.9.5 5.8a3 3 0 002.1 2.1c1.9.5 8.4.5 8.4.5s6.5 0 8.4-.5a3 3 0 002.1-2.1c.5-1.9.5-5.8.5-5.8zM9.8 15.5v-7l6.2 3.5z" />
            </svg>
            Ver o canal no YouTube
          </a>
        </div>

        <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {videos.slice(0, 3).map((v) => (
            <div key={v.youtubeId} className="revelar">
              <Video youtubeId={v.youtubeId} titulo={v.titulo} resumo={v.resumo} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
