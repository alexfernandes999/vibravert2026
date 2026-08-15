import dados from "@/data/reviews.json";

/**
 * Avaliações do perfil da A Casa São Paulo no Google.
 *
 * Ficam num arquivo, e não numa integração: o widget oficial do Google foi
 * descontinuado, e os de terceiros cobram mensalidade. Copiar à mão é honesto
 * desde que a fonte esteja dita e o link para o perfil apareça · quem quiser
 * conferir, confere.
 *
 * O arquivo é importado, e não lido do disco. `readFileSync` com caminho
 * relativo funciona na máquina e falha no servidor, onde o diretório de
 * trabalho é outro · a seção sumia sem nenhum erro aparecer.
 *
 * A moldura do Grupo ARF é obrigatória. Sem ela o cliente lê uma avaliação
 * assinada por outra empresa e desconfia da loja inteira, o que é pior do que
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

export const lerReviews = (): Reviews => dados as Reviews;
