import { EMPRESA } from "@/lib/paginas";

/**
 * Botão flutuante do WhatsApp.
 *
 * Nesta categoria o cliente está sem água e quer falar com alguém agora —
 * é o canal que mais converte, mais até que o carrinho. Fica no canto e não
 * cobre o botão de comprar da ficha, que é o único lugar onde atrapalharia.
 *
 * ⚠ O número é o mesmo do telefone da fábrica, que é fixo. Se o WhatsApp da
 * empresa for outro, trocar aqui — link de WhatsApp para número fixo abre uma
 * conversa que nunca é respondida.
 */
const NUMERO = EMPRESA.telefone.replace(/\D/g, "");
const TEXTO = encodeURIComponent(
  "Olá! Vim pelo site e preciso de ajuda para escolher a bomba certa para o meu poço.",
);

export function BotaoWhatsapp() {
  return (
    <a
      href={`https://wa.me/55${NUMERO}?text=${TEXTO}`}
      target="_blank"
      rel="noopener"
      aria-label="Falar no WhatsApp"
      className="pulso fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] shadow-lg shadow-black/25 transition hover:scale-105"
    >
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-7 w-7 text-white">
        <path d="M17.47 14.38c-.3-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.64.07-.3-.15-1.25-.46-2.38-1.47-.88-.78-1.47-1.75-1.65-2.05-.17-.3-.02-.46.13-.6.14-.14.3-.35.45-.53.15-.18.2-.3.3-.5.1-.2.05-.38-.02-.53-.08-.15-.67-1.6-.92-2.2-.24-.58-.49-.5-.67-.5h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.22 3.08c.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.7.63.71.22 1.36.19 1.87.12.57-.09 1.75-.72 2-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35z" />
        <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.46 1.32 4.96L2 22l5.25-1.38a9.87 9.87 0 004.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91C21.96 6.45 17.5 2 12.04 2zm0 18.02h-.01a8.2 8.2 0 01-4.18-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.18 8.18 0 01-1.25-4.35c0-4.54 3.7-8.23 8.24-8.23a8.2 8.2 0 018.23 8.24c0 4.54-3.69 8.2-8.24 8.2z" />
      </svg>
    </a>
  );
}
