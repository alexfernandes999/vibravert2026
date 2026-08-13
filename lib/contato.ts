/**
 * Um lugar só para telefone e WhatsApp.
 *
 * Estavam repetidos em dez arquivos, cada um com a sua formatação. No dia em
 * que a fábrica trocar de número, um deles ia ficar para trás — e o que fica
 * para trás é sempre o que o cliente encontra primeiro.
 *
 * São dois números diferentes, e misturá-los é o erro que importa: o fixo
 * atende voz, e mensagem mandada para ele não chega em ninguém.
 */
const so = (s: string) => s.replace(/\D/g, "");

/** Vibra Phone: atendimento por voz. */
export const TELEFONE = process.env.NEXT_PUBLIC_TELEFONE ?? "11 4000-2440";
export const TELEFONE_LINK = `+55${so(TELEFONE)}`;

/** WhatsApp: é para onde a Vibrinha passa a conversa. */
export const WHATSAPP = so(process.env.NEXT_PUBLIC_WHATSAPP ?? "1150332828");
export const WHATSAPP_BONITO = WHATSAPP.replace(/^(\d{2})(\d{4})(\d{4})$/, "$1 $2-$3").replace(
  /^(\d{2})(\d{5})(\d{4})$/,
  "$1 $2-$3",
);

/** wa.me quer o número com país e sem sinal nenhum. */
export const whatsappLink = (texto?: string) =>
  `https://wa.me/55${WHATSAPP}${texto ? `?text=${encodeURIComponent(texto)}` : ""}`;
