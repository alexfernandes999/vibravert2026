import Link from "next/link";

/**
 * O obrigado, e o que acontece agora.
 *
 * Quem acabou de pagar tem uma pergunta só · "e agora?". A página respondia
 * com uma palavra de status e mais nada, e é aí que a pessoa vai procurar o
 * telefone da loja para perguntar o que já poderia estar escrito.
 *
 * Então: o que já aconteceu, o que vem, e como falar com gente. Os três
 * passos ficam visíveis ao mesmo tempo, com o atual marcado, porque saber
 * quantas etapas faltam acalma mais do que saber em qual você está.
 */
const PASSOS = [
  { chave: "PAGO", r: "Pagamento confirmado", d: "O valor entrou e o pedido já está com a nossa expedição." },
  { chave: "SEPARANDO", r: "Separação e nota fiscal", d: "Conferimos o item, emitimos a nota e fechamos a caixa." },
  { chave: "ENVIADO", r: "A caminho", d: "Assim que a transportadora coletar, o código de rastreio aparece aqui e vai no seu e-mail." },
] as const;

const ORDEM = ["PAGO", "SEPARANDO", "ENVIADO", "ENTREGUE"];

export function ObrigadoPeloPedido({
  nome,
  numero,
  email,
  status,
  rastreio,
  prazo,
  servico,
  whatsapp,
}: {
  nome: string;
  numero: number;
  email: string;
  status: string;
  rastreio: string | null;
  prazo: number | null;
  servico: string | null;
  whatsapp: string;
}) {
  const atual = ORDEM.indexOf(status);

  return (
    <section className="mt-6 overflow-hidden rounded-caixa border border-linha bg-superficie">
      <div className="border-b border-linha bg-marca-suave px-5 py-4">
        <h2 className="text-[18px] font-extrabold tracking-tight text-marca">
          Obrigado, {nome}. Sua compra está confirmada.
        </h2>
        <p className="mt-1 text-[13.5px] leading-relaxed text-tinta-2">
          Você comprou direto de quem fabrica desde 1974 · a assistência técnica é nossa, não
          terceirizada. Guarde o número <b className="num">{numero}</b>: é por ele que a gente acha
          seu pedido em qualquer canal.
        </p>
      </div>

      <ol className="grid gap-0 px-5 py-4">
        {PASSOS.map((passo, i) => {
          const feito = atual > ORDEM.indexOf(passo.chave);
          const agora = status === passo.chave;
          return (
            <li key={passo.chave} className="flex gap-3 py-2.5">
              <span
                className={`mt-0.5 grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full text-[11px] font-extrabold ${
                  feito
                    ? "bg-bom text-white"
                    : agora
                      ? "bg-marca text-white"
                      : "border border-linha-2 text-tenue"
                }`}
              >
                {feito ? "✓" : i + 1}
              </span>
              <span className="min-w-0">
                <span className={`block text-[14px] font-bold ${agora ? "text-marca" : ""}`}>
                  {passo.r}
                </span>
                <span className="block text-[13px] leading-relaxed text-tinta-2">{passo.d}</span>
              </span>
            </li>
          );
        })}
      </ol>

      {rastreio && (
        <div className="mx-5 mb-4 rounded-lg border border-linha bg-fundo px-4 py-3">
          <p className="text-[11.5px] font-extrabold uppercase tracking-wide text-mudo">
            Código de rastreio
          </p>
          <p className="num mt-0.5 text-[16px] font-extrabold text-marca">{rastreio}</p>
          <p className="mt-1 text-[12.5px] text-mudo">
            {servico ? `Enviado por ${servico}. ` : ""}Pode levar algumas horas até a
            transportadora reconhecer o código.
          </p>
        </div>
      )}

      {!rastreio && prazo && (
        <p className="mx-5 mb-4 rounded-lg border border-linha bg-fundo px-4 py-3 text-[13px] leading-relaxed text-tinta-2">
          Previsão de entrega: <b>{prazo} {prazo === 1 ? "dia útil" : "dias úteis"}</b>
          {servico ? ` por ${servico}` : ""}, contados a partir da coleta. O código de rastreio
          aparece aqui assim que o pedido sair.
        </p>
      )}

      <div className="border-t border-linha px-5 py-4">
        <p className="text-[13.5px] leading-relaxed text-tinta-2">
          Mandamos a confirmação para <b className="num">{email}</b>. Se não chegar em alguns
          minutos, olhe no spam · e qualquer dúvida, fale com a gente.
        </p>
        <div className="mt-3 flex flex-wrap gap-2.5">
          <a
            href={whatsapp}
            target="_blank"
            rel="noopener"
            className="flex items-center gap-2 rounded-lg bg-[#25D366] px-4 py-2.5 text-[13.5px] font-extrabold text-white"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
              <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.46 1.32 4.96L2 22l5.25-1.38a9.87 9.87 0 004.79 1.22C17.5 21.84 21.96 17.38 21.96 11.9 21.96 6.45 17.5 2 12.04 2z" />
            </svg>
            Falar com a gente no WhatsApp
          </a>
          <Link
            href="/bombas"
            className="rounded-lg border border-linha-2 px-4 py-2.5 text-[13.5px] font-bold text-tinta-2"
          >
            Continuar comprando
          </Link>
        </div>
        <p className="mt-2.5 text-[12px] text-mudo">
          Atendimento de segunda a sexta-feira, das 08h30 às 17h00.
        </p>
      </div>
    </section>
  );
}
