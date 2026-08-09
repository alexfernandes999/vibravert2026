import type { Pedido, PedidoItem, Endereco, Cliente } from "@prisma/client";

/**
 * E-mails do pedido.
 *
 * Como o pagamento e o frete, esta camada declara quando não está configurada
 * em vez de estourar. Sem chave, o envio é registrado no log do servidor e a
 * compra segue — um erro de e-mail nunca pode derrubar um pedido que já foi
 * pago.
 *
 * O remetente precisa de SPF e DKIM no domínio. Atenção: o e-mail da Vibra
 * Vert está na Locaweb, então os registros novos entram ao lado dos que já
 * existem — trocar o SPF em vez de acrescentar derruba o e-mail da empresa.
 */
export const configurado = Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_REMETENTE);

type PedidoCompleto = Pedido & { itens: PedidoItem[]; endereco: Endereco; cliente: Cliente };

const brl = (v: unknown) =>
  Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const base = process.env.NEXT_PUBLIC_URL ?? "https://www.vibravert.com.br";

/** HTML de e-mail: tabela e estilo em linha, que é o que os clientes renderizam. */
function molde(titulo: string, corpo: string, p: PedidoCompleto) {
  const itens = p.itens
    .map(
      (i) => `<tr>
        <td style="padding:9px 0;border-bottom:1px solid #e5e9f0;font:14px system-ui;color:#333b4d">
          ${i.quantidade}× ${i.nomeProduto}<br>
          <span style="color:#7c848f;font-size:12px">SKU ${i.skuProduto}</span>
        </td>
        <td align="right" style="padding:9px 0;border-bottom:1px solid #e5e9f0;font:600 14px system-ui;color:#12172a;white-space:nowrap">
          ${brl(Number(i.precoUnitario) * i.quantidade)}
        </td>
      </tr>`,
    )
    .join("");

  return `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#f2f5fa;padding:28px 12px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
    <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:12px;overflow:hidden">
      <tr><td style="background:#0a1b4d;padding:20px 26px">
        <div style="font:800 19px system-ui;letter-spacing:-.4px;color:#fff">VIBRA VERT</div>
        <div style="font:12px system-ui;color:rgba(255,255,255,.6);margin-top:2px">Bombas Submersas Vibratórias</div>
      </td></tr>

      <tr><td style="padding:26px">
        <h1 style="margin:0 0 8px;font:800 21px system-ui;letter-spacing:-.4px;color:#12172a">${titulo}</h1>
        <p style="margin:0 0 20px;font:15px/1.55 system-ui;color:#333b4d">${corpo}</p>

        <div style="background:#eef2f9;border-radius:10px;padding:14px 16px;margin-bottom:20px">
          <div style="font:700 11px system-ui;letter-spacing:1.2px;text-transform:uppercase;color:#14307a">Pedido nº ${p.numero}</div>
        </div>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${itens}
          <tr><td style="padding:14px 0 0;font:15px system-ui;color:#333b4d">Frete</td>
              <td align="right" style="padding:14px 0 0;font:600 15px system-ui;color:#12172a">${Number(p.frete) === 0 ? "Grátis" : brl(p.frete)}</td></tr>
          <tr><td style="padding:6px 0 0;font:800 17px system-ui;color:#12172a">Total</td>
              <td align="right" style="padding:6px 0 0;font:800 17px system-ui;color:#12172a">${brl(p.total)}</td></tr>
        </table>

        <div style="margin-top:22px;padding-top:18px;border-top:1px solid #e5e9f0">
          <div style="font:700 11px system-ui;letter-spacing:1.2px;text-transform:uppercase;color:#14307a">Entrega</div>
          <p style="margin:6px 0 0;font:14px/1.6 system-ui;color:#333b4d">
            ${p.cliente.nome}<br>
            ${p.endereco.logradouro}, ${p.endereco.numero}${p.endereco.complemento ? ` · ${p.endereco.complemento}` : ""}<br>
            ${p.endereco.bairro} · ${p.endereco.cidade}/${p.endereco.uf} · CEP ${p.endereco.cep}
          </p>
        </div>

        <a href="${base}/pedido/${p.numero}" style="display:inline-block;margin-top:22px;background:#F5B921;color:#6b4c00;font:800 14px system-ui;text-decoration:none;padding:12px 22px;border-radius:8px">
          Acompanhar pedido
        </a>
      </td></tr>

      <tr><td style="padding:18px 26px;background:#eef2f9;font:12px/1.6 system-ui;color:#7c848f">
        Dúvidas? Ligue 11 4000-2440 — falamos de bomba, não é SAC.<br>
        Vibra Vert Bombas Submersas Vibratórias · Rua Charles Darwin, 707 · São Paulo/SP
      </td></tr>
    </table>
  </td></tr></table></body></html>`;
}

async function enviar(para: string, assunto: string, html: string) {
  if (!configurado) {
    console.info(`[email] não enviado (sem RESEND_API_KEY) → ${para}: ${assunto}`);
    return { ok: false, motivo: "sem-credencial" as const };
  }
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: process.env.EMAIL_REMETENTE, to: para, subject: assunto, html }),
    });
    if (!r.ok) throw new Error(String(r.status));
    return { ok: true as const };
  } catch (e) {
    // Falha de e-mail nunca derruba um pedido já pago.
    console.error("[email] falhou:", e);
    return { ok: false, motivo: "falha" as const };
  }
}

export function pedidoRecebido(p: PedidoCompleto) {
  const comoPagar =
    p.metodo === "PIX"
      ? "Assim que o PIX for confirmado — costuma ser em segundos — o pedido entra em separação."
      : p.metodo === "BOLETO"
        ? "O pedido entra em separação assim que o boleto for compensado, o que leva até dois dias úteis."
        : "Estamos confirmando o pagamento com a operadora. Avisamos assim que for aprovado.";

  return enviar(
    p.cliente.email,
    `Recebemos o seu pedido nº ${p.numero}`,
    molde("Pedido recebido", comoPagar, p),
  );
}

export function pagamentoConfirmado(p: PedidoCompleto) {
  return enviar(
    p.cliente.email,
    `Pagamento confirmado — pedido nº ${p.numero}`,
    molde(
      "Pagamento confirmado",
      "Seu pedido entrou em separação e sai da nossa fábrica em até 24 horas úteis. Avisamos com o código de rastreio quando despachar.",
      p,
    ),
  );
}

export function pedidoEnviado(p: PedidoCompleto) {
  return enviar(
    p.cliente.email,
    `Seu pedido nº ${p.numero} foi enviado`,
    molde(
      "Pedido a caminho",
      p.rastreio
        ? `O código de rastreio é <strong>${p.rastreio}</strong>. Guarde a nota fiscal e o certificado que vêm na caixa: são eles que valem na garantia.`
        : "Guarde a nota fiscal e o certificado que vêm na caixa: são eles que valem na garantia.",
      p,
    ),
  );
}
