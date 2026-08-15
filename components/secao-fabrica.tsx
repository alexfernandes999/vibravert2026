import { CarrosselFabrica, type FotoFabrica } from "@/components/carrossel-fabrica";

/**
 * A fábrica, em foto de verdade e na ordem em que a bomba nasce.
 *
 * Todo concorrente da categoria diz "fabricação própria". A diferença entre
 * dizer e provar é esta seção. E como é um processo, vira passo a passo: o
 * grid de blocos grandes mostrava quatro fotos soltas; a tira numerada conta
 * de onde sai a bomba que chega na casa do cliente.
 *
 * Vira um carrossel em profundidade: a foto do meio de frente, as vizinhas
 * recuadas e giradas. Anda sozinho, porque esta seção é prova e não catálogo ·
 * ninguém clica para ver a fábrica, mas todo mundo repara quando ela se mexe.
 */
const PASSOS: FotoFabrica[] = [
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

        <CarrosselFabrica fotos={PASSOS} />
      </div>
    </section>
  );
}
