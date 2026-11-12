import Link from "next/link";
import { buscarClientes, linkFicha } from "@/lib/clientes";
import { mascararDocumento } from "@/lib/assistencia/laudo";

export const dynamic = "force-dynamic";
export const metadata = { title: "Clientes" };

/**
 * Uma tarjeta por pessoa (site, Bling e assistência juntos). Abrir a tarjeta
 * leva à ficha com pedidos, chamados e o WhatsApp · sem uma tela por conversa.
 */
export default async function Clientes({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const pessoas = await buscarClientes(q || null);

  return (
    <div className="p-6">
      <h1 className="text-xl font-extrabold tracking-tight">Clientes</h1>
      <p className="mt-1.5 max-w-2xl text-[13.5px] leading-relaxed text-tinta-2">
        Quem comprou no site ou em qualquer canal do Bling, e quem abriu chamado na assistência. Abra a ficha para ver
        pedidos, chamados e o que foi conversado no WhatsApp.
      </p>
      <form className="mt-4 flex flex-wrap gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="Nome, CPF/CNPJ, e-mail ou telefone"
          className="w-80 max-w-full rounded-lg border border-linha-2 bg-superficie px-3 py-2 text-[13.5px]"
        />
        <button className="rounded-lg bg-marca px-4 py-2 text-[13px] font-bold text-white">Buscar</button>
        {q && (
          <Link href="/admin/clientes" className="rounded-lg border border-linha-2 px-4 py-2 text-[13px] font-bold">
            Limpar
          </Link>
        )}
      </form>
      <p className="mt-3 text-[12.5px] text-mudo">{q ? `${pessoas.length} encontrados` : "Os mais recentes"}</p>

      <ul className="mt-2 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {pessoas.map((p, i) => (
          <li key={`${p.documento ?? p.email ?? p.telefone ?? p.nome}-${i}`}>
            <Link
              href={linkFicha(p)}
              className="block h-full rounded-caixa border border-linha bg-superficie p-4 transition hover:border-marca"
            >
              <p className="truncate text-[15px] font-extrabold">{p.nome}</p>
              <p className="num mt-0.5 truncate text-[12.5px] text-mudo">
                {[p.documento && mascararDocumento(p.documento), p.telefone, p.email].filter(Boolean).join(" · ") || "Sem contato"}
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5 text-[11.5px] font-bold">
                {p.pedidosBling > 0 && <span className="rounded-full bg-marca-suave px-2 py-0.5 text-marca">{p.pedidosBling} no Bling</span>}
                {p.pedidosSite > 0 && <span className="rounded-full bg-bom-suave px-2 py-0.5 text-bom">{p.pedidosSite} no site</span>}
                {p.chamados > 0 && <span className="rounded-full bg-ouro/20 px-2 py-0.5 text-ouro-txt">{p.chamados} chamado{p.chamados > 1 ? "s" : ""}</span>}
                <span className="num ml-auto font-semibold text-mudo">
                  {p.ultimo.getTime() > 0 ? p.ultimo.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }) : ""}
                </span>
              </div>
            </Link>
          </li>
        ))}
        {pessoas.length === 0 && <li className="text-[13px] text-mudo">Ninguém encontrado.</li>}
      </ul>
    </div>
  );
}
