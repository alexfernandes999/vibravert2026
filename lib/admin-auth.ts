import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "node:crypto";
import { conferir, ativo as doisFatoresAtivo } from "@/lib/dois-fatores";

/**
 * Porta do painel.
 *
 * Uma senha única e um cookie assinado — não é gestão de usuários, e não
 * pretende ser. É o suficiente para o painel não ficar aberto na internet
 * enquanto a loja não tem contas de verdade, e a troca por autenticação real
 * (Supabase Auth, com um usuário por pessoa) toca só este arquivo.
 *
 * O cookie leva assinatura HMAC: sem ela, bastaria alguém escrever
 * `admin=1` no navegador para entrar.
 */
const COOKIE = "vv_admin";
const OITO_HORAS = 60 * 60 * 8;
/** "Manter conectado": um mês. Quem opera a loja entra várias vezes por dia. */
const UM_MES = 60 * 60 * 24 * 30;

const segredo = () => process.env.ADMIN_SEGREDO ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

function assinar(valor: string) {
  return createHmac("sha256", segredo()).update(valor).digest("hex");
}

function comparar(a: string, b: string) {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  // Comparar em tempo constante: um `===` vaza, pelo tempo de resposta,
  // quantos caracteres iniciais estavam certos.
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

export async function autenticado() {
  const c = (await cookies()).get(COOKIE)?.value;
  if (!c) return false;
  const [emitidoEm, duracao, assinatura] = c.split(".");
  if (!emitidoEm || !duracao || !assinatura) return false;
  // A duração vai assinada junto: se ficasse fora da assinatura, bastaria
  // editá-la no navegador para transformar oito horas em dez anos.
  if (Date.now() - Number(emitidoEm) > Number(duracao) * 1000) return false;
  return comparar(assinatura, assinar(`${emitidoEm}.${duracao}`));
}

export async function entrar(senha: string, manter = false, codigo = "") {
  const esperada = process.env.ADMIN_SENHA;
  if (!esperada) return { ok: false, erro: "ADMIN_SENHA não está definida no .env" };
  if (!comparar(senha, esperada)) return { ok: false, erro: "Senha incorreta" };

  // O segundo fator só é exigido quando há segredo configurado. Assim ligar e
  // desligar é trocar uma variável, sem alterar código nem trancar ninguém
  // para fora por engano.
  if (doisFatoresAtivo && !conferir(codigo)) {
    return { ok: false, erro: codigo ? "Código inválido ou expirado" : "Informe o código do aplicativo" };
  }

  const emitidoEm = String(Date.now());
  const duracao = String(manter ? UM_MES : OITO_HORAS);
  (await cookies()).set(COOKIE, `${emitidoEm}.${duracao}.${assinar(`${emitidoEm}.${duracao}`)}`, {
    maxAge: manter ? UM_MES : OITO_HORAS,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
  return { ok: true };
}

export async function sair() {
  (await cookies()).delete(COOKIE);
}
