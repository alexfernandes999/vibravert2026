"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { marcarTourVisto } from "@/lib/acoes-tour";

/**
 * Boas-vindas ao painel, na primeira entrada.
 *
 * Quem abre um painel pela primeira vez não sabe o que é funil, o que é
 * ticket médio nem por que existe uma tela chamada "recuperar vendas". Sem
 * explicação, a pessoa usa duas telas e ignora o resto — e o resto é onde
 * está o dinheiro.
 *
 * A Vibrinha conduz, em passos curtos, com a linguagem do galpão e não a do
 * software. E dá para pular a qualquer momento: tour obrigatório vira
 * obstáculo, não ajuda.
 *
 * Fica marcado no usuário, não no navegador: quem entra de outro computador
 * não deve ver tudo outra vez.
 */
const PASSOS = [
  {
    t: "Oi! Eu sou a Vibrinha",
    d: "Vou te mostrar o painel em um minuto. É o mesmo lugar onde você acompanha as vendas, despacha os pedidos e mexe na loja. Se preferir explorar sozinho, é só pular.",
    icone: null,
  },
  {
    t: "Painel · o resumo do dia",
    d: "Faturamento, número de pedidos e ticket médio no período que você escolher. Embaixo, o funil: quantas pessoas visitaram, quantas abriram um produto, quantas montaram carrinho e quantas compraram. É onde a venda escapa que aparece primeiro.",
    icone: (
      <>
        <path d="M3 20V10M9 20V4M15 20v-8M21 20v-5" />
      </>
    ),
  },
  {
    t: "Pedidos · o caminho do galpão",
    d: "Cada pedido mostra só o próximo passo, nunca uma lista de opções: separar, comprar a etiqueta e despachar, marcar entregue. Ao comprar a etiqueta, o rastreio entra no pedido e o cliente recebe o aviso na mesma hora.",
    icone: (
      <>
        <path d="M3.5 7.5 12 3l8.5 4.5v9L12 21l-8.5-4.5z" />
        <path d="M3.5 7.5 12 12l8.5-4.5M12 12v9" />
      </>
    ),
  },
  {
    t: "Recuperar vendas · a mais fácil de fechar",
    d: "Quem escolheu a bomba, digitou o endereço e parou na hora de pagar. Você já tem o nome, o telefone e o que a pessoa queria. Um botão abre o WhatsApp com a mensagem pronta; outro manda o e-mail. O sistema conta quantas vezes já chamou, para ninguém cobrar duas vezes.",
    icone: (
      <>
        <path d="M3.5 20.5l1.3-4.6a8.2 8.2 0 111 1.5z" />
      </>
    ),
  },
  {
    t: "Produtos e Estoque",
    d: "Preço, foto, descrição e o selo de líder em vendas · use o selo para dar saída no que está parado. No estoque, a quantidade de cada bomba, com aviso quando alguma fica baixa.",
    icone: (
      <>
        <rect x="3" y="7" width="18" height="13" rx="2" />
        <path d="M8 7V5a4 4 0 018 0v2M3 11h18" />
      </>
    ),
  },
  {
    t: "Banners e vitrine",
    d: "As imagens grandes da página inicial e a tarja que passa no topo. Você troca a arte sem depender de ninguém · o tamanho certo aparece escrito em cada espaço.",
    icone: (
      <>
        <rect x="2.5" y="4.5" width="19" height="15" rx="2.5" />
        <path d="M2.5 15l5-4.5 4 3.5 3.5-3 6.5 5.5" />
        <circle cx="8.5" cy="9" r="1.4" />
      </>
    ),
  },
  {
    t: "Segurança · faça isto hoje",
    d: "Cadastre o autenticador no seu celular. Leva um minuto, e é o que impede que uma senha descoberta vire acesso ao painel. Está no menu, em Segurança.",
    icone: (
      <>
        <path d="M12 3l8 3v6c0 5-3.4 8.1-8 9-4.6-.9-8-4-8-9V6z" />
        <path d="M9 12l2 2 4-4" />
      </>
    ),
  },
];

export function TourPainel() {
  const [passo, setPasso] = useState(0);
  const [aberto, setAberto] = useState(true);
  const [, iniciar] = useTransition();

  if (!aberto) return null;

  const p = PASSOS[passo];
  const ultimo = passo === PASSOS.length - 1;

  const fechar = () => {
    setAberto(false);
    iniciar(() => void marcarTourVisto());
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-tinta/45 p-5 backdrop-blur-[2px]">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Boas-vindas ao painel"
        className="w-full max-w-lg overflow-hidden rounded-caixa border border-linha bg-superficie shadow-2xl"
      >
        <div className="flex items-start gap-3.5 border-b border-linha bg-marca-suave p-5">
          {passo === 0 || !p.icone ? (
            <Image
              src="/vibrinha.png"
              alt=""
              width={52}
              height={52}
              className="h-[52px] w-[52px] shrink-0 rounded-full bg-superficie"
            />
          ) : (
            <span className="grid h-[52px] w-[52px] shrink-0 place-items-center rounded-2xl bg-superficie text-marca">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
                strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7">
                {p.icone}
              </svg>
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-[10.5px] font-extrabold uppercase tracking-[0.14em] text-marca">
              Passo {passo + 1} de {PASSOS.length}
            </p>
            <h2 className="mt-1 text-[19px] font-extrabold leading-tight tracking-tight text-balance">
              {p.t}
            </h2>
          </div>
        </div>

        <div className="p-5">
          <p className="text-[14.5px] leading-relaxed text-tinta-2">{p.d}</p>

          <div className="mt-5 flex items-center gap-2">
            <span className="flex gap-1.5" aria-hidden>
              {PASSOS.map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 rounded-full transition-all ${
                    i === passo ? "w-5 bg-marca" : i < passo ? "w-1.5 bg-marca/40" : "w-1.5 bg-linha-2"
                  }`}
                />
              ))}
            </span>

            <button
              onClick={fechar}
              className="ml-auto rounded-lg px-3 py-2 text-[12.5px] font-semibold text-mudo underline underline-offset-2"
            >
              Pular
            </button>
            {passo > 0 && (
              <button
                onClick={() => setPasso((n) => n - 1)}
                className="rounded-lg border border-linha px-3.5 py-2 text-[12.5px] font-bold text-tinta-2"
              >
                Voltar
              </button>
            )}
            <button
              onClick={() => (ultimo ? fechar() : setPasso((n) => n + 1))}
              className="rounded-lg bg-marca px-4 py-2 text-[12.5px] font-bold text-white transition hover:brightness-110 active:scale-[0.97]"
            >
              {ultimo ? "Começar" : "Próximo"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
