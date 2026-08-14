import Image from "next/image";
/**
 * Menção cruzada com as lojas do Grupo das Bombas ARF.
 *
 * O link é para a loja, não para o produto: a Vibra Vert deixou de vender as
 * marcas de terceiros, e quem procura uma centrífuga ou uma caneta encontra
 * do outro lado — mas em outro catálogo, com outra URL, sem equivalência
 * um a um.
 *
 * Sem logotipo e sem vitrine isto vira um link de texto no rodapé, e link de
 * texto no rodapé ninguém clica: o visitante precisa entender na hora o que
 * vai encontrar do outro lado.
 */

export type Loja = {
  nome: string;
  dominio: string;
  descricao: string;
  vitrine: string;
  logo: string;
  alturaLogo: number;
};

export const LOJAS: Loja[] = [
  {
    nome: "A Casa São Paulo",
    dominio: "acasasaopaulo.com.br",
    descricao: "Catálogo completo",
    vitrine: "Centrífugas, drenagem, pressurização e linha industrial",
    logo: "/lojas/casa-sao-paulo.png",
    alturaLogo: 168,
  },
  {
    // O logotipo é Schneider e o título dizia Franklin Electric. Quem não é do
    // ramo não liga as duas marcas, e o cartão ficava sem dizer o que vende.
    nome: "Loja oficial Schneider Motobombas",
    dominio: "grupodasbombas.com.br",
    descricao: "Catálogo oficial da marca",
    vitrine: "Submersas tipo caneta, pressurização e motobombas",
    logo: "/lojas/schneider.png",
    alturaLogo: 103,
  },
  {
    nome: "Casa da Thebe",
    dominio: "casadathebe.com.br",
    descricao: "Distribuidor autorizado EBARA / Thebe",
    vitrine: "Multiestágio, drenagem e linha industrial",
    logo: "/lojas/casa-thebe.png",
    alturaLogo: 245,
  },
];

/** UTM para conseguir medir, no analytics de cada loja, o que a rede gera. */
function comUtm(dominio: string, origem: string) {
  const p = new URLSearchParams({
    utm_source: "vibravert",
    utm_medium: origem,
    utm_campaign: "rede-arf",
  });
  return `https://www.${dominio}/?${p}`;
}

export function RedeLojas({
  origem = "rodape",
  titulo = "Precisa de outro tipo de bomba?",
  chamada = "A Vibra Vert é uma marca do Grupo das Bombas ARF · 28 anos de mercado, atendimento nos 27 estados do Brasil.",
}: {
  origem?: string;
  titulo?: string;
  chamada?: string;
}) {
  return (
    <section className="mx-auto max-w-7xl px-5 py-10">
      <h2 className="text-xl font-extrabold tracking-tight text-balance">{titulo}</h2>
      <p className="mt-1.5 max-w-2xl text-[14.5px] text-mudo">{chamada}</p>

      <ul className="mt-6 grid gap-4 md:grid-cols-3">
        {LOJAS.map((l) => (
          <li key={l.dominio}>
            <a
              href={comUtm(l.dominio, origem)}
              target="_blank"
              rel="noopener"
              className="group block h-full overflow-hidden rounded-caixa border border-linha border-t-[3px] border-t-ouro bg-superficie transition duration-300 hover:-translate-y-1 hover:border-marca-linha hover:shadow-xl hover:shadow-marca/10"
            >
              {/* O logotipo real, e não o nome em texto: o visitante reconhece
                  a marca pelo desenho antes de ler qualquer palavra. Altura fixa
                  e object-contain para logotipos de proporções diferentes
                  ficarem visualmente do mesmo tamanho. */}
              <div className="flex h-[86px] items-center justify-center border-b border-linha bg-superficie-2 px-6">
                <Image
                  src={l.logo}
                  alt={l.nome}
                  width={420}
                  height={l.alturaLogo}
                  className="max-h-[52px] w-auto object-contain transition group-hover:scale-105"
                />
              </div>
              <div className="p-4">
                <p className="text-[13.5px] font-bold">{l.descricao}</p>
                <p className="mt-1 text-[12.8px] leading-snug text-mudo">{l.vitrine}</p>
                <p className="mt-3 text-[13px] font-extrabold text-marca">Ir para a loja →</p>
              </div>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
