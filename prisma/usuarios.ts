/**
 * Contas do painel.
 *
 * Cria, lista e redefine senha. Roda pela linha de comando de propósito: uma
 * tela de "criar administrador" aberta na internet é a porta que ninguém
 * lembra de fechar depois.
 *
 *   npx tsx --env-file=.env.local prisma/usuarios.ts listar
 *   npx tsx --env-file=.env.local prisma/usuarios.ts criar <login> "<Nome>" <email> [papel]
 *   npx tsx --env-file=.env.local prisma/usuarios.ts senha <login>
 *   npx tsx --env-file=.env.local prisma/usuarios.ts desligar2fa <login>
 *   npx tsx --env-file=.env.local prisma/usuarios.ts ativar <login> | desativar <login>
 */
import { PrismaClient, type PapelUsuario } from "@prisma/client";
import { protegerSenha, senhaInicial } from "../lib/senha";

const prisma = new PrismaClient();

const uso = () => {
  console.log(`
  listar
  criar <login> "<Nome>" <email> [OPERADOR|MASTER|DESENVOLVEDOR]
  papel <login> <OPERADOR|MASTER|DESENVOLVEDOR>
  senha <login>
  desligar2fa <login>
  ativar <login> · desativar <login>
`);
};

async function listar() {
  const us = await prisma.usuario.findMany({ orderBy: { criadoEm: "asc" } });
  if (!us.length) return console.log("\n  nenhum usuário cadastrado\n");
  console.log();
  for (const u of us) {
    const quando = u.ultimoAcesso
      ? u.ultimoAcesso.toISOString().slice(0, 16).replace("T", " ")
      : "nunca entrou";
    console.log(
      `  ${u.login.padEnd(14)} ${u.papel.padEnd(14)} ${u.ativo ? "ativo  " : "inativo"} ` +
        `2FA:${u.segredo2FA ? "sim" : "não"}  ${quando}  ${u.nome}`,
    );
  }
  console.log();
}

async function criar(login: string, nome: string, email: string, papel: string) {
  const p = (papel?.toUpperCase() ?? "OPERADOR") as PapelUsuario;
  if (!["OPERADOR", "MASTER", "DESENVOLVEDOR"].includes(p)) {
    return console.log("  papel deve ser OPERADOR, MASTER ou DESENVOLVEDOR");
  }

  const senha = senhaInicial();
  const u = await prisma.usuario.create({
    data: {
      login: login.trim().toLowerCase(),
      nome,
      email: email.trim().toLowerCase(),
      papel: p,
      senhaHash: await protegerSenha(senha),
    },
  });

  console.log(`\n  criado: ${u.nome} · ${u.papel}`);
  console.log(`  login:  ${u.login}`);
  console.log(`  senha:  ${senha}`);
  console.log(`\n  A senha aparece uma vez só. O segundo fator é cadastrado no primeiro acesso,`);
  console.log(`  no próprio painel, e vira obrigatório a partir daí.\n`);
}

async function papel(login: string, novo: string) {
  const p = novo.toUpperCase() as PapelUsuario;
  if (!["OPERADOR", "MASTER", "DESENVOLVEDOR"].includes(p)) {
    return console.log("  papel deve ser OPERADOR, MASTER ou DESENVOLVEDOR");
  }
  const u = await prisma.usuario.update({ where: { login: login.toLowerCase() }, data: { papel: p } });
  console.log(`\n  ${u.login} agora é ${u.papel}\n`);
}

async function senha(login: string) {
  const nova = senhaInicial();
  const u = await prisma.usuario.update({
    where: { login: login.toLowerCase() },
    data: { senhaHash: await protegerSenha(nova) },
  });
  console.log(`\n  senha de ${u.login} redefinida: ${nova}\n`);
}

async function desligar2fa(login: string) {
  const u = await prisma.usuario.update({
    where: { login: login.toLowerCase() },
    data: { segredo2FA: null },
  });
  console.log(`\n  ${u.login} vai cadastrar o autenticador de novo no próximo acesso\n`);
}

async function ligar(login: string, ativo: boolean) {
  const u = await prisma.usuario.update({ where: { login: login.toLowerCase() }, data: { ativo } });
  console.log(`\n  ${u.login} agora está ${ativo ? "ativo" : "inativo"}\n`);
}

const [comando, ...args] = process.argv.slice(2);

const acoes: Record<string, () => Promise<void>> = {
  listar,
  criar: () => criar(args[0], args[1], args[2], args[3]),
  papel: () => papel(args[0], args[1]),
  senha: () => senha(args[0]),
  desligar2fa: () => desligar2fa(args[0]),
  ativar: () => ligar(args[0], true),
  desativar: () => ligar(args[0], false),
};

(acoes[comando] ?? (async () => uso()))()
  .catch((e) => console.error("\n  erro:", e.message, "\n"))
  .finally(() => prisma.$disconnect());
