import Image from "next/image";

/**
 * A fábrica, em foto de verdade.
 *
 * Todo concorrente da categoria diz "fabricação própria". A diferença entre
 * dizer e provar é esta seção: fachada com o número na porta, o galpão por
 * dentro, a bobinadeira enrolando o motor e a van sendo carregada.
 *
 * A bobinadeira é a foto que importa. É ela que separa quem fabrica de quem
 * importa e cola etiqueta — e ninguém do setor mostra essa máquina.
 *
 * Nada de banco de imagens aqui. Foto genérica de galpão limpo demais tem o
 * efeito contrário: parece o estoque de qualquer um.
 */
const FOTOS = [
  {
    src: "/fabrica/bobinadeira.jpg",
    alt: "Bobinadeira CNC enrolando o motor de uma bomba submersa vibratória na fábrica Vibra Vert",
    titulo: "O motor é enrolado aqui",
    texto: "Bobinadeira CNC própria. O motor não vem pronto de fora: sai desta máquina, com o número de espiras que a gente definiu.",
    destaque: true,
  },
  {
    src: "/fabrica/fachada.jpg",
    alt: "Fachada da fábrica Vibra Vert na Rua Charles Darwin, 707, em São Paulo",
    titulo: "Rua Charles Darwin, 707",
    texto: "Vila Santa Catarina, São Paulo. Endereço fixo, com placa na porta.",
  },
  {
    src: "/fabrica/galpao.jpg",
    alt: "Galpão da fábrica Vibra Vert por dentro, com paletes e prateleiras de estoque",
    titulo: "Estoque próprio",
    texto: "Bomba pronta na prateleira é o que faz o pedido sair em 24 horas úteis em vez de esperar produção.",
  },
  {
    src: "/fabrica/expedicao.jpg",
    alt: "Expedição da Vibra Vert carregando a van com caixas de bombas",
    titulo: "Sai daqui direto para você",
    texto: "Sem atravessador, sem centro de distribuição no meio do caminho.",
  },
];

export function SecaoFabrica() {
  return (
    <section className="border-t border-linha bg-superficie-2">
      <div className="mx-auto max-w-7xl px-5 py-14">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-marca">
          Fabricação própria desde 1974
        </p>
        <h2 className="revelar mt-2 max-w-2xl text-3xl font-extrabold tracking-tight text-balance">
          Isso aqui é a nossa fábrica
        </h2>
        <p className="revelar mt-3 max-w-2xl text-[15px] leading-relaxed text-tinta-2">
          Bobinamos o motor, montamos, testamos duas vezes e despachamos. Tudo na mesma casa, em
          São Paulo.
        </p>

        {/* A bobinadeira ocupa duas colunas: é o argumento, e argumento não
            entra do mesmo tamanho que o resto. */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FOTOS.map((f, i) => (
            <figure
              key={f.src}
              className={`revelar group relative overflow-hidden rounded-caixa border border-linha bg-superficie ${
                f.destaque ? "sm:col-span-2 lg:row-span-2" : ""
              }`}
              style={{ transitionDelay: `${i * 60}ms` }}
            >
              <span className={`relative block ${f.destaque ? "aspect-[4/3]" : "aspect-[3/2]"}`}>
                <Image
                  src={f.src}
                  alt={f.alt}
                  fill
                  sizes={f.destaque ? "(min-width:1024px) 50vw, 100vw" : "(min-width:1024px) 25vw, 50vw"}
                  className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                />
              </span>
              <figcaption className="p-4">
                <p className="text-[14px] font-extrabold leading-tight">{f.titulo}</p>
                <p className="mt-1 text-[12.8px] leading-relaxed text-mudo">{f.texto}</p>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
