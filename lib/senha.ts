import { scrypt, randomBytes, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

/**
 * Guarda de senha.
 *
 * scrypt, que vem no Node e não precisa de dependência. É deliberadamente
 * lento: o custo que ninguém percebe ao entrar uma vez é o que inviabiliza
 * testar milhões de senhas contra um banco vazado.
 *
 * O sal é por usuário. Sem ele, duas pessoas com a mesma senha teriam o mesmo
 * hash, e uma tabela pronta quebraria as duas de uma vez.
 */
const derivar = promisify(scrypt) as (
  senha: string,
  sal: string,
  tamanho: number,
) => Promise<Buffer>;

const TAMANHO = 64;

export async function protegerSenha(senha: string) {
  const sal = randomBytes(16).toString("hex");
  const hash = await derivar(senha, sal, TAMANHO);
  return `scrypt:${sal}:${hash.toString("hex")}`;
}

export async function conferirSenhaHash(senha: string, guardada: string) {
  const [algoritmo, sal, hash] = guardada.split(":");
  if (algoritmo !== "scrypt" || !sal || !hash) return false;

  const calculado = await derivar(senha, sal, TAMANHO);
  const esperado = Buffer.from(hash, "hex");
  // Comparação em tempo constante: um `===` conta, pelo tempo, quantos bytes
  // iniciais estavam certos.
  return calculado.length === esperado.length && timingSafeEqual(calculado, esperado);
}

/**
 * Senha inicial legível.
 *
 * Sai daqui para ser lida em voz alta ou copiada de um papel, então nada de
 * caracteres que se confundem: sem l, I, 1, O ou 0. Quatro blocos de quatro
 * dão espaço de busca de sobra e ainda se digitam sem erro.
 */
export function senhaInicial() {
  const alfabeto = "abcdefghjkmnpqrstuvwxyz23456789";
  const bytes = randomBytes(16);
  const letras = [...bytes].map((b) => alfabeto[b % alfabeto.length]);
  return [0, 4, 8, 12].map((i) => letras.slice(i, i + 4).join("")).join("-");
}
