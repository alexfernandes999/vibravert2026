import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { brl } from "@/lib/formato";
import { Selo } from "@/components/selo-pedido";

import { TELEFONE } from "@/lib/contato";
export const metadata: Metadata = { title: "Acompanhar pedido", robots: { index: false, follow: true } };
export const dynamic = "force-dynamic";

/**
 * Consulta por número + e-mail.
 *
 * Sem conta e sem senha: o comprador desta loja não criou cadastro. Mas o
 * número sozinho seria adivinhável — são sequenciais — e exporia endereço e
 * telefone de quem comprou. O e-mail é o segundo fator possível aqui.
 */
async function consultar(dados: FormData) {
  "use server";
  const numero = Number(dados.get("numero"));
  const email = String(dados.get("email") ?? "").trim().toLowerCase();
  if (!Number.isFinite(numero) || !email) redirect("/pedidos?erro=1");

  const p = await prisma.pedido.findFirst({
    where: { numero, cliente: { email } },
    select: { numero: true },
  });
  redirect(p ? `/pedido/${p.numero}` : "/pedidos?erro=1");
}

export default async function Pedidos({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const { erro } = await searchParams;

  return (
    <div className="mx-auto max-w-lg px-5 py-14">
      <h1 className="text-2xl font-extrabold tracking-tight">Acompanhar pedido</h1>
      <p className="mt-2 text-[14.5px] text-tinta-2">
        Informe o número do pedido e o e-mail usado na compra.
      </p>

      <form action={consultar} className="mt-6 grid gap-3.5">
        <label className="block">
          <span className="mb-1.5 block text-[12.5px] font-bold">Número do pedido</span>
          <input
            name="numero"
            inputMode="numeric"
            required
            className="num w-full rounded-lg border border-linha-2 bg-superficie px-3 py-2.5 text-[14px] font-semibold"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[12.5px] font-bold">E-mail da compra</span>
          <input
            name="email"
            type="email"
            required
            className="w-full rounded-lg border border-linha-2 bg-superficie px-3 py-2.5 text-[14px] font-semibold"
          />
        </label>

        {erro && (
          <p role="alert" className="text-[13px] font-semibold text-critico">
            Não encontramos esse pedido. Confira o número e o e-mail · ou ligue para {TELEFONE}.
          </p>
        )}

        <button className="rounded-lg bg-marca py-3 text-sm font-bold text-white">Consultar</button>
      </form>
    </div>
  );
}
