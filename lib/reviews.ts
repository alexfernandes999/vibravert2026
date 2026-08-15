import { readFileSync } from "node:fs";

/**
 * Avaliações do Google, do perfil da A Casa São Paulo.
 *
 * Ficam num arquivo, e não numa integração: o widget oficial do Google foi
 * descontinuado, e os de terceiros cobram mensalidade. Copiar as avaliações à
 * mão é honesto desde que a fonte esteja dita e o link para o perfil apareça ·
 * quem quiser conferir, confere.
 *
 * A moldura do Grupo ARF é obrigatória. Sem ela o cliente lê uma avaliação
 * assinada por outra empresa e desconfia da loja inteira · o que é pior do que
 * não ter avaliação nenhuma.
 */
export type Avaliacao = { autor: string; nota: number; texto: string; quando?: string };

export type Reviews = {
  perfil: string;
  nota: number | null;
  quantidade: number | null;
  avaliacoes: Avaliacao[];
  _fonte?: string;
};

export function lerReviews(): Reviews {
  try {
    return JSON.parse(readFileSync("data/reviews.json", "utf8")) as Reviews;
  } catch {
    return { perfil: "", nota: null, quantidade: null, avaliacoes: [] };
  }
}
