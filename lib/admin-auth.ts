import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "node:crypto";
import type { PapelUsuario } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { conferirSenhaHash } from "@/lib/senha";
import { conferir } from "@/lib/dois-fatores";

/**
 * Porta do painel, com uma conta por pessoa.
 *
 * Antes era uma senha só, compartilhada. Isso funcionava com uma pessoa e
 * quebra com duas: não dá para saber quem trocou o preço, tirar o acesso de
 * alguém obriga a trocar a senha de todo mundo, e o segundo fator mora num
 * celular só.
 *
 * O cookie leva o id do usuário e uma assinatura HMAC. Sem a assinatura,
 * bastaria escrever outro id no navegador para virar outra pessoa.
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
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

export type Sessao = {
  id: string;
  login: string;
  nome: string;
  papel: PapelUsuario;
};

/**
 * Quem está logado, ou null.
 *
 * Consulta o banco a cada verificação em vez de confiar no que está no cookie.
 * É uma consulta por navegação, e é o que faz "desativar o usuário" ter efeito
 * imediato — com os dados dentro do cookie, alguém desativado continuaria
 * entrando até o cookie vencer, o que pode ser um mês.
 */
export async function usuarioAtual(): Promise<Sessao | null> {
  const c = (await cookies()).get(COOKIE)?.value;
  if (!c) return null;

  const [id, emitidoEm, duracao, assinatura] = c.split(".");
  if (!id || !emitidoEm || !duracao || !assinatura) return null;
  // A duração vai assinada junto: se ficasse fora da assinatura, bastaria
  // editá-la no navegador para transformar oito horas em dez anos.
  if (Date.now() - Number(emitidoEm) > Number(duracao) * 1000) return null;
  if (!comparar(assinatura, assinar(`${id}.${emitidoEm}.${duracao}`))) return null;

  const u = await prisma.usuario.findUnique({
    where: { id },
    select: { id: true, login: true, nome: true, papel: true, ativo: true },
  });
  if (!u || !u.ativo) return null;

  return { id: u.id, login: u.login, nome: u.nome, papel: u.papel };
}

export async function autenticado() {
  return (await usuarioAtual()) !== null;
}

/** Só quem desenvolve vê integrações, credenciais e diagnóstico técnico. */
export async function ehDesenvolvedor() {
  return (await usuarioAtual())?.papel === "DESENVOLVEDOR";
}

/**
 * Quem pode dar e tirar acesso: o dono e quem cuida do sistema.
 *
 * O operador não entra aqui de propósito. Quem opera a loja não precisa poder
 * criar uma conta nova, e cada pessoa a mais com esse poder é uma porta a mais
 * para deixar aberta.
 */
export async function podeGerirEquipe() {
  const p = (await usuarioAtual())?.papel;
  return p === "MASTER" || p === "DESENVOLVEDOR";
}

async function abrirSessao(id: string, manter: boolean) {
  const emitidoEm = String(Date.now());
  const duracao = String(manter ? UM_MES : OITO_HORAS);
  (await cookies()).set(COOKIE, `${id}.${emitidoEm}.${duracao}.${assinar(`${id}.${emitidoEm}.${duracao}`)}`, {
    maxAge: manter ? UM_MES : OITO_HORAS,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
}

/**
 * Entrar.
 *
 * A resposta de erro é sempre a mesma para login inexistente e senha errada.
 * Distinguir os dois entrega a lista de quem tem acesso a quem estiver
 * tentando.
 */
export async function entrar(login: string, senha: string, manter = false, codigo = "") {
  const u = await prisma.usuario.findUnique({
    where: { login: login.trim().toLowerCase() },
  });

  if (!u || !u.ativo || !(await conferirSenhaHash(senha, u.senhaHash))) {
    return { ok: false as const, erro: "Usuário ou senha incorretos" };
  }

  // O segundo fator só é exigido de quem já cadastrou o aplicativo. Assim
  // ninguém fica trancado do lado de fora no dia em que a conta é criada.
  if (u.segredo2FA && !conferir(codigo, u.segredo2FA)) {
    return {
      ok: false as const,
      erro: codigo ? "Código inválido ou expirado" : "Informe o código do aplicativo",
    };
  }

  await prisma.usuario.update({ where: { id: u.id }, data: { ultimoAcesso: new Date() } });
  await abrirSessao(u.id, manter);
  return { ok: true as const, precisaCadastrar2FA: !u.segredo2FA };
}

/**
 * Confere a senha sem abrir sessão.
 *
 * A tela do QR precisa disto: a senha basta para ver o próprio QR, e não basta
 * para entrar. São autorizações diferentes.
 */
export async function conferirSenhaDe(usuarioId: string, senha: string) {
  const u = await prisma.usuario.findUnique({
    where: { id: usuarioId },
    select: { senhaHash: true, ativo: true },
  });
  return Boolean(u?.ativo) && conferirSenhaHash(senha, u!.senhaHash);
}

export async function sair() {
  (await cookies()).delete(COOKIE);
}

/**
 * Trilha de auditoria.
 *
 * Falha em silêncio de propósito: não registrar é ruim, mas derrubar a ação
 * que a pessoa acabou de fazer por causa do registro é pior.
 */
export async function registrarAcao(acao: string, alvo?: string, detalhe?: string) {
  const u = await usuarioAtual();
  if (!u) return;
  try {
    await prisma.registro.create({ data: { usuarioId: u.id, acao, alvo, detalhe } });
  } catch (e) {
    console.error("[auditoria] não registrou:", e);
  }
}
