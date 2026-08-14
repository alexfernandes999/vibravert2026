import Image from "next/image";

/**
 * A fábrica, em foto de verdade e na ordem em que a bomba nasce.
 *
 * Todo concorrente da categoria diz "fabricação própria". A diferença entre
 * dizer e provar é esta seção. E como é um processo, vira passo a passo: o
 * grid de blocos grandes mostrava quatro fotos soltas; a tira numerada conta
 * de onde sai a bomba que chega na casa do cliente.
 *
 * Vira carrossel com encaixe no celular e no desktop. Foto grande demais aqui
 * competia com o produto · o que interessa é o conjunto, não cada imagem.
 */
const PASSOS = [
  {
    src: "/fabrica/fachada.jpg",
    alt: "Fachada da fábrica Vibra Vert na Rua Charles Darwin, 707, em São Paulo",
    titulo: "É aqui que fica",
    texto: "Rua Charles Darwin, 707 · Vila Santa Catarina, São Paulo. Endereço fixo, com placa na porta.",
    // A placa Vibra Vert está no alto da foto: cortar pelo centro comeria
    // justamente o nome da fábrica, que é o motivo de a foto existir.
    posicao: "object-top",
  },
  {
    src: "/fabrica/bobinadeira.jpg",
    alt: "Bobinadeira CNC enrolando o motor de uma bomba submersa vibratória",
    titulo: "O motor é enrolado aqui",
    texto: "Bobinadeira CNC própria. O motor não vem pronto de fora: sai desta máquina, com o número de espiras que a gente definiu.",
    posicao: "object-center",
  },
  {
    src: "/fabrica/galpao.jpg",
    alt: "Galpão da fábrica Vibra Vert por dentro, com paletes e prateleiras de estoque",
    titulo: "Testada e guardada",
    texto: "Cada bomba é testada duas vezes antes de ir para a prateleira. Estoque pronto é o que faz o pedido sair em 24 horas úteis.",
    posicao: "object-center",
  },
  {
    src: "/fabrica/expedicao.jpg",
    alt: "Expedição da Vibra Vert carregando a van com caixas de bombas",
    titulo: "Sai direto para você",
    texto: "Sem atravessador e sem centro de distribuição no meio do caminho.",
    posicao: "object-center",
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

        {/* A tira desliza com encaixe e sangra até a borda no celular, para
            deixar claro que há mais de um passo à direita. */}
        <ol className="-mx-5 mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-2 [scrollbar-width:thin] md:mx-0 md:grid md:grid-cols-4 md:overflow-visible md:px-0">
          {PASSOS.map((p, i) => (
            <li
              key={p.src}
              className="revelar group w-[76vw] shrink-0 snap-center sm:w-[46vw] md:w-auto"
              style={{ transitionDelay: `${i * 70}ms` }}
            >
              <figure className="h-full overflow-hidden rounded-caixa border border-linha bg-superficie transition duration-300 hover:-translate-y-1 hover:border-marca hover:shadow-lg hover:shadow-marca/10">
                <span className="relative block aspect-[4/3] overflow-hidden">
                  <Image
                    src={p.src}
                    alt={p.alt}
                    fill
                    sizes="(min-width:768px) 25vw, 76vw"
                    className={`object-cover ${p.posicao} transition-transform duration-500 group-hover:scale-[1.04]`}
                  />
                  <span className="num absolute left-3 top-3 grid h-8 w-8 place-items-center rounded-lg bg-marca text-[13px] font-extrabold text-white shadow-lg shadow-black/25">
                    {i + 1}
                  </span>
                </span>
                <figcaption className="p-4">
                  <p className="text-[14px] font-extrabold leading-tight">{p.titulo}</p>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-mudo">{p.texto}</p>
                </figcaption>
              </figure>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
