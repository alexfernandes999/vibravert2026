import { prisma } from "@/lib/prisma";
import { RelogioPainel } from "@/components/relogio-painel";
import { registrarAcao } from "@/lib/admin-auth";
import { enviarParaBling } from "@/lib/bling-nota";
import { brl } from "@/lib/formato";
import { revalidatePath } from "next/cache";
import type { PedidoStatus } from "@prisma/client";
import Link from "next/link";
import { Selo } from "@/components/selo-pedido";
import { pedidoEnviado } from "@/lib/email";
import { comprarEtiqueta, saldo, comFormato } from "@/lib/superfrete";
import { consolidar } from "@/lib/frete";

export const dynamic = "force-dynamic";

/** O fluxo real do galpão: o próximo passo, e só ele. */
const PROXIMO: Partial<Record<PedidoStatus, { para: PedidoStatus; r: string }>> = {
  PAGO: { para: "SEPARANDO", r: "Separar" },
  SEPARANDO: { para: "ENVIADO", r: "Comprar etiqueta e despachar" },
  ENVIADO: { para: "ENTREGUE", r: "Marcar entregue" },
};

/**
 * Manda o pedido para o Bling à mão.
 *
 * Existe para o caso em que o envio automático falhou · SKU que não existe
 * lá, conexão vencida, Bling fora do ar. Sem este botão, a única saída seria
 * lançar o pedido a dedo no ERP e perder a ligação entre os dois sistemas.
 */
async function mandarParaBling(id: string) {
  "use server";
  await enviarParaBling(id);
  await registrarAcao("enviou o pedido para o Bling");
  revalidatePath("/admin/pedidos");
}

async function avancar(id: string, para: PedidoStatus) {
  "use server";
  await prisma.pedido.update({ where: { id }, data: { status: para } });

  // Avisar que despachou é o e-mail que o cliente mais espera — e o que mais
  // reduz "cadê meu pedido?" no telefone.
  if (para === "ENVIADO") {
    const p = await prisma.pedido.findUnique({
      where: { id },
      include: { itens: true, endereco: true, cliente: true },
    });
    if (p) await pedidoEnviado(p);
  }

  await registrarAcao("mudou a situação do pedido");

  revalidatePath("/admin/pedidos");
}

/**
 * Compra a etiqueta e despacha, num passo só.
 *
 * Separar "comprar etiqueta" de "marcar enviado" produz a pilha de pedidos com
 * etiqueta comprada e não despachada, que é onde o cliente fica sem aviso e
 * sem rastreio. Aqui a etiqueta sai, o rastreio entra no pedido e o e-mail vai
 * embora na mesma ação.
 *
 * A falha volta na tela em vez de sumir no log: sem saldo, a expedição precisa
 * saber agora, não depois de imprimir nada.
 */
async function despacharComEtiqueta(id: string) {
  "use server";
  const p = await prisma.pedido.findUnique({
    where: { id },
    include: { itens: { include: { produto: true } }, endereco: true, cliente: true },
  });
  if (!p) return;

  // Sem serviço escolhido no checkout, a etiqueta não sai: é o frete fixo, e
  // nesse caso o despacho segue manual.
  if (!p.freteServico || p.freteServico === "fixo") {
    await prisma.pedido.update({ where: { id }, data: { status: "ENVIADO" } });
    await registrarAcao("despachou sem etiqueta automática", `#${p.numero}`);
    revalidatePath("/admin/pedidos");
    return;
  }

  try {
    const caixa = consolidar(
      p.itens.map((i) => ({
        pesoGramas: i.produto?.pesoGramas ?? 4000,
        alturaCm: i.produto?.alturaCm ?? 30,
        larguraCm: i.produto?.larguraCm ?? 17,
        comprimentoCm: i.produto?.comprimentoCm ?? 17,
        quantidade: i.quantidade,
      })),
    );

    const etiqueta = await comprarEtiqueta({
      servico: p.freteServico,
      destinatario: {
        nome: p.cliente.nome,
        documento: p.cliente.cpfCnpj ?? "",
        telefone: p.cliente.telefone,
        email: p.cliente.email,
        cep: p.endereco.cep,
        logradouro: p.endereco.logradouro,
        numero: p.endereco.numero,
        complemento: p.endereco.complemento,
        bairro: p.endereco.bairro,
        cidade: p.endereco.cidade,
        uf: p.endereco.uf,
      },
      caixa,
      valorSegurado: Number(p.subtotal),
      itens: p.itens.map((i) => ({
        nome: i.nomeProduto,
        quantidade: i.quantidade,
        valorUnitario: Number(i.precoUnitario),
      })),
      referencia: `Pedido ${p.numero}`,
    });

    const atualizado = await prisma.pedido.update({
      where: { id },
      data: {
        status: "ENVIADO",
        rastreio: etiqueta.rastreio,
        etiquetaId: etiqueta.id,
        etiquetaUrl: etiqueta.url,
        etiquetaEm: new Date(),
      },
      include: { itens: true, endereco: true, cliente: true },
    });

    await pedidoEnviado(atualizado);
    await registrarAcao("comprou etiqueta e despachou", `#${p.numero}`, etiqueta.rastreio ?? undefined);
  } catch (e) {
    await registrarAcao("etiqueta falhou", `#${p.numero}`, e instanceof Error ? e.message.slice(0, 300) : undefined);
  }

  revalidatePath("/admin/pedidos");
}

const FILTROS: { v: string; r: string }[] = [
  { v: "", r: "Todos" },
  { v: "PAGO", r: "A separar" },
  { v: "SEPARANDO", r: "Separando" },
  { v: "ENVIADO", r: "Enviados" },
  { v: "AGUARDANDO_PAGAMENTO", r: "Aguardando" },
];

export default async function Pedidos({ searchParams }: { searchParams: Promise<{ s?: string }> }) {
  const { s } = await searchParams;
  const pedidos = await prisma.pedido.findMany({
    where: s ? { status: s as PedidoStatus } : {},
    orderBy: { criadoEm: "desc" },
    take: 100,
    include: { cliente: { select: { nome: true, email: true } }, endereco: true, itens: true },
  });

  // Saldo zerado só aparece na hora de comprar a etiqueta, com o pedido pago e
  // o cliente esperando. Melhor avisar quando ainda dá para resolver.
  const emCaixa = await saldo();
  const aDespachar = pedidos.filter((p) => p.status === "SEPARANDO" && !p.etiquetaId).length;

  return (
    <div className="p-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-extrabold tracking-tight">Pedidos</h1>
        <div className="ml-auto"><RelogioPainel /></div>
      </div>

      {emCaixa !== null && (emCaixa < 50 || aDespachar > 0) && (
        <div
          className={`mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-caixa border px-4 py-2.5 text-[13px] ${
            emCaixa < 50
              ? "border-atencao/35 bg-atencao/10"
              : "border-linha bg-superficie-2"
          }`}
        >
          <span className="num font-extrabold">Saldo SuperFrete {brl(emCaixa)}</span>
          {emCaixa < 50 && (
            <span className="font-semibold text-tinta-2">
              Sem saldo a etiqueta não sai · carregue em superfrete.com antes de despachar.
            </span>
          )}
          {aDespachar > 0 && (
            <span className="ml-auto font-semibold text-mudo">
              {aDespachar} {aDespachar === 1 ? "pedido separado" : "pedidos separados"} esperando etiqueta
            </span>
          )}
        </div>
      )}

      {/* Quem abre esta tela quer saber o que precisa sair hoje, não navegar
          por tudo. O filtro segue a ordem do galpão. */}
      <nav className="mt-3 flex flex-wrap gap-1.5">
        {FILTROS.map((f) => (
          <Link
            key={f.v}
            href={f.v ? `/admin/pedidos?s=${f.v}` : "/admin/pedidos"}
            className={`rounded-lg px-3 py-1.5 text-[12.5px] font-bold ${
              (s ?? "") === f.v ? "bg-marca text-white" : "border border-linha bg-superficie text-tinta-2"
            }`}
          >
            {f.r}
          </Link>
        ))}
      </nav>

      {pedidos.length === 0 ? (
        <p className="mt-5 rounded-caixa border border-linha bg-superficie p-6 text-[13.5px] text-mudo">
          Nenhum pedido ainda. Assim que a loja receber o primeiro, ele aparece aqui.
        </p>
      ) : (
        <ul className="mt-5 space-y-3">
          {pedidos.map((p) => {
            const prox = PROXIMO[p.status];
            return (
              <li key={p.id} className="rounded-caixa border border-linha bg-superficie p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="num text-[15px] font-extrabold">#{p.numero}</span>
                  <Selo s={p.status} />
                  <span className="text-[13px] font-semibold">{p.cliente.nome}</span>
                  <span className="text-[12.5px] text-mudo">{p.metodo.replace("_", " ")}</span>
                  <span className="num ml-auto text-[15px] font-extrabold">{brl(Number(p.total))}</span>
                </div>

                <p className="num mt-2 text-[12px] text-mudo">
                  {p.endereco.cidade}/{p.endereco.uf} · CEP {p.endereco.cep} ·{" "}
                  {p.itens.reduce((s, i) => s + i.quantidade, 0)} item(s) ·{" "}
                  {p.criadoEm.toLocaleDateString("pt-BR")}
                </p>

                <ul className="mt-2 text-[12.5px] text-tinta-2">
                  {p.itens.map((i) => (
                    <li key={i.id} className="num">
                      {i.quantidade}× {i.nomeProduto} <span className="text-mudo">({i.skuProduto})</span>
                    </li>
                  ))}
                </ul>

                {(p.rastreio || p.etiquetaUrl) && (
                  <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px]">
                    {p.rastreio && (
                      <span className="num font-bold">
                        Rastreio <span className="text-marca">{p.rastreio}</span>
                      </span>
                    )}
                    {p.etiquetaUrl && (
                      <a
                        href={comFormato(p.etiquetaUrl)}
                        target="_blank"
                        rel="noopener"
                        className="font-bold text-marca underline underline-offset-2"
                      >
                        Imprimir etiqueta
                      </a>
                    )}
                  </p>
                )}

                {/* O ERP é onde a nota nasce. Um pedido pago que não subiu é
                    um pedido sem nota esperando alguém reparar · fica dito na
                    própria linha, com o conserto ao lado. */}
                {p.status !== "AGUARDANDO_PAGAMENTO" && (
                  <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px]">
                    {p.blingPedidoId ? (
                      <span className="font-bold text-bom">
                        No Bling <span className="num">#{p.blingPedidoId}</span>
                      </span>
                    ) : (
                      <>
                        <span className="font-bold text-atencao">
                          {p.blingErro ? "Não subiu para o Bling" : "Ainda não subiu para o Bling"}
                        </span>
                        <form action={mandarParaBling.bind(null, p.id)}>
                          <button className="rounded-md border border-marca px-2.5 py-1 text-[11.5px] font-bold text-marca">
                            Enviar agora
                          </button>
                        </form>
                      </>
                    )}
                  </p>
                )}

                {p.blingErro && !p.blingPedidoId && (
                  <p className="mt-1.5 rounded-lg border-l-[3px] border-critico bg-critico/[0.06] px-3 py-2 text-[11.5px] leading-relaxed text-tinta-2">
                    {p.blingErro}
                  </p>
                )}

                {prox && (
                  <form
                    action={
                      prox.para === "ENVIADO" && !p.etiquetaId
                        ? despacharComEtiqueta.bind(null, p.id)
                        : avancar.bind(null, p.id, prox.para)
                    }
                    className="mt-3"
                  >
                    <button className="rounded-lg bg-marca px-4 py-2 text-[12.5px] font-bold text-white">
                      {prox.r}
                    </button>
                  </form>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
