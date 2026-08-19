import { conexao } from "@/lib/bling";
import { chamar } from "@/lib/bling";
import { codigoBling, MAPA_BLING } from "@/lib/bling-mapa";

/**
 * Diz se este produto existe no Bling, agora.
 *
 * O SKU é o que liga os dois sistemas: é por ele que o pedido acha o produto
 * lá, e é do cadastro do Bling que saem o NCM e o CFOP da nota. Quando não
 * bate, nada quebra na hora · quebra semanas depois, na primeira venda desse
 * item, com o cliente cobrando a nota fiscal.
 *
 * Por isso a conferência é aqui, na tela de quem cadastra, e não num relatório
 * que ninguém abre. Custa uma chamada por produto aberto.
 */
export async function SeloBling({ sku }: { sku: string }) {
  const c = await conexao();
  if (!c.ligado) return null;

  const cod = codigoBling(sku);
  const mapeado = Boolean(MAPA_BLING[sku]);

  let achou: { nome: string; preco?: number } | null = null;
  let falhou = false;
  try {
    const r = await chamar<{ data?: { nome: string; preco?: number }[] }>(
      `/produtos?codigo=${encodeURIComponent(cod)}`,
    );
    achou = r.data?.[0] ?? null;
  } catch {
    falhou = true;
  }

  if (falhou) return null;

  if (!achou) {
    return (
      <p className="mt-3 rounded-lg border-l-[3px] border-critico bg-critico/[0.06] px-3.5 py-2.5 text-[12.5px] leading-relaxed text-tinta-2">
        <b className="text-critico">Este SKU não existe no Bling.</b> Um pedido com este item
        não sobe para o ERP e a nota fiscal não sai. Cadastre lá com o código{" "}
        <span className="num font-bold">{cod}</span>, ou corrija o SKU aqui para o que já existe.
        <br />
        <span className="mt-1 block text-[11.5px] text-mudo">
          Vale conferir a pontuação · <span className="num">3.001</span> e{" "}
          <span className="num">3001</span> são códigos diferentes para o Bling.
        </span>
      </p>
    );
  }

  return (
    <p className="mt-3 rounded-lg border-l-[3px] border-bom bg-bom/[0.06] px-3.5 py-2.5 text-[12.5px] leading-relaxed text-tinta-2">
      <b className="text-bom">Confere com o Bling.</b>{" "}
      <span className="num">{cod}</span> · {achou.nome}
      {mapeado && (
        <span className="mt-1 block text-[11.5px] text-mudo">
          O código lá é <span className="num">{cod}</span> e aqui é{" "}
          <span className="num">{sku}</span> · a loja traduz sozinha, não precisa mexer.
        </span>
      )}
    </p>
  );
}
