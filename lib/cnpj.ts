/**
 * Consulta de CNPJ na BrasilAPI.
 *
 * Gratuita e sem chave. Existe para o revendedor não digitar razão social,
 * endereço e CNAE que a Receita já publica · cada campo a menos é uma
 * desistência a menos no cadastro.
 *
 * Se a consulta falhar, o formulário segue com os campos em branco: uma API
 * fora do ar não pode impedir alguém de querer revender.
 */
export type Empresa = {
  cnpj: string;
  razaoSocial: string;
  nomeFantasia: string | null;
  situacao: string | null;
  abertura: string | null;
  cnae: string | null;
  logradouro: string | null;
  numero: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  cep: string | null;
};

/** Dígitos verificadores do CNPJ. Barra o erro de digitação antes da rede. */
export function cnpjValido(bruto: string) {
  const c = bruto.replace(/\D/g, "");
  if (c.length !== 14 || /^(\d)\1{13}$/.test(c)) return false;

  const digito = (base: string) => {
    let peso = base.length - 7;
    let soma = 0;
    for (let i = 0; i < base.length; i++) {
      soma += Number(base[i]) * peso--;
      if (peso < 2) peso = 9;
    }
    const r = soma % 11;
    return r < 2 ? 0 : 11 - r;
  };

  return digito(c.slice(0, 12)) === Number(c[12]) && digito(c.slice(0, 13)) === Number(c[13]);
}

export const formatarCnpj = (c: string) =>
  c.replace(/\D/g, "").replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2}).*/, "$1.$2.$3/$4-$5");

export async function consultarCnpj(bruto: string): Promise<Empresa | null> {
  const c = bruto.replace(/\D/g, "");
  if (!cnpjValido(c)) return null;

  try {
    const r = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${c}`, {
      // A Receita muda pouco: um dia de cache evita repetir a consulta a cada
      // tentativa de cadastro.
      next: { revalidate: 86400 },
    });
    if (!r.ok) return null;
    const d = await r.json();

    return {
      cnpj: c,
      razaoSocial: d.razao_social ?? "",
      nomeFantasia: d.nome_fantasia || null,
      situacao: d.descricao_situacao_cadastral ?? null,
      abertura: d.data_inicio_atividade ?? null,
      cnae: d.cnae_fiscal_descricao ?? null,
      logradouro: [d.descricao_tipo_de_logradouro, d.logradouro].filter(Boolean).join(" ") || null,
      numero: d.numero ?? null,
      bairro: d.bairro ?? null,
      cidade: d.municipio ?? null,
      uf: d.uf ?? null,
      cep: d.cep ?? null,
    };
  } catch {
    return null;
  }
}
