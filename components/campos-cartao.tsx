"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Campos do cartão, no Checkout Transparente.
 *
 * Os três campos sensíveis (número, validade e CVV) são iframes do próprio
 * Mercado Pago · Secure Fields. O número do cartão nunca passa pelo nosso
 * JavaScript nem pelo nosso servidor, e por isso a loja fica fora do escopo
 * de PCI. Um input comum funcionaria igual e sairia mais barato de escrever,
 * mas colocaria a Vibra Vert como responsável por guardar cartão alheio.
 *
 * O que sobe daqui é um token de uso único, num campo escondido do
 * formulário. O resto do checkout não muda.
 */

type MP = {
  fields: {
    create: (tipo: string, opcoes?: Record<string, unknown>) => {
      mount: (id: string) => { on: (ev: string, fn: (d: { bin?: string }) => void) => void };
      unmount?: () => void;
    };
    createCardToken: (d: Record<string, unknown>) => Promise<{ id: string }>;
  };
  getPaymentMethods: (d: { bin: string }) => Promise<{ results: { id: string }[] }>;
};

declare global {
  interface Window {
    MercadoPago?: new (chave: string, o?: { locale?: string }) => MP;
  }
}

const CAIXA =
  "h-[46px] w-full rounded-lg border border-linha-2 bg-superficie px-3 [&>iframe]:h-full [&>iframe]:w-full";

export function CamposCartao({ chavePublica }: { chavePublica: string }) {
  const mp = useRef<MP | null>(null);
  const [pronto, setPronto] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;

    async function montar() {
      // O SDK é carregado só quando alguém escolhe cartão: quem paga no PIX
      // não deveria baixar script de terceiro nenhum.
      if (!window.MercadoPago) {
        await new Promise<void>((ok, falha) => {
          const s = document.createElement("script");
          s.src = "https://sdk.mercadopago.com/js/v2";
          s.onload = () => ok();
          s.onerror = () => falha(new Error("não carregou"));
          document.head.appendChild(s);
        });
      }
      if (!vivo || !window.MercadoPago) return;

      const inst = new window.MercadoPago(chavePublica, { locale: "pt-BR" });
      mp.current = inst;
      // O formulário tokeniza no clique de finalizar, e ele não enxerga este
      // ref. Pendurar a instância na janela é o caminho que o próprio SDK
      // usa · ele já vive lá.
      (window as unknown as { __mpInstancia?: MP }).__mpInstancia = inst;

      const estilo = { placeholderColor: "#8a93a5", fontSize: "14px" };

      inst.fields
        .create("cardNumber", { placeholder: "0000 0000 0000 0000", style: estilo })
        .mount("mp-numero")
        // A bandeira sai dos seis primeiros dígitos. O Mercado Pago exige o
        // payment_method_id junto do token, e adivinhar pelo prefixo à mão
        // erra em cartão de bandeira menos comum.
        .on("binChange", async (d) => {
          if (!d.bin) return;
          const r = await inst.getPaymentMethods({ bin: d.bin }).catch(() => null);
          const id = r?.results?.[0]?.id;
          const campo = document.querySelector<HTMLInputElement>('input[name="bandeiraCartao"]');
          if (campo && id) campo.value = id;
        });

      inst.fields.create("expirationDate", { placeholder: "MM/AA", style: estilo }).mount("mp-validade");
      inst.fields.create("securityCode", { placeholder: "CVV", style: estilo }).mount("mp-cvv");

      if (vivo) setPronto(true);
    }

    montar().catch(() => {
      if (vivo) setErro("Não consegui carregar o formulário seguro do cartão. Recarregue a página.");
    });

    return () => {
      vivo = false;
    };
  }, [chavePublica]);

  return (
    <div className="mt-3 grid gap-3">
      <input type="hidden" name="bandeiraCartao" defaultValue="" />

      <label className="block">
        <span className="mb-1.5 block text-[12.5px] font-bold">Número do cartão</span>
        <div id="mp-numero" className={CAIXA} />
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-[12.5px] font-bold">Validade</span>
          <div id="mp-validade" className={CAIXA} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[12.5px] font-bold">Código de segurança</span>
          <div id="mp-cvv" className={CAIXA} />
        </label>
      </div>

      <label className="block">
        <span className="mb-1.5 block text-[12.5px] font-bold">Nome impresso no cartão</span>
        <input
          name="nomeCartao"
          autoComplete="cc-name"
          placeholder="como aparece no cartão"
          className="h-[46px] w-full rounded-lg border border-linha-2 bg-superficie px-3 text-[14px]"
        />
      </label>

      {erro && (
        <p className="rounded-lg border-l-[3px] border-critico bg-critico/[0.06] px-3.5 py-2.5 text-[12.5px] text-critico">
          {erro}
        </p>
      )}

      <p className="text-[11.5px] leading-snug text-mudo">
        {pronto
          ? "Os dados do cartão vão direto para o Mercado Pago, criptografados. A Vibra Vert não recebe nem guarda o número."
          : "Carregando o formulário seguro…"}
      </p>
    </div>
  );
}

/**
 * Troca os campos por um token, no clique de finalizar.
 *
 * Fica fora do componente porque quem manda o formulário é o formulário, não
 * o cartão: é ele que precisa segurar o envio até o token existir.
 */
export async function gerarTokenCartao(dados: {
  nome: string;
  cpf: string;
}): Promise<{ token?: string; erro?: string }> {
  const mp = (window as unknown as { __mpInstancia?: MP }).__mpInstancia;
  if (!mp) return { erro: "O formulário do cartão ainda não carregou. Espere um instante e tente de novo." };

  try {
    const documento = dados.cpf.replace(/\D/g, "");
    const t = await mp.fields.createCardToken({
      cardholderName: dados.nome,
      identificationType: documento.length > 11 ? "CNPJ" : "CPF",
      identificationNumber: documento,
    });
    return { token: t.id };
  } catch {
    return { erro: "Confira o número, a validade e o código de segurança do cartão." };
  }
}
