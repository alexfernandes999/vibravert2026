import { prisma } from "@/lib/prisma";
import { lerNF } from "@/lib/regras/nf";
import type { Emissao } from "@/lib/regras/faixas";
import type { Canal } from "@/lib/regras/tipos";
import { buscarNF } from "./bling-nf";

/**
 * Passo zero do Guia: de onde vêm a data e o canal da compra.
 *
 * 1. Pedido do próprio site com essa NF e esse CPF → data exata e canal "site".
 * 2. Nota da Vibra Vert/ARF no Bling → data exata e, se a loja for conhecida, o canal.
 * 3. Só a chave de 44 dígitos → ano e mês (o motor decide se basta).
 * 4. Nada → data não confirmada. Nunca se presume.
 */
export type Compra = {
  emissao: Emissao;
  emissaoFonte: "site" | "bling" | "chave_mes" | null;
  canal: Canal;
  canalConfirmado: boolean;
  blingPedido: string | null;
  nf: { numero: number | null; chave: string | null; serie: number | null; cnpjEmitente: string | null };
};

const diaSP = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(d);
const so = (s: string) => s.replace(/\D/g, "");

export async function confirmarCompra(nfTexto: string, documento: string, canalDeclarado: Canal): Promise<Compra> {
  const leitura = lerNF(nfTexto, documento);
  const nf = {
    numero: leitura.tipo === "numero" ? leitura.numero : leitura.tipo === "chave" ? leitura.chave.numero : null,
    chave: leitura.tipo === "chave" ? leitura.chave.chave : null,
    serie: leitura.tipo === "chave" ? leitura.chave.serie : null,
    cnpjEmitente: leitura.tipo === "chave" ? leitura.chave.cnpjEmitente : null,
  };
  const base = { nf, blingPedido: null, canal: canalDeclarado, canalConfirmado: false };

  if (nf.numero !== null) {
    // 1 · pedido do site
    const pedido = await prisma.pedido.findFirst({
      where: { notaNumero: { in: [String(nf.numero), String(nf.numero).padStart(9, "0")] }, notaEm: { not: null } },
      select: { notaEm: true, blingPedidoId: true, cliente: { select: { cpfCnpj: true } } },
    });
    if (pedido?.notaEm && so(pedido.cliente.cpfCnpj ?? "") === so(documento)) {
      return { ...base, emissao: { tipo: "exata", data: diaSP(pedido.notaEm) }, emissaoFonte: "site", canal: "site", canalConfirmado: true, blingPedido: pedido.blingPedidoId };
    }

    // 2 · Bling, só para nota própria (ou número solto, que pode ser nossa)
    if (leitura.tipo === "numero" || (leitura.tipo === "chave" && leitura.chave.propria)) {
      const b = await buscarNF(nf.numero, { serie: nf.serie ?? undefined, chave: nf.chave ?? undefined });
      if (b) {
        return {
          ...base,
          emissao: { tipo: "exata", data: b.emissao },
          emissaoFonte: "bling",
          canal: b.canal ?? canalDeclarado,
          canalConfirmado: b.canal !== null,
          blingPedido: b.pedido,
        };
      }
    }
  }

  // 3 · só a chave
  if (leitura.tipo === "chave") {
    return { ...base, emissao: { tipo: "mes", ano: leitura.chave.ano, mes: leitura.chave.mes }, emissaoFonte: "chave_mes" };
  }

  // 4 · nada confirmado
  return { ...base, emissao: null, emissaoFonte: null };
}

export const hojeSP = () => diaSP(new Date());
