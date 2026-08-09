import Link from "next/link";
import Image from "next/image";
import type { Banner } from "@prisma/client";

/**
 * Espaço de banner na home.
 *
 * Enquanto não há arte, o espaço não desaparece: mostra a medida exata, o
 * texto que já está cadastrado e o aviso de que falta a imagem. Um bloco que
 * some quando está vazio esconde do cliente onde a peça vai entrar — e a
 * conversa vira "onde é que aparece esse banner?".
 *
 * Assim que a imagem for enviada pelo painel, o aviso dá lugar à arte sem que
 * nada mude de lugar.
 */
export function EspacoBanner({
  banner,
  medida,
  rotulo,
  proporcao = "2098 / 750",
  escuro = false,
}: {
  banner: Banner | null;
  medida: string;
  rotulo: string;
  /** A moldura segue a proporção da arte real, para que nada seja cortado. */
  proporcao?: string;
  /** Variante para quando o espaço fica sobre a faixa azul. */
  escuro?: boolean;
}) {
  const conteudo = (
    <div
      style={{ aspectRatio: proporcao }}
      className={`relative w-full overflow-hidden rounded-caixa ${
        banner?.imagemDesktop
          ? ""
          : escuro
            ? "border-2 border-dashed border-white/25 bg-white/[.04]"
            : "border-2 border-dashed border-marca-linha bg-marca-suave"
      }`}
    >
      {banner?.imagemDesktop ? (
        <Image
          src={banner.imagemDesktop}
          alt={banner.alt}
          fill
          sizes="(max-width: 1180px) 100vw, 1180px"
          className="object-cover"
          priority
        />
      ) : (
        <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
          <span className={`rounded-full px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.14em] ${escuro ? "bg-ouro text-ouro-txt" : "bg-marca text-white"}`}>
            {rotulo}
          </span>
          <p className={`num text-[13px] font-extrabold ${escuro ? "text-ouro" : "text-marca"}`}>{medida}</p>
          {banner ? (
            <p className={`max-w-md text-[14.5px] font-bold leading-snug ${escuro ? "text-white/90" : "text-marca-escuro"}`}>
              “{banner.titulo}”
            </p>
          ) : (
            <p className="text-[13px] text-mudo">Nenhum banner cadastrado nesta posição</p>
          )}
          <p className={`text-[11.5px] ${escuro ? "text-white/50" : "text-mudo"}`}>
            A arte é enviada pelo painel, em <span className="font-bold">Banners e vitrine</span>
          </p>
        </div>
      )}
    </div>
  );

  return banner?.link ? <Link href={banner.link}>{conteudo}</Link> : conteudo;
}
