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
 *
 * O símbolo do Pix é uma redesenho geométrico na cor oficial. Se a fábrica
 * quiser o arquivo exato do Banco Central, é só trocar o SVG daqui.
 */

const PIX_TEAL = "#32BCAD";

/** O losango do Pix: quatro pontas com os lados côncavos. */
export function MarcaPix({ className = "h-6 w-auto" }: { className?: string }) {
  return (
    <svg viewBox="0 0 116 32" className={className} role="img" aria-label="Pix">
      <g transform="translate(2 1)">
        <path
          d="M15 0 21.6 6.6a5.5 5.5 0 0 0 3.9 1.6h1.3L20 15l-5-5-5 5-6.8-6.8h1.3a5.5 5.5 0 0 0 3.9-1.6Z"
          fill={PIX_TEAL}
        />
        <path
          d="M15 30 8.4 23.4a5.5 5.5 0 0 0-3.9-1.6H3.2L10 15l5 5 5-5 6.8 6.8h-1.3a5.5 5.5 0 0 0-3.9 1.6Z"
          fill={PIX_TEAL}
        />
        <path
          d="M28.4 9.2 32.6 13.4a2.3 2.3 0 0 1 0 3.2l-4.2 4.2-5.8-5.8Z"
          fill={PIX_TEAL}
        />
        <path
          d="M1.6 9.2 6.4 15l-4.8 5.8-1.4-1.4a2.3 2.3 0 0 1 0-3.2Z"
          fill={PIX_TEAL}
        />
      </g>
      <text
        x="44"
        y="23"
        fontFamily="ui-sans-serif, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
        fontSize="21"
        fontWeight="700"
        letterSpacing="-0.5"
        fill={PIX_TEAL}
      >
        pix
      </text>
    </svg>
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
