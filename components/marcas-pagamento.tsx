/**
 * Marcas de pagamento, em vetor.
 *
 * Selo de meio de pagamento é sinal de confiança na última rolagem: é ali que
 * o comprador confere se a loja é séria antes de voltar ao carrinho. Ícone
 * genérico de cartão não faz esse trabalho — a marca faz.
 *
 * Tudo desenhado aqui, e não em PNG: um logotipo em bitmap fica borrado na
 * tela retina, e cada arquivo é mais uma requisição na parte da página que
 * menos pode pesar.
 */

/**
 * O logotipo oficial do Pix, do Banco Central. Vem como arquivo e não
 * redesenhado: marca de terceiro se usa como ela é.
 */
export function MarcaPix({ className = "h-6 w-auto" }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/pix.svg" alt="Pix" className={className} width={238} height={84} />
  );
}

/** Bandeiras aceitas pelo Mercado Pago. Marca de palavra, que é o que se lê. */
const BANDEIRAS = [
  { nome: "Visa", cor: "#1A1F71", peso: 800, escala: 1 },
  { nome: "Mastercard", cor: "#EB001B", peso: 700, escala: 0.72, circulos: true },
  { nome: "Elo", cor: "#000000", peso: 800, escala: 1 },
  { nome: "Amex", cor: "#016FD0", peso: 800, escala: 0.95 },
  { nome: "Hipercard", cor: "#B3131B", peso: 700, escala: 0.7 },
];

export function BandeirasCartao({ className = "" }: { className?: string }) {
  return (
    <ul className={`flex flex-wrap items-center gap-2 ${className}`}>
      {BANDEIRAS.map((b) => (
        <li
          key={b.nome}
          className="grid h-7 min-w-[46px] place-items-center rounded-md border border-linha bg-superficie px-2"
          title={b.nome}
        >
          {b.circulos ? (
            <span className="flex items-center gap-1">
              <span aria-hidden className="relative flex">
                <span className="h-3.5 w-3.5 rounded-full bg-[#EB001B]" />
                <span className="-ml-1.5 h-3.5 w-3.5 rounded-full bg-[#F79E1B] mix-blend-multiply" />
              </span>
              <span className="sr-only">Mastercard</span>
            </span>
          ) : (
            <span
              className="text-[10px] leading-none tracking-tight"
              style={{ color: b.cor, fontWeight: b.peso, fontSize: `${10 * b.escala}px` }}
            >
              {b.nome}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
