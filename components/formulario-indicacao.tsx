"use client";

import { useActionState, useEffect, useId, useRef } from "react";
import { pedirIndicacao, type EstadoIndicacao } from "@/lib/acoes-indicacao";
import { pediuIndicacao } from "@/components/rastreio";

/**
 * Formulário de indicação de bomba.
 *
 * Curto de propósito: nome e WhatsApp bastam para responder, e o resto ajuda
 * mas não trava. Formulário que exige tudo em campanha de busca é formulário
 * que ninguém termina · quem chega aqui clicou num anúncio há trinta segundos.
 *
 * Nada de prazo prometido: a loja não tem plantão definido, e prometer "em até
 * 1 hora" no sábado à noite é criar a primeira frustração antes da venda.
 */
export function FormularioIndicacao({ id }: { id: string }) {
  const [estado, enviar, enviando] = useActionState<EstadoIndicacao, FormData>(pedirIndicacao, {});
  const marcado = useRef(false);
  const base = useId();

  useEffect(() => {
    if (!estado.ok || marcado.current) return;
    marcado.current = true;
    pediuIndicacao(estado.resumo);
  }, [estado.ok, estado.resumo]);

  if (estado.ok) {
    return (
      <div className="rounded-caixa border border-bom/30 bg-bom-suave p-6 text-center">
        <p className="text-[17px] font-extrabold text-bom">Recebemos o seu pedido</p>
        <p className="mx-auto mt-2 max-w-md text-[14px] leading-relaxed text-tinta-2">
          Um vendedor da fábrica vai ver o seu caso e indicar o modelo certo. Se preferir falar
          agora, é só abrir a conversa · o seu pedido já vai escrito.
        </p>
        {estado.whatsapp && (
          <a
            href={estado.whatsapp}
            target="_blank"
            rel="noopener"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#25D366] px-5 py-3 text-[14px] font-extrabold text-white"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className="h-5 w-5">
              <path d="M12 2a10 10 0 00-8.6 15.1L2 22l5-1.3A10 10 0 1012 2zm5.8 14.3c-.2.7-1.2 1.3-2 1.4-.5.1-1.2.2-3.5-.7-2.9-1.2-4.8-4.2-5-4.4-.1-.2-1.1-1.5-1.1-2.9s.7-2 1-2.3c.2-.3.5-.4.7-.4h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.4 0 .6l-.4.5c-.1.2-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.3 2.4 1.5.2.1.4.1.5-.1l.8-.9c.2-.2.4-.2.6-.1l2 .9c.2.1.4.2.4.3.1.2.1.7-.1 1.3z" />
            </svg>
            Falar agora no WhatsApp
          </a>
        )}
      </div>
    );
  }

  return (
    <form id={id} action={enviar} className="grid gap-4">
      {estado.erro && (
        <p role="alert" className="rounded-lg border border-critico/30 bg-critico/5 px-4 py-3 text-[13.5px] font-semibold text-critico">
          {estado.erro}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo id={`${base}-nome`} nome="nome" rotulo="Nome" autoComplete="name" obrigatorio />
        <Campo id={`${base}-whats`} nome="whatsapp" rotulo="WhatsApp com DDD" inputMode="tel" autoComplete="tel" obrigatorio />
        <Campo id={`${base}-email`} nome="email" rotulo="E-mail" tipo="email" autoComplete="email" dica="opcional" />
        <Campo id={`${base}-estado`} nome="estado" rotulo="Estado" autoComplete="address-level1" dica="opcional" />

        <Escolha
          id={`${base}-poco`}
          nome="poco"
          rotulo="Diâmetro do poço"
          opcoes={['6 polegadas', '8 polegadas', 'não sei']}
        />
        <Escolha
          id={`${base}-volt`}
          nome="voltagem"
          rotulo="Voltagem na propriedade"
          opcoes={["110V", "220V", "não sei"]}
        />
        <Campo
          id={`${base}-prof`}
          nome="profundidade"
          rotulo="Profundidade aproximada"
          dica="em metros, se souber"
          inputMode="numeric"
        />
        <Escolha
          id={`${base}-uso`}
          nome="uso"
          rotulo="O que vai bombear"
          opcoes={["água limpa", "poço caipira", "não sei"]}
        />
      </div>

      <label className="block">
        <span className="mb-1.5 block text-[12.5px] font-bold">
          Quer contar mais alguma coisa? <span className="font-medium text-mudo">(opcional)</span>
        </span>
        <textarea
          name="observacoes"
          rows={3}
          className="w-full rounded-lg border border-linha-2 bg-superficie px-3 py-2.5 text-[14px]"
          placeholder="Ex.: a bomba antiga parou, o poço tem 40 metros e a água desce pouco."
        />
      </label>

      <button
        disabled={enviando}
        className="rounded-lg bg-ouro px-6 py-3.5 text-[15px] font-extrabold text-ouro-txt shadow-lg shadow-ouro/25 disabled:opacity-60"
      >
        {enviando ? "Enviando…" : "Receber indicação de bomba"}
      </button>

      <p className="text-[11.5px] leading-snug text-mudo">
        Usamos os seus dados só para indicar a bomba e responder. Nada de lista de e-mails.
      </p>
    </form>
  );
}

function Campo({
  id,
  nome,
  rotulo,
  tipo = "text",
  dica,
  obrigatorio,
  ...resto
}: {
  id: string;
  nome: string;
  rotulo: string;
  tipo?: string;
  dica?: string;
  obrigatorio?: boolean;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label htmlFor={id} className="block">
      <span className="mb-1.5 block text-[12.5px] font-bold">
        {rotulo}
        {dica && <span className="ml-1.5 font-medium text-mudo">({dica})</span>}
      </span>
      <input
        {...resto}
        id={id}
        name={nome}
        type={tipo}
        required={obrigatorio}
        className="w-full rounded-lg border border-linha-2 bg-superficie px-3 py-2.5 text-[14px] font-semibold"
      />
    </label>
  );
}

/**
 * Botões em vez de lista suspensa.
 *
 * São três respostas e o dedo escolhe numa batida · lista suspensa no celular
 * abre uma roda que a pessoa fecha sem escolher.
 */
function Escolha({ id, nome, rotulo, opcoes }: { id: string; nome: string; rotulo: string; opcoes: string[] }) {
  return (
    <fieldset>
      <legend className="mb-1.5 block text-[12.5px] font-bold">{rotulo}</legend>
      <div className="flex flex-wrap gap-2">
        {opcoes.map((o, i) => (
          <label
            key={o}
            className="cursor-pointer rounded-lg border border-linha-2 bg-superficie px-3 py-2 text-[13px] font-semibold text-tinta-2 transition-colors has-[:checked]:border-marca has-[:checked]:bg-marca-suave has-[:checked]:text-marca"
          >
            <input
              type="radio"
              id={i === 0 ? id : undefined}
              name={nome}
              value={o}
              className="sr-only"
            />
            {o}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
