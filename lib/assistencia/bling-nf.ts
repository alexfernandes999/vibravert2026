import { chamar, configurado } from "@/lib/bling";
import type { Canal } from "@/lib/regras/tipos";

/**
 * Data de emissão e canal da NF no Bling (só leitura).
 *
 * Só para nota da Vibra Vert ou da ARF. Qualquer falha devolve `null`: a data
 * fica "não confirmada" e o chamado vai para a fila humana. Nunca se presume.
 *
 * O canal sai da loja do pedido de venda ligado à nota. Os ids de loja de cada
 * marketplace ficam em BLING_LOJAS ({"203…":"ml","204…":"shopee", …}); loja
 * sem mapeamento é canal não identificado.
 */
export type NFBling = {
  emissao: string;
  canal: Canal | null;
  pedido: string | null;
};

type ItemNFe = { id: number; numero?: string | number; serie?: string | number; dataEmissao?: string; chaveAcesso?: string };

function lojas(): Record<string, Canal> {
  try {
    return JSON.parse(process.env.BLING_LOJAS || "{}");
  } catch {
    return {};
  }
}

export async function buscarNF(numero: number, opcoes: { serie?: number; chave?: string } = {}): Promise<NFBling | null> {
  if (!configurado) return null;
  try {
    const lista = await chamar<{ data?: ItemNFe[] }>(`/nfe?numero=${numero}&limite=100`);
    // Confere o número exato: um filtro ignorado pela API não pode virar a
    // nota de outra pessoa.
    const nota = (lista.data ?? []).find(
      (n) =>
        Number(n.numero) === numero &&
        (opcoes.serie === undefined || Number(n.serie) === opcoes.serie) &&
        (!opcoes.chave || !n.chaveAcesso || n.chaveAcesso === opcoes.chave),
    );
    if (!nota?.dataEmissao) return null;

    const det = await chamar<{ data?: { numeroPedidoLoja?: string; loja?: { id?: number } } }>(`/nfe/${nota.id}`);
    const loja = det.data?.loja?.id;
    const canal = loja === undefined ? null : (lojas()[String(loja)] ?? null);

    return { emissao: nota.dataEmissao.slice(0, 10), canal, pedido: det.data?.numeroPedidoLoja ?? null };
  } catch {
    return null;
  }
}
