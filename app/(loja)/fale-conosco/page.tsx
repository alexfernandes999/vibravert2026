import type { Metadata } from "next";
import Link from "next/link";
import { EMPRESA } from "@/lib/paginas";

export const metadata: Metadata = {
  title: "Fale conosco",
  description: "Fale com o técnico da fábrica. Telefone, e-mail e endereço da Vibra Vert em São Paulo.",
  alternates: { canonical: "/fale-conosco" },
};

/**
 * Sem formulário de contato, e de propósito.
 *
 * Um formulário aqui precisaria de servidor de e-mail e de alguém do outro
 * lado lendo — e enquanto isso não existe, ele engole a mensagem e o cliente
 * fica esperando resposta. Telefone e e-mail funcionam desde o primeiro dia, e
 * nesta categoria o telefone é o canal que converte: o comprador está sem água.
 */
export default function FaleConosco() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-12">
      <h1 className="text-3xl font-extrabold tracking-tight text-balance">
        Fale com quem fabrica a bomba
      </h1>
      <p className="mt-2.5 max-w-xl text-[15px] text-tinta-2">
        Não é call center: quem atende conhece a bomba. Se puder, tenha à mão a profundidade do
        poço, o diâmetro e a tensão da rede · com isso a conversa resolve em minutos.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <a
          href={`tel:+55${EMPRESA.telefone.replace(/\D/g, "")}`}
          className="rounded-caixa border border-marca-linha bg-marca-suave p-5"
        >
          <p className="text-[10.5px] font-extrabold uppercase tracking-[0.14em] text-marca">
            Vibra Phone
          </p>
          <p className="num mt-1 text-2xl font-extrabold tracking-tight text-marca-escuro">
            {EMPRESA.telefone}
          </p>
          <p className="mt-1 text-[13px] text-tinta-2">Falamos de bomba, não é SAC.</p>
        </a>

        <a href={`mailto:${EMPRESA.email}`} className="rounded-caixa border border-linha bg-superficie p-5">
          <p className="text-[10.5px] font-extrabold uppercase tracking-[0.14em] text-marca">E-mail</p>
          <p className="mt-1 text-[15px] font-extrabold tracking-tight">{EMPRESA.email}</p>
          <p className="mt-1 text-[13px] text-mudo">Para pedidos, notas e garantia.</p>
        </a>
      </div>

      <section className="mt-6 rounded-caixa border border-linha bg-superficie-2 p-5">
        <h2 className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-marca">
          Fábrica e assistência presencial
        </h2>
        <address className="mt-1.5 text-[14.5px] not-italic leading-relaxed">{EMPRESA.endereco}</address>
        <dl className="mt-4 grid gap-3 border-t border-linha pt-4 text-[13.5px] sm:grid-cols-2">
          <div>
            <dt className="font-bold">Vendas e assistência</dt>
            <dd className="num text-mudo">Segunda a quinta, 7h às 18h · Sexta, 8h às 17h</dd>
          </div>
          <div>
            <dt className="font-bold">Chamados técnicos</dt>
            <dd className="num text-mudo">Segunda a sexta, 7h às 17h</dd>
          </div>
        </dl>
      </section>

      <p className="mt-8 text-[14px] text-tinta-2">
        Ainda não sabe qual bomba serve?{" "}
        <Link href="/qual-bomba" className="font-extrabold text-marca underline">
          A calculadora responde em quatro perguntas
        </Link>
        .
      </p>
    </div>
  );
}
