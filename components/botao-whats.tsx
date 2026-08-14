"use client";

/**
 * Chamar no WhatsApp e marcar que chamou.
 *
 * O WhatsApp abre no navegador de quem atende, então o servidor nunca fica
 * sabendo do envio sozinho. O clique faz as duas coisas: abre a conversa com a
 * mensagem pronta e registra o lembrete, para o próximo atendente não repetir
 * a cobrança.
 */
export function BotaoWhats({
  href,
  telefone,
  marcar,
}: {
  href: string;
  telefone: string;
  marcar: () => void;
}) {
  return (
    <a
      href={href.replace(/wa\.me\/55\d+/, `wa.me/55${telefone.replace(/\D/g, "")}`)}
      target="_blank"
      rel="noopener"
      onClick={() => marcar()}
      className="inline-flex items-center gap-2 rounded-lg bg-[#25D366] px-4 py-2 text-[12.5px] font-bold text-white transition hover:brightness-105 active:scale-[0.98]"
    >
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
        <path d="M12 2a10 10 0 00-8.6 15.1L2 22l5-1.3A10 10 0 1012 2zm5.8 14.3c-.2.7-1.2 1.3-2 1.4-.5.1-1.2.2-3.5-.7-2.9-1.2-4.8-4.2-5-4.4-.1-.2-1.1-1.5-1.1-2.9s.7-2 1-2.3c.2-.3.5-.4.7-.4h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.4 0 .6l-.4.5c-.1.2-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.3 2.4 1.5.2.1.4.1.5-.1l.8-.9c.2-.2.4-.2.6-.1l2 .9c.2.1.4.2.4.3.1.2.1.7-.1 1.3z" />
      </svg>
      Chamar no WhatsApp
    </a>
  );
}
