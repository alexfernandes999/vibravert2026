import { createHmac, timingSafeEqual, randomBytes } from "node:crypto";

/**
 * Segundo fator do painel, no padrão TOTP (RFC 6238).
 *
 * Funciona com Google Authenticator, Authy, 1Password ou o próprio gerenciador
 * de senhas do celular. Escrito à mão em vez de trazer uma dependência: são
 * quarenta linhas de HMAC, e uma biblioteca a mais no caminho do login é uma
 * superfície a mais para se preocupar.
 *
 * Cada pessoa tem o seu segredo, guardado na própria conta: senha vazada não
 * basta para entrar, e quem perde o celular não derruba o acesso dos outros.
 */
const ALFABETO = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const PASSO = 30;
const DIGITOS = 6;

/** Base32 sem preenchimento, que é o formato que os aplicativos leem. */
export function gerarSegredo(bytes = 20) {
  const buf = randomBytes(bytes);
  let bits = "";
  for (const b of buf) bits += b.toString(2).padStart(8, "0");
  let saida = "";
  for (let i = 0; i + 5 <= bits.length; i += 5) saida += ALFABETO[parseInt(bits.slice(i, i + 5), 2)];
  return saida;
}

function base32ParaBytes(s: string) {
  const limpo = s.toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = "";
  for (const c of limpo) bits += ALFABETO.indexOf(c).toString(2).padStart(5, "0");
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(bytes);
}

function codigoNoInstante(segredo: string, contador: number) {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(contador));
  const h = createHmac("sha1", base32ParaBytes(segredo)).update(buf).digest();
  // truncamento dinâmico: o último nibble diz onde começar a ler
  const off = h[h.length - 1] & 0xf;
  const num = ((h[off] & 0x7f) << 24) | (h[off + 1] << 16) | (h[off + 2] << 8) | h[off + 3];
  return String(num % 10 ** DIGITOS).padStart(DIGITOS, "0");
}

/**
 * Aceita o intervalo anterior e o seguinte além do atual.
 *
 * Relógio de celular fora de hora por poucos segundos é comum, e recusar por
 * isso faz o usuário achar que o aplicativo está quebrado. Uma janela de trinta
 * segundos para cada lado é o que a própria RFC recomenda.
 */
export function conferir(codigo: string, segredo: string | null | undefined) {
  if (!segredo) return false;
  const limpo = codigo.replace(/\D/g, "");
  if (limpo.length !== DIGITOS) return false;

  const agora = Math.floor(Date.now() / 1000 / PASSO);
  for (const d of [-1, 0, 1]) {
    const esperado = codigoNoInstante(segredo, agora + d);
    const a = Buffer.from(limpo);
    const b = Buffer.from(esperado);
    if (a.length === b.length && timingSafeEqual(a, b)) return true;
  }
  return false;
}

/** URI que o aplicativo autenticador lê do QR. */
export function uriDeCadastro(segredo: string, conta = "Vibra Vert") {
  const p = new URLSearchParams({ secret: segredo, issuer: "Vibra Vert", digits: String(DIGITOS), period: String(PASSO) });
  return `otpauth://totp/${encodeURIComponent(conta)}?${p}`;
}
