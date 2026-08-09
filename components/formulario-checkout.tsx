"use client";

import { useActionState, useState, useTransition } from "react";
import { finalizar, consultarCep, type EstadoCheckout } from "@/app/checkout/acoes";
import { PARCELAS_SEM_JUROS } from "@/lib/loja";
import { brl } from "@/lib/formato";

const METODOS = [
  { v: "PIX", r: "PIX", nota: "5% de desconto · aprovação imediata" },
  { v: "CARTAO_CREDITO", r: "Cartão de crédito", nota: `até ${PARCELAS_SEM_JUROS}× sem juros` },
  { v: "BOLETO", r: "Boleto bancário", nota: "vence em 3 dias úteis" },
] as const;

export function FormularioCheckout({
  total,
  totalPix,
  pagamentoConfigurado,
}: {
  total: number;
  totalPix: number;
  pagamentoConfigurado: boolean;
}) {
  const [estado, enviar, enviando] = useActionState<EstadoCheckout, FormData>(finalizar, {});
  const [metodo, setMetodo] = useState<string>("PIX");
  const [buscando, buscar] = useTransition();
  const [end, setEnd] = useState({ logradouro: "", bairro: "", cidade: "", uf: "" });

  /** Preencher sozinho tira quatro campos do caminho de quem compra pelo celular. */
  function aoSairDoCep(cep: string) {
    if (cep.replace(/\D/g, "").length !== 8) return;
    buscar(async () => {
      const e = await consultarCep(cep);
      if (e) setEnd({ logradouro: e.logradouro, bairro: e.bairro, cidade: e.cidade, uf: e.uf });
    });
  }

  const err = estado.campos ?? {};

  return (
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
