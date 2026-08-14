/**
 * Meios de pagamento e atendimento, no rodapé.
 *
 * Selo de pagamento é sinal de confiança na última rolagem da página, que é
 * onde o comprador confere se a loja é séria antes de voltar para o carrinho.
 * Uma linha de texto separada por ponto não faz esse trabalho.
 */
const MEIOS = [
  {
    nome: "PIX",
    nota: "10% off",
    icone: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
        <path d="M12 2.8l3.6 3.6a3 3 0 004.2 0l.6-.6a1 1 0 011.4 0l.8.8a1 1 0 010 1.4l-.6.6a3 3 0 000 4.2L12 21.2 2 12.8a3 3 0 000-4.2l-.6-.6a1 1 0 010-1.4l.8-.8a1 1 0 011.4 0l.6.6a3 3 0 004.2 0z" />
      </svg>
    ),
  },
  {
    nome: "Cartão",
    nota: "até 10× sem juros",
    icone: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
        <rect x="2" y="5" width="20" height="14" rx="2.5" />
        <path d="M2 10h20M6 15h4" />
      </svg>
    ),
  },
  {
    nome: "Boleto",
    nota: "3 dias úteis",
    icone: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
        <path d="M3 4v16M6.5 4v16M10 4v16M13.5 4v16M17 4v16M20.5 4v16" />
      </svg>
    ),
  },
];

export function RodapePagamento() {
  return (
    <>
      <h2 className="mb-3 text-[11px] font-extrabold uppercase tracking-[0.14em] text-marca">
        Formas de pagamento
      </h2>

      <ul className="flex flex-wrap gap-2">
        {MEIOS.map((m) => (
          <li
            key={m.nome}
            className="group flex items-center gap-2.5 rounded-lg border border-linha bg-superficie px-3 py-2 transition hover:border-marca hover:shadow-sm"
          >
            <span className="text-marca">{m.icone}</span>
            <span className="leading-tight">
              <span className="block text-[12.5px] font-extrabold">{m.nome}</span>
              <span className="block text-[10.5px] font-semibold text-mudo">{m.nota}</span>
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-5 flex items-start gap-2.5 rounded-lg bg-marca-suave px-3.5 py-3">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className="mt-0.5 h-[18px] w-[18px] shrink-0 text-marca">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3.2 2" strokeLinecap="round" />
        </svg>
        <p className="text-[12.5px] font-semibold leading-snug text-tinta-2">
          Atendimento de segunda a sexta
          <span className="num block font-extrabold text-marca">das 8h às 18h</span>
        </p>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {["Site seguro", "SSL", "Mercado Pago"].map((s) => (
          <span
            key={s}
            className="rounded-md border border-linha bg-superficie px-2.5 py-1 text-[9.5px] font-extrabold uppercase tracking-[0.08em] text-mudo"
          >
            {s}
          </span>
        ))}
      </div>
    </>
  );
}
