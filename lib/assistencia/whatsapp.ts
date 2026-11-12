import { prisma } from "@/lib/prisma";
import { linkProtocolo } from "./acesso";

/**
 * Avisos do chamado por WhatsApp, pelo Conversas (API oficial da Meta).
 *
 * A loja não fala com a Meta: pede ao Conversas (Edge Function loja-aviso), que
 * manda o template aprovado do número configurado lá e deixa a mensagem na
 * conversa do cliente · se ele responder, cai no Conversas como qualquer outra.
 *
 * Só vai para quem marcou no formulário "Quero receber os avisos do chamado
 * pelo WhatsApp" (a Meta exige o consentimento). Nunca derruba o fluxo: sem
 * configuração, sem consentimento ou com erro, o e-mail continua sendo o aviso.
 */

const SITE = process.env.NEXT_PUBLIC_URL || "https://www.vibravert.com.br";

/** Pergunta gravada em `respostas` com o consentimento, no texto que o cliente viu. */
export const CONSENTIMENTO_WHATSAPP = {
  pergunta: "avisoWhatsapp",
  texto: "Quero receber os avisos do chamado pelo WhatsApp",
} as const;

const TEMPLATE = {
  recebido: "assistencia_chamado_recebido",
  resposta: "assistencia_resposta_pronta",
} as const;

/**
 * `chave` torna o envio idempotente no Conversas: a mesma chave não manda duas
 * vezes (um retry não vira mensagem repetida para o cliente).
 */
export async function avisoWhatsapp(chamadoId: string, tipo: keyof typeof TEMPLATE, chave: string) {
  const url = process.env.CONVERSAS_AVISO_URL;
  const segredo = process.env.CONVERSAS_AVISO_SEGREDO;
  if (!url || !segredo) return;
  try {
    const c = await prisma.chamado.findUnique({
      where: { id: chamadoId },
      select: { protocolo: true, nome: true, telefone: true, respostas: { where: { pergunta: CONSENTIMENTO_WHATSAPP.pergunta }, select: { valor: true } } },
    });
    if (!c || c.respostas[0]?.valor !== "sim") return;
    const nome = c.nome.split(" ")[0] || "cliente";
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-loja-segredo": segredo },
      body: JSON.stringify({
        telefone: c.telefone,
        nome: c.nome,
        template: TEMPLATE[tipo],
        vars: { body: [nome, c.protocolo, `${SITE}${linkProtocolo(c.protocolo)}`] },
        chave: `${c.protocolo}:${chave}`,
        nota:
          tipo === "recebido"
            ? `Chamado de assistência ${c.protocolo} aberto no site da Vibra Vert. O técnico responde pelo painel da loja; o cliente recebeu o aviso por WhatsApp e e-mail.`
            : `Resposta do chamado ${c.protocolo} liberada pela assistência técnica (painel da loja).`,
      }),
      signal: AbortSignal.timeout(15_000),
      cache: "no-store",
    });
    if (!r.ok) console.error("aviso WhatsApp", c.protocolo, tipo, r.status, (await r.text()).slice(0, 300));
  } catch (e) {
    console.error("aviso WhatsApp", chamadoId, tipo, e instanceof Error ? e.message : e);
  }
}
