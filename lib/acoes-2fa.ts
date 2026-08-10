"use server";

import QRCode from "qrcode";
import { conferirSenha } from "@/lib/admin-auth";
import { conferir, uriDeCadastro } from "@/lib/dois-fatores";

/**
 * Cadastro do autenticador, do lado do servidor.
 *
 * O QR carrega o segredo em texto claro: quem fotografa a tela leva o segundo
 * fator inteiro. Por isso ele só aparece depois da senha do painel, e nunca
 * fica numa página que se abre sozinha.
 *
 * Isso resolve o problema do ovo e da galinha. O segundo fator é obrigatório
 * para entrar, então quem ainda não cadastrou o aplicativo não conseguiria
 * chegar a uma tela de cadastro que ficasse dentro do painel. Aqui a senha
 * basta para ver o QR, mas não para entrar.
 */

/**
 * A senha protege o QR, então esta rota é um oráculo de senha: sem freio, dá
 * para testar milhares por minuto. Uma trava por processo não é perfeita — a
 * Vercel roda várias instâncias — mas derruba a tentativa automatizada, que é
 * o que existe de verdade.
 */
const tentativas = new Map<string, { n: number; ate: number }>();
const LIMITE = 5;
const CASTIGO = 10 * 60 * 1000;

function travado(chave: string) {
  const t = tentativas.get(chave);
  if (!t) return false;
  if (Date.now() > t.ate) return tentativas.delete(chave), false;
  return t.n >= LIMITE;
}

function errou(chave: string) {
  const t = tentativas.get(chave);
  tentativas.set(chave, { n: (t && Date.now() < t.ate ? t.n : 0) + 1, ate: Date.now() + CASTIGO });
}

export type Cadastro =
  | { ok: true; qr: string; segredo: string; conta: string }
  | { ok: false; erro: string };

export async function revelarQr(senha: string): Promise<Cadastro> {
  if (travado("qr")) {
    return { ok: false, erro: "Muitas tentativas. Espere dez minutos e tente de novo." };
  }

  if (!conferirSenha(senha)) {
    errou("qr");
    return { ok: false, erro: "Senha incorreta." };
  }
  tentativas.delete("qr");

  const segredo = process.env.ADMIN_2FA_SECRET;
  if (!segredo) {
    return {
      ok: false,
      erro: "O segundo fator não está ligado neste ambiente (falta ADMIN_2FA_SECRET).",
    };
  }

  const conta = "Vibra Vert · painel";
  const qr = await QRCode.toDataURL(uriDeCadastro(segredo, conta), {
    margin: 1,
    width: 480,
    errorCorrectionLevel: "M",
    color: { dark: "#14307a", light: "#ffffff" },
  });

  // O segredo volta em blocos de quatro: quem digita à mão, porque a câmera do
  // computador não lê a própria tela, erra muito menos assim.
  const legivel = segredo.replace(/(.{4})/g, "$1 ").trim();
  return { ok: true, qr, segredo: legivel, conta };
}

/**
 * Confere o código sem deixar entrar.
 *
 * Descobrir que o relógio do celular está fora de hora na hora do login, com o
 * painel recusando e sem dizer por quê, é o jeito de perder a confiança no
 * aplicativo. Melhor testar antes, num lugar onde errar não custa nada.
 */
export async function testarCodigo(codigo: string): Promise<{ ok: boolean; erro?: string }> {
  const limpo = codigo.replace(/\D/g, "");
  if (limpo.length !== 6) return { ok: false, erro: "O código tem 6 dígitos." };
  if (!conferir(limpo)) {
    return {
      ok: false,
      erro: "Esse código não bateu. Confira se o relógio do celular está no automático e tente com o código novo.",
    };
  }
  return { ok: true };
}
