import Image from "next/image";

/**
 * O selo de 2 anos, preso ao dado.
 *
 * Só aparece quando a ficha do produto realmente diz dois anos. Hoje isso é
 * zero produto: a base tem 1 ano em 40 SKUs e 6 meses em 8, valores tirados
 * das embalagens do fabricante.
 *
 * Estampar o selo em bomba com garantia de 1 ano seria anunciar prazo que a
 * fábrica não cobre · e prazo anunciado obriga a ser honrado, pelo Código de
 * Defesa do Consumidor. O prejuízo da diferença cairia na loja.
 *
 * Quando a garantia de 2 anos for confirmada e as fichas forem atualizadas, o
 * selo acende sozinho onde for verdade. Não há nada a mudar aqui.
 */
const doisAnos = (garantia: string | null | undefined) =>
  Boolean(garantia && /\b2\s*anos?\b|\bdois\s*anos?\b/i.test(garantia));

export function SeloGarantia({
  garantia,
  className = "",
  tamanho = 68,
}: {
  garantia: string | null | undefined;
  className?: string;
  tamanho?: number;
}) {
  if (!doisAnos(garantia)) return null;
  return (
    <Image
      src="/selo-2-anos.png"
      alt="Selo de 2 anos de garantia de fábrica"
      width={tamanho}
      height={tamanho}
      className={`drop-shadow-md ${className}`}
    />
  );
}
