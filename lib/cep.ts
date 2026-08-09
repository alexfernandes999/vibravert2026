/**
 * Consulta de CEP no ViaCEP — público, sem chave.
 *
 * Preencher o endereço sozinho tira quatro campos do caminho de quem está
 * comprando pelo celular, muitas vezes na área rural e com sinal ruim. É a
 * etapa em que mais se abandona um checkout.
 */
export type Endereco = {
  cep: string;
  logradouro: string;
  bairro: string;
  cidade: string;
  uf: string;
};

export const soDigitos = (s: string) => s.replace(/\D/g, "");

export const cepValido = (s: string) => soDigitos(s).length === 8;

export async function buscarCep(cep: string): Promise<Endereco | null> {
  const limpo = soDigitos(cep);
  if (limpo.length !== 8) return null;

  try {
    const r = await fetch(`https://viacep.com.br/ws/${limpo}/json/`, {
      // CEP não muda: vale guardar por um dia e poupar a ida ao serviço.
      next: { revalidate: 86400 },
    });
    if (!r.ok) return null;
    const d = await r.json();
    if (d.erro) return null;

    return {
      cep: limpo,
      logradouro: d.logradouro ?? "",
      bairro: d.bairro ?? "",
      cidade: d.localidade ?? "",
      uf: d.uf ?? "",
    };
  } catch {
    // Serviço fora do ar não pode impedir a compra: o comprador digita à mão.
    return null;
  }
}
