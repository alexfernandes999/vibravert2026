import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { registrarAcao } from "@/lib/admin-auth";
import { carrinhoAbandonado } from "@/lib/email";
import { configurado as emailLigado } from "@/lib/email";
import { brl } from "@/lib/formato";
import { whatsappLink } from "@/lib/contato";
import { BotaoWhats } from "@/components/botao-whats";

export const dynamic = "force-dynamic";
export const metadata = { title: "Recuperar vendas" };

/**
 * Pedidos parados no pagamento.
 *
 * É a venda mais barata que existe: a pessoa escolheu a bomba, digitou o
 * endereço e parou na hora de pagar. Já sabemos o nome, o telefone e o que ela
 * queria — só falta chamar.
 *
 * Aparecem depois de 30 minutos. Antes disso a pessoa provavelmente ainda está
 * pagando, e cobrar quem está no meio do PIX afasta.
 */
const ESPERA_MIN = 30;

async function mandarEmail(id: string) {
  "use server";
  const p = await prisma.pedido.findUnique({
    where: { id },
    include: { itens: true, cliente: true },
  });
  if (!p) return;

  await carrinhoAbandonado(
    p.cliente.email,
    p.cliente.nome,
    p.itens.map((i) => ({
      nome: i.nomeProduto,
      sku: i.skuProduto,
      qtd: i.quantidade,
      total: Number(i.precoUnitario) * i.quantidade,
    })),
    Number(p.total),
  );

  await prisma.pedido.update({
    where: { id },
    data: { lembretes: { increment: 1 }, lembreteEm: new Date() },
  });
  await registrarAcao("mandou lembrete por e-mail", `#${p.numero}`);
  revalidatePath("/admin/recuperar");
}

/** O WhatsApp abre no navegador de quem atende, então só marca o envio. */
async function marcarWhats(id: string) {
  "use server";
  const p = await prisma.pedido.update({
    where: { id },
    data: { lembretes: { increment: 1 }, lembreteEm: new Date() },
    select: { numero: true },
  });
  await registrarAcao("chamou no WhatsApp", `#${p.numero}`);
  revalidatePath("/admin/recuperar");
}

const horas = (d: Date) => Math.round((Date.now() - d.getTime()) / 36e5);

export default async function Recuperar() {
  const corte = new Date(Date.now() - ESPERA_MIN * 60_000);

  const [parados, anonimos, compraram] = await Promise.all([
    prisma.pedido.findMany({
      where: { status: "AGUARDANDO_PAGAMENTO", criadoEm: { lt: corte } },
      orderBy: { criadoEm: "desc" },
      include: { cliente: true, itens: true, endereco: true },
      take: 60,
    }),
    prisma.evento.findMany({
      where: { etapa: "CARRINHO", criadoEm: { gte: new Date(Date.now() - 30 * 864e5) } },
      select: { sessao: true },
      distinct: ["sessao"],
    }),
    prisma.evento.findMany({
      where: { etapa: "PEDIDO", criadoEm: { gte: new Date(Date.now() - 30 * 864e5) } },
      select: { sessao: true },
      distinct: ["sessao"],
    }),
  ]);

  const semContato = Math.max(0, anonimos.length - compraram.length - parados.length);
  const total = parados.reduce((s, p) => s + Number(p.total), 0);

  const base = process.env.NEXT_PUBLIC_URL || "https://vibravert-loja.vercel.app";

  return (
    <div className="p-6">
      <h1 className="text-xl font-extrabold tracking-tight">Recuperar vendas</h1>
      <p className="mt-1.5 max-w-2xl text-[13.5px] leading-relaxed text-tinta-2">
        Quem escolheu a bomba, preencheu o endereço e parou na hora de pagar. É a venda mais barata
        de fechar · já sabemos o nome, o telefone e o que a pessoa queria.
      </p>

      <dl className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-caixa border border-linha bg-superficie p-4">
          <dt className="text-[11.5px] font-bold uppercase tracking-wide text-mudo">Dá para chamar</dt>
          <dd className="num mt-1 text-2xl font-extrabold text-marca">{parados.length}</dd>
        </div>
        <div className="rounded-caixa border border-linha bg-superficie p-4">
          <dt className="text-[11.5px] font-bold uppercase tracking-wide text-mudo">Valor parado</dt>
          <dd className="num mt-1 text-2xl font-extrabold">{brl(total)}</dd>
        </div>
        <div className="rounded-caixa border border-linha bg-superficie p-4">
          <dt className="text-[11.5px] font-bold uppercase tracking-wide text-mudo">Sem contato</dt>
          <dd className="num mt-1 text-2xl font-extrabold text-mudo">{semContato}</dd>
          <dd className="mt-1 text-[11.5px] leading-snug text-mudo">
            carrinhos que saíram antes de deixar nome e telefone
          </dd>
        </div>
      </dl>

      {!emailLigado && (
        <p className="mt-4 rounded-caixa border border-atencao/35 bg-atencao/10 px-4 py-3 text-[13px] font-semibold text-tinta-2">
          O envio de e-mail ainda não está ligado · falta a chave do Resend. O WhatsApp funciona
          normalmente.
        </p>
      )}

      {parados.length === 0 ? (
        <p className="mt-5 rounded-caixa border border-linha bg-superficie p-6 text-[13.5px] text-mudo">
          Nenhum pedido parado no pagamento. Aparecem aqui {ESPERA_MIN} minutos depois de fechados,
          para não cobrar quem ainda está pagando.
        </p>
      ) : (
        <ul className="mt-5 space-y-3">
          {parados.map((p) => {
            const itens = p.itens.map((i) => `${i.quantidade}× ${i.nomeProduto}`).join(", ");
            const primeiro = p.cliente.nome.split(" ")[0];
            const texto =
              `Oi, ${primeiro}! Aqui é da Vibra Vert.\n\n` +
              `Vi que você separou ${p.itens.length > 1 ? "estes itens" : "esta bomba"} e o pagamento ficou pendente:\n` +
              `${itens}\n` +
              `Total: ${brl(Number(p.total))}\n\n` +
              `Se ainda faz sentido, é só terminar por aqui: ${base}/pedido/${p.numero}\n\n` +
              `Qualquer dúvida sobre o modelo ou a instalação, me chama que eu resolvo.`;

            return (
              <li key={p.id} className="rounded-caixa border border-linha bg-superficie p-4">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="num text-[15px] font-extrabold">#{p.numero}</span>
                  <span className="text-[13px] font-semibold">{p.cliente.nome}</span>
                  <span className="text-[12.5px] text-mudo">
                    {p.endereco.cidade}/{p.endereco.uf}
                  </span>
                  <span className="num text-[12.5px] text-mudo">
                    parado há {horas(p.criadoEm) < 1 ? "menos de 1 h" : `${horas(p.criadoEm)} h`}
                  </span>
                  {p.lembretes > 0 && (
                    <span className="rounded bg-marca-suave px-1.5 py-0.5 text-[11px] font-bold text-marca">
                      {p.lembretes} {p.lembretes === 1 ? "lembrete" : "lembretes"}
                    </span>
                  )}
                  <span className="num ml-auto text-[15px] font-extrabold">{brl(Number(p.total))}</span>
                </div>

                <p className="num mt-1.5 text-[12.5px] text-tinta-2">{itens}</p>
                <p className="num mt-0.5 text-[12px] text-mudo">
                  {p.cliente.email}
                  {p.cliente.telefone ? ` · ${p.cliente.telefone}` : " · sem telefone"}
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  {p.cliente.telefone ? (
                    <BotaoWhats
                      href={whatsappLink(texto)}
                      telefone={p.cliente.telefone}
                      marcar={marcarWhats.bind(null, p.id)}
                    />
                  ) : (
                    <span className="rounded-lg border border-linha bg-superficie-2 px-4 py-2 text-[12.5px] font-semibold text-mudo">
                      Sem telefone cadastrado
                    </span>
                  )}

                  <form action={mandarEmail.bind(null, p.id)}>
                    <button
                      disabled={!emailLigado}
                      className="rounded-lg border border-marca bg-superficie px-4 py-2 text-[12.5px] font-bold text-marca transition hover:bg-marca-suave disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      Mandar e-mail
                    </button>
                  </form>

                  <a
                    href={`${base}/pedido/${p.numero}`}
                    target="_blank"
                    rel="noopener"
                    className="rounded-lg px-3 py-2 text-[12.5px] font-semibold text-mudo underline underline-offset-2"
                  >
                    Ver o pedido
                  </a>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
