import type { Metadata } from "next";
import { FormRevenda } from "@/components/form-revenda";
import { FAIXAS, MINIMO, DESCONTO_SOBRE_PIX, B2B_FRETE_GRATIS, PRAZOS, B2B_ACEITA_CARTAO } from "@/lib/revenda";

export const metadata: Metadata = {
  title: "Revenda Vibra Vert · preço de revendedor a partir de 6 bombas",
  description:
    "Compre a partir de 6 bombas submersas vibratórias, misturando modelos à vontade, e tenha preço de revenda direto da fábrica. Cadastro em 4 passos, começando pelo CNPJ.",
  alternates: { canonical: "/revenda" },
};

export default function Revenda() {
  return (
    <div className="mx-auto max-w-7xl px-5 py-10">
      <nav aria-label="Você está em" className="text-[11.5px] font-semibold text-mudo">
        <a href="/" className="hover:text-marca">Início</a>
        <span className="mx-1.5">›</span>
        <span className="text-tinta-2">Revenda</span>
      </nav>

      <div className="mt-6 grid gap-10 lg:grid-cols-[1fr_460px]">
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-marca">
            Para quem revende
          </p>
          <h1 className="mt-2 max-w-xl text-[clamp(30px,4.6vw,44px)] font-extrabold leading-[1.06] tracking-tight text-balance">
            Preço de revenda direto de quem fabrica
          </h1>
          <p className="mt-4 max-w-xl text-[16px] leading-relaxed text-tinta-2">
            A partir de {MINIMO} bombas de qualquer modelo você compra com desconto de revendedor.
            A conta é por unidade somada · dá para misturar Rymer e Vibra Vert à vontade.
          </p>

          <div className="mt-8 overflow-x-auto rounded-caixa border border-linha">
            <table className="w-full border-collapse bg-superficie text-[14px]">
              <thead>
                <tr className="text-[11px] uppercase tracking-wide text-mudo">
                  <th className="border-b border-linha px-4 py-3 text-left font-extrabold">Faixa</th>
                  <th className="border-b border-linha px-4 py-3 text-left font-extrabold">Unidades</th>
                  <th className="border-b border-linha px-4 py-3 text-right font-extrabold">Desconto</th>
                </tr>
              </thead>
              <tbody>
                {FAIXAS.map((f) => (
                  <tr key={f.nome}>
                    <td className="border-b border-linha px-4 py-3 font-extrabold">{f.nome}</td>
                    <td className="num border-b border-linha px-4 py-3 text-tinta-2">
                      {f.ate === Infinity ? `${f.de} ou mais` : `${f.de} a ${f.ate}`}
                    </td>
                    <td className="num border-b border-linha px-4 py-3 text-right text-[16px] font-extrabold text-bom">
                      {(f.desconto * 100).toString().replace(".", ",")}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-3 text-[12.5px] text-mudo">
            Desconto sobre o preço {DESCONTO_SOBRE_PIX ? "à vista no PIX" : "cheio"}.
            {B2B_FRETE_GRATIS
              ? " Frete grátis em toda a revenda."
              : " O frete da revenda é calculado pelo CEP, como no varejo."}
          </p>

          {/* O prazo é o que separa a revenda do varejo: quem revende compra
              hoje e paga depois de vender. Por isso vem logo abaixo do
              desconto, e não escondido no rodapé. */}
          <h2 className="mt-9 text-[19px] font-extrabold tracking-tight">Compre agora, pague depois</h2>
          <p className="mt-1.5 max-w-xl text-[14.5px] leading-relaxed text-tinta-2">
            Boleto faturado, com o prazo crescendo junto com o pedido.
          </p>

          <div className="mt-4 overflow-x-auto rounded-caixa border border-linha">
            <table className="w-full border-collapse bg-superficie text-[14px]">
              <thead>
                <tr className="text-[11px] uppercase tracking-wide text-mudo">
                  <th className="border-b border-linha px-4 py-3 text-left font-extrabold">Pedido</th>
                  <th className="border-b border-linha px-4 py-3 text-left font-extrabold">Boleto faturado</th>
                </tr>
              </thead>
              <tbody>
                {[...PRAZOS].reverse().map((p) => (
                  <tr key={p.acima}>
                    <td className="num border-b border-linha px-4 py-3 font-extrabold">
                      Acima de {p.acima.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </td>
                    <td className="num border-b border-linha px-4 py-3 text-tinta-2">
                      {p.parcelas.length === 1
                        ? `${p.parcelas[0]} dias`
                        : `${p.parcelas.join("/")} dias · ${p.parcelas.length} parcelas`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-3 text-[12.5px] leading-relaxed text-mudo">
            Faturar é crédito, então passa por análise · pedimos duas notas fiscais de compra
            recente, comprovante de endereço e contrato social.
            {!B2B_ACEITA_CARTAO && " Na revenda não trabalhamos com cartão de crédito."}
          </p>

          <ul className="mt-8 grid gap-3 sm:grid-cols-3">
            {[
              { t: "Sem atravessador", d: "você compra de quem produz, não de quem revende" },
              { t: "Estoque pronto", d: "bomba na prateleira, despacho em 24 horas úteis" },
              { t: "Assistência nossa", d: "defeito de fábrica se resolve com a gente, não com terceiro" },
            ].map((c) => (
              <li key={c.t} className="rounded-caixa border border-linha bg-superficie-2 p-4">
                <p className="text-[13.5px] font-extrabold">{c.t}</p>
                <p className="mt-1 text-[12.5px] leading-snug text-mudo">{c.d}</p>
              </li>
            ))}
          </ul>
        </div>

        <FormRevenda />
      </div>
    </div>
  );
}
