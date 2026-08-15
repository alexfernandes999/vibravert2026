import { revalidatePath } from "next/cache";
import type { StatusRevenda } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { registrarAcao } from "@/lib/admin-auth";
import { RelogioPainel } from "@/components/relogio-painel";
import { formatarCnpj } from "@/lib/cnpj";
import { whatsappLink } from "@/lib/contato";
import { APROVACAO_AUTOMATICA, FAIXAS, MINIMO } from "@/lib/revenda";

export const dynamic = "force-dynamic";
export const metadata = { title: "Revenda" };

/**
 * Pedidos de cadastro de revenda.
 *
 * O revendedor já chega com CNPJ validado e os dados da Receita conferidos ·
 * o que sobra para decidir aqui é se libera a tabela.
 */
async function decidir(id: string, status: StatusRevenda) {
  "use server";
  const r = await prisma.revendedor.update({ where: { id }, data: { status } });
  await registrarAcao(status === "APROVADO" ? "aprovou revenda" : "recusou revenda", r.razaoSocial);
  revalidatePath("/admin/revenda");
}

const quando = (d: Date) =>
  d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

const ROTULO: Record<StatusRevenda, { r: string; c: string }> = {
  PENDENTE: { r: "Aguardando", c: "bg-atencao/15 text-atencao" },
  APROVADO: { r: "Aprovado", c: "bg-bom/15 text-bom" },
  RECUSADO: { r: "Recusado", c: "bg-critico/10 text-critico" },
};

export default async function Revenda() {
  const pedidos = await prisma.revendedor.findMany({ orderBy: { criadoEm: "desc" }, take: 100 });
  const pendentes = pedidos.filter((p) => p.status === "PENDENTE").length;

  return (
    <div className="p-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-extrabold tracking-tight">Revenda</h1>
        <div className="ml-auto"><RelogioPainel /></div>
      </div>

      <p className="mt-1.5 max-w-2xl text-[13.5px] leading-relaxed text-tinta-2">
        Quem pediu preço de revendedor. O CNPJ já vem validado e os dados vêm da Receita ·
        o que falta é liberar a tabela. A partir de {MINIMO} bombas, misturando modelos.
      </p>

      <div className="mt-4 flex flex-wrap gap-2 text-[12px] font-semibold">
        {FAIXAS.map((f) => (
          <span key={f.nome} className="rounded-lg border border-linha bg-superficie px-3 py-1.5">
            {f.nome} · {f.ate === Infinity ? `${f.de}+` : `${f.de}–${f.ate}`} un ·{" "}
            <strong className="font-extrabold text-bom">{(f.desconto * 100).toString().replace(".", ",")}%</strong>
          </span>
        ))}
      </div>

      {APROVACAO_AUTOMATICA && (
        <p className="mt-3 rounded-caixa border border-linha bg-superficie-2 px-4 py-2.5 text-[13px] text-tinta-2">
          A liberação está <strong className="font-bold">automática</strong>: quem cadastra já sai aprovado.
        </p>
      )}

      {pedidos.length === 0 ? (
        <p className="mt-5 rounded-caixa border border-linha bg-superficie p-6 text-[13.5px] text-mudo">
          Nenhum pedido de revenda ainda. Eles chegam pela página{" "}
          <strong className="font-bold">/revenda</strong>, que está no menu da loja.
        </p>
      ) : (
        <>
          {pendentes > 0 && (
            <p className="mt-4 text-[13px] font-bold text-atencao">
              {pendentes} {pendentes === 1 ? "esperando resposta" : "esperando resposta"}
            </p>
          )}

          <ul className="mt-4 space-y-3">
            {pedidos.map((p) => (
              <li key={p.id} className="rounded-caixa border border-linha bg-superficie p-4">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="text-[15px] font-extrabold">{p.nomeFantasia || p.razaoSocial}</span>
                  <span className={`rounded px-2 py-0.5 text-[10.5px] font-extrabold uppercase ${ROTULO[p.status].c}`}>
                    {ROTULO[p.status].r}
                  </span>
                  <span className="num ml-auto text-[12px] text-mudo">{quando(p.criadoEm)}</span>
                </div>

                <p className="num mt-1 text-[12.5px] text-tinta-2">
                  {formatarCnpj(p.cnpj)}
                  {p.cidade && ` · ${p.cidade}/${p.uf}`}
                </p>
                {p.cnae && <p className="mt-0.5 text-[12px] text-mudo">{p.cnae}</p>}
                <p className="num mt-1.5 text-[12.5px]">
                  <strong className="font-bold">{p.responsavel}</strong> · {p.email} · {p.whatsapp}
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  <a
                    href={whatsappLink(
                      `Olá ${p.responsavel.split(" ")[0]}! Aqui é da Vibra Vert. Recebemos o cadastro de revenda da ${p.nomeFantasia || p.razaoSocial} e já vou te passar a tabela.`,
                    ).replace(/wa\.me\/55\d+/, `wa.me/55${p.whatsapp}`)}
                    target="_blank"
                    rel="noopener"
                    className="rounded-lg bg-[#25D366] px-4 py-2 text-[12.5px] font-bold text-white"
                  >
                    Chamar no WhatsApp
                  </a>

                  {p.status !== "APROVADO" && (
                    <form action={decidir.bind(null, p.id, "APROVADO")}>
                      <button className="rounded-lg bg-marca px-4 py-2 text-[12.5px] font-bold text-white">
                        Liberar tabela
                      </button>
                    </form>
                  )}
                  {p.status === "PENDENTE" && (
                    <form action={decidir.bind(null, p.id, "RECUSADO")}>
                      <button className="rounded-lg border border-linha px-4 py-2 text-[12.5px] font-bold text-mudo hover:border-critico hover:text-critico">
                        Recusar
                      </button>
                    </form>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
