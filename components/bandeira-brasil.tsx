/**
 * A bandeira, desenhada.
 *
 * Emoji de bandeira renderiza diferente em cada sistema · no Windows nem
 * aparece, vira duas letras · e num bloco que fala de cobertura nacional isso
 * é o tipo de detalhe que denuncia site improvisado. Aqui é vetor, igual em
 * todo lugar e nítido em qualquer tamanho.
 *
 * As 27 estrelas da bandeira são os 26 estados mais o Distrito Federal · o
 * mesmo 27 do bloco. Elas ficam sugeridas, não contadas: em 44 pixels, 27
 * estrelas viram sujeira.
 */
export function BandeiraBrasil({ className = "h-full w-full" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 14" className={className} role="img" aria-label="Brasil">
      <rect width="20" height="14" rx="1.4" fill="#009B3A" />
      <path d="M10 1.5 18.2 7 10 12.5 1.8 7Z" fill="#FFDF00" />
      <circle cx="10" cy="7" r="3.4" fill="#002776" />
      {/* A faixa branca da esfera, com o recorte do círculo por máscara. */}
      <mask id="esfera">
        <circle cx="10" cy="7" r="3.4" fill="#fff" />
      </mask>
      <path
        d="M6.2 8.3c2.6-1.5 5.4-1.4 7.9.3"
        fill="none"
        stroke="#fff"
        strokeWidth="1.15"
        mask="url(#esfera)"
      />
      <g fill="#fff">
        <circle cx="8.4" cy="5.8" r=".26" />
        <circle cx="11.3" cy="5.4" r=".3" />
        <circle cx="9.7" cy="6.6" r=".22" />
        <circle cx="12.2" cy="6.7" r=".24" />
        <circle cx="7.6" cy="7.1" r=".2" />
        <circle cx="10.6" cy="9.3" r=".26" />
      </g>
    </svg>
  );
}
