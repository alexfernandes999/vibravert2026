import { randomBytes, createHash, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { protegerSenha } from "@/lib/senha";
import { conferir } from "@/lib/dois-fatores";
import { recuperacaoDeSenha } from "@/lib/email";

/**
 * Troca de senha por e-mail.
 *
 * Três decisões que fazem a diferença entre uma recuperação e uma porta dos
 * fundos:
 *
 * 1. O banco guarda o hash do token, nunca o token. Quem lê a tabela não
 *    consegue montar o link.
 * 2. O segundo fator continua valendo. Sem isso, quem tomasse a caixa de
 *    e-mail entraria no painel, e o autenticador viraria enfeite.
 * 3. A resposta é sempre a mesma, exista ou não a conta. Dizer "esse e-mail
 *    não está cadastrado" entrega a lista de quem tem acesso.
 */
const VALIDADE = 30 * 60 * 1000;

/** Um pedido a cada dois minutos por conta. Evita virar canhão de e-mail. */
const INTERVALO = 2 * 60 * 1000;

const resumir = (token: string) => createHash("sha256").update(token).digest("hex");

export type Pedido = { ok: true; enviado: boolean } | { ok: false; erro: string };

export async function pedirTroca(identificador: string, base: string): Promise<Pedido> {
  const chave = identificador.trim().toLowerCase();
  if (chave.length < 3) return { ok: false, erro: "Informe o seu usuário ou e-mail." };

  const u = await prisma.usuario.findFirst({
    where: { ativo: true, OR: [{ login: chave }, { email: chave }] },
    select: { id: true, nome: true, email: true },
  });

  // Sem conta, a função devolve sucesso do mesmo jeito. Quem está tentando
  // descobrir quem tem acesso não aprende nada com a resposta.
  if (!u) return { ok: true, enviado: false };

  const recente = await prisma.recuperacaoSenha.findFirst({
    where: { usuarioId: u.id, criadoEm: { gt: new Date(Date.now() - INTERVALO) } },
  });
  if (recente) return { ok: true, enviado: false };

  const token = randomBytes(32).toString("base64url");
  await prisma.recuperacaoSenha.create({
    data: {
      usuarioId: u.id,
      tokenHash: resumir(token),
      expiraEm: new Date(Date.now() + VALIDADE),
    },
  });

  const link = `${base}/admin/recuperar/${token}`;
  const r = await recuperacaoDeSenha(u.email, u.nome, link);

  // Sem chave do Resend o envio não acontece, e o link fica no log do
  // servidor. É o que permite destravar alguém antes de o e-mail estar ligado,
  // sem abrir a informação no navegador de quem pediu.
  if (!r.ok) console.info(`[recuperação] link para ${u.email}: ${link}`);

  return { ok: true, enviado: r.ok };
}

export type Conta = { id: string; nome: string; login: string; temDoisFatores: boolean };

export async function validarToken(token: string): Promise<Conta | null> {
  const registro = await prisma.recuperacaoSenha.findUnique({
    where: { tokenHash: resumir(token) },
  });
  if (!registro || registro.usadoEm || registro.expiraEm < new Date()) return null;

  const u = await prisma.usuario.findUnique({
    where: { id: registro.usuarioId },
    select: { id: true, nome: true, login: true, ativo: true, segredo2FA: true },
  });
  if (!u?.ativo) return null;

  return { id: u.id, nome: u.nome, login: u.login, temDoisFatores: Boolean(u.segredo2FA) };
}

export type Conclusao = { ok: true } | { ok: false; erro: string };

export async function concluirTroca(
  token: string,
  senha: string,
  repetida: string,
  codigo: string,
): Promise<Conclusao> {
  if (senha.length < 10) return { ok: false, erro: "A senha precisa de pelo menos 10 caracteres." };

  const a = Buffer.from(senha);
  const b = Buffer.from(repetida);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false, erro: "As duas senhas não são iguais." };
  }

  const registro = await prisma.recuperacaoSenha.findUnique({
    where: { tokenHash: resumir(token) },
  });
  if (!registro || registro.usadoEm || registro.expiraEm < new Date()) {
    return { ok: false, erro: "Este link não vale mais. Peça outro." };
  }

  const u = await prisma.usuario.findUnique({
    where: { id: registro.usuarioId },
    select: { id: true, ativo: true, segredo2FA: true },
  });
  if (!u?.ativo) return { ok: false, erro: "Este link não vale mais. Peça outro." };

  // O segundo fator vale também aqui. Quem tomou o e-mail ainda não tem o
  // celular, e é exatamente esse o caso que o autenticador existe para cobrir.
  if (u.segredo2FA && !conferir(codigo, u.segredo2FA)) {
    return {
      ok: false,
      erro: codigo ? "Código do aplicativo inválido ou expirado." : "Informe o código do aplicativo.",
    };
  }

  await prisma.$transaction([
    prisma.usuario.update({ where: { id: u.id }, data: { senhaHash: await protegerSenha(senha) } }),
    // Marca o usado e derruba os outros pedidos em aberto da mesma conta: dois
    // links válidos ao mesmo tempo é uma janela que não precisa existir.
    prisma.recuperacaoSenha.updateMany({
      where: { usuarioId: u.id, usadoEm: null },
      data: { usadoEm: new Date() },
    }),
  ]);

  return { ok: true };
}
