import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { brl } from "@/lib/formato";
import { configurado } from "@/lib/mercadopago";

export const metadata: Metadata = { title: "Pedido", robots: { index: false, follow: false } };

const ROTULO: Record<string, { t: string; d: string; cor: string }> = {
  AGUARDANDO_PAGAMENTO: { t: "Aguardando pagamento", d: "Assim que o pagamento for confirmado, o pedido entra em separação.", cor: "text-atencao" },
  PAGO: { t: "Pagamento confirmado", d: "Seu pedido entrou em separação.", cor: "text-bom" },
  SEPARANDO: { t: "Em separação", d: "Estamos preparando o seu pedido para envio.", cor: "text-marca" },
  ENVIADO: { t: "Enviado", d: "O pedido saiu para entrega.", cor: "text-marca" },
  ENTREGUE: { t: "Entregue", d: "Pedido entregue. Qualquer coisa, a assistência é nossa.", cor: "text-bom" },
  CANCELADO: { t: "Cancelado", d: "Este pedido foi cancelado.", cor: "text-critico" },
  REEMBOLSADO: { t: "Reembolsado", d: "O valor foi devolvido.", cor: "text-critico" },
};

export default async function Pedido({ params }: { params: Promise<{ numero: string }> }) {
  const n = Number((await params).numero);
  if (!Number.isFinite(n)) notFound();

  const p = await prisma.pedido.findUnique({
    where: { numero: n },
    include: { itens: true, endereco: true, cliente: { select: { nome: true, email: true } } },
  });
  if (!p) notFound();

  const st = ROTULO[p.status] ?? ROTULO.AGUARDANDO_PAGAMENTO;

  return (
    <div className="mx-auto max-w-3xl px-5 py-12">
      <p className="text-[10.5px] font-extrabold uppercase tracking-[0.16em] text-marca">
        Pedido nº {p.numero}
      </p>
      <h1 className={`mt-2 text-3xl font-extrabold tracking-tight ${st.cor}`}>{st.t}</h1>
      <p className="mt-2 text-[15px] text-tinta-2">{st.d}</p>

      {/* Sem credencial não houve cobrança. Dizer isso é melhor do que deixar o
          comprador esperando um PIX que nunca vai chegar. */}
      {!configurado && p.status === "AGUARDANDO_PAGAMENTO" && (
        <p className="mt-5 rounded-caixa border border-atencao/30 bg-atencao/5 px-4 py-3.5 text-[13px] leading-snug text-atencao">
          <strong className="font-extrabold">Ambiente de testes.</strong> O pedido foi registrado,
          mas o meio de pagamento ainda não está conectado · nenhuma cobrança foi gerada.
        </p>
      )}

      <div className="mt-8 overflow-hidden rounded-caixa border border-linha bg-superficie">
        <ul className="divide-y divide-linha">
          {p.itens.map((i) => (
            <li key={i.id} className="flex gap-4 p-4 text-[13.5px]">
              <span className="flex-1 font-semibold leading-snug">
                {i.nomeProduto}
                <span className="num mt-0.5 block text-[11.5px] font-normal text-mudo">
                  SKU {i.skuProduto} · {i.quantidade} un
                </span>
              </span>
              <span className="num font-bold">{brl(Number(i.precoUnitario) * i.quantidade)}</span>
            </li>
          ))}
        </ul>

        <dl className="space-y-1.5 border-t border-linha p-4 text-[13.5px]">
          <div className="flex justify-between"><dt className="text-mudo">Subtotal</dt><dd className="num">{brl(Number(p.subtotal))}</dd></div>
          <div className="flex justify-between"><dt className="text-mudo">Frete</dt><dd className="num">{Number(p.frete) === 0 ? "Grátis" : brl(Number(p.frete))}</dd></div>
          {Number(p.desconto) > 0 && (
            <div className="flex justify-between text-bom"><dt>Desconto PIX</dt><dd className="num">− {brl(Number(p.desconto))}</dd></div>
          )}
          <div className="flex justify-between border-t border-linha pt-2.5 text-[16px] font-extrabold">
            <dt>Total</dt><dd className="num">{brl(Number(p.total))}</dd>
          </div>
        </dl>
      </div>

      <div className="mt-6 rounded-caixa border border-linha bg-superficie-2 p-5 text-[13.5px]">
        <h2 className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-marca">Entrega</h2>
        <p className="mt-2 leading-relaxed">
          {p.cliente.nome}
          <br />
          {p.endereco.logradouro}, {p.endereco.numero}
          {p.endereco.complemento && ` · ${p.endereco.complemento}`}
          <br />
          {p.endereco.bairro} · {p.endereco.cidade}/{p.endereco.uf} · CEP {p.endereco.cep}
        </p>
      </div>

      <p className="mt-8 text-[13.5px] text-mudo">
        Dúvidas sobre o pedido?{" "}
        <Link href="/fale-conosco" className="font-bold text-marca underline">Fale com a gente</Link>
        {" "} ou ligue para 11 4000-2440.
      </p>
    </div>
  );
}
