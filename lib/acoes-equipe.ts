"use server";

import { revalidatePath } from "next/cache";
import type { PapelUsuario } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { podeGerirEquipe, registrarAcao, usuarioAtual } from "@/lib/admin-auth";
import { protegerSenha, senhaInicial } from "@/lib/senha";

/**
 * Criar e administrar contas, do próprio painel.
 *
 * Antes só existia pela linha de comando, o que significava depender de quem
 * desenvolve para dar acesso a alguém do escritório. Aqui o dono resolve
 * sozinho.
 *
 * Toda ação confere o papel de novo no servidor. Esconder o menu não é
 * proteção: quem souber o endereço chega igual.
 */
export type Resultado =
  | { ok: true; mensagem: string; senha?: string }
  | { ok: false; erro: string };

const PAPEIS: PapelUsuario[] = ["OPERADOR", "MASTER", "DESENVOLVEDOR"];

export async function criarUsuario(dados: FormData): Promise<Resultado> {
  if (!(await podeGerirEquipe())) return { ok: false, erro: "Você não tem permissão para isso." };

  const login = String(dados.get("login") ?? "").trim().toLowerCase();
  const nome = String(dados.get("nome") ?? "").trim();
  const email = String(dados.get("email") ?? "").trim().toLowerCase();
  const papel = String(dados.get("papel") ?? "OPERADOR") as PapelUsuario;

  if (!/^[a-z0-9._-]{3,20}$/.test(login)) {
    return { ok: false, erro: "O usuário deve ter de 3 a 20 letras, números, ponto, traço ou sublinhado." };
  }
  if (nome.length < 3) return { ok: false, erro: "Informe o nome da pessoa." };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ok: false, erro: "E-mail inválido." };
  if (!PAPEIS.includes(papel)) return { ok: false, erro: "Papel inválido." };

  const existe = await prisma.usuario.findFirst({ where: { OR: [{ login }, { email }] } });
  if (existe) return { ok: false, erro: "Já existe conta com esse usuário ou e-mail." };

  const senha = senhaInicial();
  await prisma.usuario.create({
    data: { login, nome, email, papel, senhaHash: await protegerSenha(senha) },
  });

  await registrarAcao("criou uma conta", login, papel);
  revalidatePath("/admin/equipe");

  return {
    ok: true,
    mensagem: `Conta de ${nome} criada. Anote a senha: ela não aparece de novo.`,
    senha,
  };
}

export async function redefinirSenha(id: string): Promise<Resultado> {
  if (!(await podeGerirEquipe())) return { ok: false, erro: "Você não tem permissão para isso." };

  const nova = senhaInicial();
  const u = await prisma.usuario.update({
    where: { id },
    data: { senhaHash: await protegerSenha(nova) },
  });
  await registrarAcao("redefiniu a senha", u.login);
  revalidatePath("/admin/equipe");
  return { ok: true, mensagem: `Senha de ${u.nome} redefinida.`, senha: nova };
}

export async function desligarDoisFatores(id: string): Promise<Resultado> {
  if (!(await podeGerirEquipe())) return { ok: false, erro: "Você não tem permissão para isso." };
  const u = await prisma.usuario.update({ where: { id }, data: { segredo2FA: null } });
  await registrarAcao("desligou o segundo fator", u.login);
  revalidatePath("/admin/equipe");
  return { ok: true, mensagem: `${u.nome} vai cadastrar o autenticador de novo no próximo acesso.` };
}

export async function alternarAtivo(id: string): Promise<Resultado> {
  if (!(await podeGerirEquipe())) return { ok: false, erro: "Você não tem permissão para isso." };

  const eu = await usuarioAtual();
  // Desativar a si mesmo tranca a pessoa para fora na hora, sem aviso.
  if (eu?.id === id) return { ok: false, erro: "Você não pode desativar a sua própria conta." };

  const atual = await prisma.usuario.findUnique({ where: { id }, select: { ativo: true } });
  const u = await prisma.usuario.update({ where: { id }, data: { ativo: !atual?.ativo } });
  await registrarAcao(u.ativo ? "reativou a conta" : "desativou a conta", u.login);
  revalidatePath("/admin/equipe");
  return { ok: true, mensagem: `${u.nome} agora está ${u.ativo ? "ativo" : "inativo"}.` };
}

export async function trocarPapel(id: string, papel: PapelUsuario): Promise<Resultado> {
  if (!(await podeGerirEquipe())) return { ok: false, erro: "Você não tem permissão para isso." };
  if (!PAPEIS.includes(papel)) return { ok: false, erro: "Papel inválido." };

  const eu = await usuarioAtual();
  // Rebaixar a si mesmo é o jeito de a loja ficar sem ninguém que dê acesso.
  if (eu?.id === id && papel === "OPERADOR") {
    return { ok: false, erro: "Você não pode tirar o próprio acesso de administrador." };
  }

  const u = await prisma.usuario.update({ where: { id }, data: { papel } });
  await registrarAcao("mudou o papel", u.login, papel);
  revalidatePath("/admin/equipe");
  return { ok: true, mensagem: `${u.nome} agora é ${papel.toLowerCase()}.` };
}
