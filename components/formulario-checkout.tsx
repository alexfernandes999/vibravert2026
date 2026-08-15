"use client";

import { useActionState, useState, useTransition } from "react";
import { finalizar, consultarCep, cotarFrete, type EstadoCheckout } from "@/app/(loja)/checkout/acoes";
import type { Opcao } from "@/lib/frete";
import { PARCELAS_SEM_JUROS, DESCONTO_PIX } from "@/lib/loja";
import { brl } from "@/lib/formato";
import Image from "next/image";

const METODOS = [
  { v: "PIX", r: "PIX", nota: `${DESCONTO_PIX * 100}% de desconto · aprovação imediata` },
  { v: "CARTAO_CREDITO", r: "Cartão de crédito", nota: `até ${PARCELAS_SEM_JUROS}× sem juros` },
  { v: "BOLETO", r: "Boleto bancário", nota: "vence em 3 dias úteis" },
] as const;

/**
 * O formulário guarda o frete escolhido, então é ele que sabe o total.
 *
 * O resumo lateral vinha do servidor com o frete fixo e não acompanhava a
 * escolha: a lateral dizia um valor e o botão de finalizar dizia outro. Agora
 * o resumo é renderizado aqui dentro e os dois números são o mesmo número.
 */
export type ItemResumo = {
  id: string;
  nome: string;
  qtd: number;
  total: number;
  imagem: { url: string; alt: string } | null;
};

export function FormularioCheckout({
  subtotal,
  freteFallback,
  pagamentoConfigurado,
  itens,
}: {
  subtotal: number;
  freteFallback: number;
  pagamentoConfigurado: boolean;
  itens: ItemResumo[];
}) {
  const [estado, enviar, enviando] = useActionState<EstadoCheckout, FormData>(finalizar, {});
  const [metodo, setMetodo] = useState<string>("PIX");
  const [buscando, buscar] = useTransition();
  const [end, setEnd] = useState({ logradouro: "", bairro: "", cidade: "", uf: "" });
  const [fretes, setFretes] = useState<Opcao[] | null>(null);
  const [servico, setServico] = useState<string>("");

  /**
   * Preencher sozinho tira quatro campos do caminho de quem compra pelo
   * celular. O mesmo CEP já cotiza o frete: pedir para digitar duas vezes, uma
   * para o endereço e outra para a entrega, é onde o checkout perde gente.
   */
  function aoSairDoCep(cep: string) {
    if (cep.replace(/\D/g, "").length !== 8) return;
    buscar(async () => {
      const [e, opcoes] = await Promise.all([consultarCep(cep), cotarFrete(cep)]);
      if (e) setEnd({ logradouro: e.logradouro, bairro: e.bairro, cidade: e.cidade, uf: e.uf });
      setFretes(opcoes);
      // O mais barato já vem marcado: é o que a maioria escolheria, e deixar
      // sem escolha nenhuma trava o botão de finalizar sem dizer por quê.
      setServico(opcoes[0]?.servico ?? "");
    });
  }

  const err = estado.campos ?? {};

  const escolhida = fretes?.find((o) => o.servico === servico) ?? null;
  const frete = escolhida?.valor ?? freteFallback;
  const total = subtotal + frete;
  const totalPix = total * (1 - DESCONTO_PIX);

  return (
    <div className="grid gap-9 lg:grid-cols-[1fr_330px]">
      <form action={enviar} className="grid gap-7">
        {estado.erro && (
          <p role="alert" className="rounded-caixa border border-critico/30 bg-critico/5 px-4 py-3 text-[13.5px] font-semibold text-critico">
            {estado.erro}
          </p>
        )}

        <fieldset>
          <Legenda n={1}>Seus dados</Legenda>
          <div className="grid gap-3.5 sm:grid-cols-2">
            <Campo nome="nome" rotulo="Nome completo" erro={err.nome} autoComplete="name" className="sm:col-span-2" />
            <Campo nome="email" rotulo="E-mail" tipo="email" erro={err.email} autoComplete="email" />
            <Campo nome="telefone" rotulo="Telefone com DDD" erro={err.telefone} autoComplete="tel" inputMode="tel" />
            <Campo nome="cpf" rotulo="CPF ou CNPJ" erro={err.cpf} inputMode="numeric" dica="só números" />
          </div>
        </fieldset>

        <fieldset>
          <Legenda n={2}>Entrega</Legenda>
          <div className="grid gap-3.5 sm:grid-cols-6">
            <Campo
              nome="cep"
              rotulo="CEP"
              erro={err.cep}
              inputMode="numeric"
              autoComplete="postal-code"
              className="sm:col-span-2"
              aoSair={aoSairDoCep}
              dica={buscando ? "buscando…" : undefined}
            />
            <Campo nome="logradouro" rotulo="Endereço" erro={err.logradouro} valor={end.logradouro} className="sm:col-span-4" autoComplete="address-line1" />
            <Campo nome="numero" rotulo="Número" erro={err.numero} className="sm:col-span-2" />
            <Campo nome="complemento" rotulo="Complemento" dica="opcional" className="sm:col-span-4" />
            <Campo nome="bairro" rotulo="Bairro" erro={err.bairro} valor={end.bairro} className="sm:col-span-3" />
            <Campo nome="cidade" rotulo="Cidade" erro={err.cidade} valor={end.cidade} className="sm:col-span-2" />
            <Campo nome="uf" rotulo="UF" erro={err.uf} valor={end.uf} className="sm:col-span-1" />
          </div>

          {/* Bomba tem frete grátis: mostrar PAC, SEDEX e Loggi ao lado de uma
              opção que custa zero só dá trabalho de escolher. A lista fica
              para as peças, onde o cliente paga e a escolha importa. */}
          {fretes && fretes.length > 0 && fretes[0].valor === 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-caixa border border-bom/30 bg-bom-suave px-4 py-3.5">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"
                className="h-5 w-5 shrink-0 text-bom">
                <path d="M4 12.5l5 5L20 6.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="text-[14px] font-extrabold text-bom">Frete grátis</span>
              {fretes[0].prazoDias > 0 && (
                <span className="text-[13px] font-semibold text-tinta-2">
                  chega em {fretes[0].prazoDias}{" "}
                  {fretes[0].prazoDias === 1 ? "dia útil" : "dias úteis"} · via {fretes[0].transportadora}
                </span>
              )}
              <input type="hidden" name="servicoFrete" value={fretes[0].servico} />
            </div>
          )}

          {fretes && fretes.length > 0 && fretes[0].valor > 0 && (
            <div className="mt-4 overflow-hidden rounded-caixa border border-linha">
              {fretes.map((o) => (
                <label
                  key={o.servico}
                  className={`flex cursor-pointer items-center gap-3 border-b border-linha p-3.5 last:border-b-0 ${
                    servico === o.servico ? "bg-marca-suave" : ""
                  }`}
                >
                  <input
                    type="radio"
                    name="servicoFrete"
                    value={o.servico}
                    checked={servico === o.servico}
                    onChange={() => setServico(o.servico)}
                    className="h-4 w-4 accent-marca"
                  />
                  <span className="min-w-0">
                    <span className="block text-[13.5px] font-bold leading-tight">
                      {o.nome}
                      <span className="ml-1.5 text-[11.5px] font-semibold uppercase tracking-wide text-mudo">
                        {o.transportadora}
                      </span>
                    </span>
                    <span className="block text-[12px] font-semibold text-mudo">
                      {o.prazoDias > 0
                        ? `chega em ${o.prazoDias} ${o.prazoDias === 1 ? "dia útil" : "dias úteis"}`
                        : "prazo a confirmar"}
                    </span>
                  </span>
                  <span className={`num ml-auto text-[13.5px] font-extrabold ${o.valor === 0 ? "text-bom" : ""}`}>
                    {o.valor === 0 ? "Grátis" : brl(o.valor)}
                  </span>
                </label>
              ))}
              {fretes[0].estimado && (
                <p className="border-t border-linha bg-superficie-2 px-3.5 py-2.5 text-[12px] font-semibold text-mudo">
                  Valor estimado · o frete exato é confirmado antes do envio.
                </p>
              )}
            </div>
          )}
        </fieldset>

        <fieldset>
          <Legenda n={3}>Pagamento</Legenda>
          <div className="overflow-hidden rounded-caixa border border-linha">
            {METODOS.map((m) => (
              <label
                key={m.v}
                className={`flex cursor-pointer items-center gap-3 border-b border-linha p-4 last:border-b-0 ${
                  metodo === m.v ? "bg-marca-suave" : ""
                }`}
              >
                <input
                  type="radio"
                  name="metodo"
                  value={m.v}
                  checked={metodo === m.v}
                  onChange={() => setMetodo(m.v)}
                  className="h-4 w-4 accent-marca"
                />
                <span className="text-[14px] font-bold">{m.r}</span>
                <span className="ml-auto text-[12px] font-semibold text-mudo">{m.nota}</span>
              </label>
            ))}
          </div>

          {metodo === "CARTAO_CREDITO" && (
            <label className="mt-3 block">
              <span className="mb-1.5 block text-[12.5px] font-bold">Parcelas</span>
              <select name="parcelas" className="num w-full rounded-lg border border-linha-2 bg-superficie px-3 py-2.5 text-[14px] font-semibold sm:max-w-xs">
                {Array.from({ length: PARCELAS_SEM_JUROS }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    {n}× de {brl(total / n)} sem juros
                  </option>
                ))}
              </select>
            </label>
          )}
        </fieldset>

        <div>
          <button
            type="submit"
            disabled={enviando}
            className="w-full rounded-lg bg-ouro py-4 text-[15px] font-extrabold text-ouro-txt shadow-lg shadow-ouro/25 disabled:opacity-60"
          >
            {enviando
              ? "Registrando pedido…"
              : `Finalizar · ${brl(metodo === "PIX" ? totalPix : total)}`}
          </button>

          {!pagamentoConfigurado && (
            <p className="mt-3 rounded-caixa border border-atencao/30 bg-atencao/5 px-4 py-3 text-[12.5px] leading-snug text-atencao">
              <strong className="font-extrabold">Ambiente de testes.</strong> A conta do Mercado Pago
              ainda não está conectada: o pedido é registrado e fica aguardando pagamento, mas nenhuma
              cobrança é feita.
            </p>
          )}
        </div>
      </form>

      <aside className="h-fit rounded-caixa border border-linha bg-superficie-2 p-5 lg:sticky lg:top-6">
        <h2 className="text-[15px] font-extrabold">Seu pedido</h2>
        <ul className="mt-4 space-y-3 border-b border-linha pb-4">
          {itens.map((i) => (
            <li key={i.id} className="flex gap-3">
              {i.imagem && (
                <span className="shrink-0 rounded-lg bg-superficie p-1">
                  <Image src={i.imagem.url} alt={i.imagem.alt} width={48} height={48} className="h-12 w-12 object-contain" />
                </span>
              )}
              <span className="min-w-0 flex-1 text-[12.5px] font-semibold leading-snug">
                {i.nome}
                <span className="num mt-0.5 block font-normal text-mudo">{i.qtd} un · {brl(i.total)}</span>
              </span>
            </li>
          ))}
        </ul>

        <dl className="mt-4 space-y-2 text-[13.5px]">
          <div className="flex justify-between">
            <dt className="text-tinta-2">Subtotal</dt>
            <dd className="num font-bold">{brl(subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-tinta-2">
              Frete
              {escolhida?.prazoDias ? (
                <span className="block text-[11.5px] text-mudo">{escolhida.prazoDias} dias úteis</span>
              ) : null}
            </dt>
            <dd className={`num font-bold ${frete === 0 ? "text-bom" : ""}`}>
              {frete === 0 ? "Grátis" : brl(frete)}
            </dd>
          </div>
          <div className="flex justify-between border-t border-linha pt-3 text-[17px]">
            <dt className="font-extrabold">Total</dt>
            <dd className="num font-extrabold">{brl(total)}</dd>
          </div>
        </dl>

        <p className="num mt-3 rounded-lg bg-bom-suave px-3.5 py-2.5 text-[13px] font-extrabold text-bom">
          {brl(totalPix)} pagando no PIX
        </p>
      </aside>
    </div>
  );
}

function Legenda({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <legend className="mb-3.5 flex items-center gap-2.5">
      <span className="num grid h-6 w-6 place-items-center rounded-full bg-marca text-[11px] font-extrabold text-white">
        {n}
      </span>
      <span className="text-[16px] font-extrabold tracking-tight">{children}</span>
    </legend>
  );
}

function Campo({
  nome,
  rotulo,
  tipo = "text",
  erro,
  dica,
  valor,
  className = "",
  aoSair,
  ...resto
}: {
  nome: string;
  rotulo: string;
  tipo?: string;
  erro?: string;
  dica?: string;
  valor?: string;
  className?: string;
  aoSair?: (v: string) => void;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  const [v, setV] = useState("");
  const atual = valor !== undefined && valor !== "" ? valor : v;

  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-[12.5px] font-bold">
        {rotulo}
        {dica && <span className="ml-1.5 font-medium text-mudo">({dica})</span>}
      </span>
      <input
        {...resto}
        name={nome}
        type={tipo}
        value={atual}
        onChange={(e) => setV(e.target.value)}
        onBlur={(e) => aoSair?.(e.target.value)}
        aria-invalid={erro ? true : undefined}
        className={`w-full rounded-lg border bg-superficie px-3 py-2.5 text-[14px] font-semibold ${
          erro ? "border-critico" : "border-linha-2"
        }`}
      />
      {erro && <span className="mt-1 block text-[11.5px] font-semibold text-critico">{erro}</span>}
    </label>
  );
}
