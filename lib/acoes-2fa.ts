"use server";

import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import { conferirSenhaDe, usuarioAtual } from "@/lib/admin-auth";
import { conferir, gerarSegredo, uriDeCadastro } from "@/lib/dois-fatores";

/**
 * Cadastro do autenticador, um por pessoa.
 *
 * O QR carrega o segredo em texto claro: quem fotografa a tela leva o segundo
 * fator inteiro. Por isso ele só aparece depois da senha, mesmo para quem já
 * está logado — a sessão prova que a pessoa entrou, não que ainda é ela na
 * frente do computador.
 *
 * O segredo só é gravado depois de a pessoa provar que o aplicativo está
 * gerando o código certo. Gravar antes trancaria a conta se a câmera não
 * pegasse o QR.
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

/** Guarda o segredo pendente entre ver o QR e confirmar o primeiro código. */
const pendentes = new Map<string, { segredo: string; ate: number }>();

export type Cadastro =
  | { ok: true; qr: string; segredo: string; conta: string; jaTinha: boolean }
  | { ok: false; erro: string };

export async function revelarQr(senha: string): Promise<Cadastro> {
  const eu = await usuarioAtual();
  if (!eu) return { ok: false, erro: "Sessão expirada. Entre de novo." };

  if (travado(eu.id)) {
    return { ok: false, erro: "Muitas tentativas. Espere dez minutos e tente de novo." };
  }
  if (!(await conferirSenhaDe(eu.id, senha))) {
    errou(eu.id);
    return { ok: false, erro: "Senha incorreta." };
  }
  tentativas.delete(eu.id);

  const atual = await prisma.usuario.findUnique({
    where: { id: eu.id },
    select: { segredo2FA: true },
  });

  // Quem já tem autenticador continua com o mesmo segredo: gerar outro
  // invalidaria o aplicativo que já está funcionando no celular.
  const segredo = atual?.segredo2FA ?? gerarSegredo();
  if (!atual?.segredo2FA) {
    pendentes.set(eu.id, { segredo, ate: Date.now() + 15 * 60 * 1000 });
  }

  const conta = `${eu.nome} · Vibra Vert`;
  const qr = await QRCode.toDataURL(uriDeCadastro(segredo, conta), {
    margin: 1,
    width: 480,
    errorCorrectionLevel: "M",
    color: { dark: "#14307a", light: "#ffffff" },
  });

  // Em blocos de quatro: quem digita à mão, porque a câmera do computador não
  // lê a própria tela, erra muito menos assim.
  return {
    ok: true,
    qr,
    segredo: segredo.replace(/(.{4})/g, "$1 ").trim(),
    conta,
    jaTinha: Boolean(atual?.segredo2FA),
  };
}

/**
 * Confere o primeiro código e só então grava.
 *
 * Descobrir que o relógio do celular está fora de hora na hora do login, com o
 * painel recusando e sem dizer por quê, é o jeito de perder a conta.
 */
export async function testarCodigo(codigo: string): Promise<{ ok: boolean; erro?: string }> {
  const eu = await usuarioAtual();
  if (!eu) return { ok: false, erro: "Sessão expirada. Entre de novo." };

  const limpo = codigo.replace(/\D/g, "");
  if (limpo.length !== 6) return { ok: false, erro: "O código tem 6 dígitos." };

  const pendente = pendentes.get(eu.id);
  const guardado = await prisma.usuario.findUnique({
    where: { id: eu.id },
    select: { segredo2FA: true },
  });

  const segredo =
    pendente && pendente.ate > Date.now() ? pendente.segredo : guardado?.segredo2FA;
  if (!segredo) return { ok: false, erro: "Peça o QR de novo: a tela expirou." };

  if (!conferir(limpo, segredo)) {
    return {
      ok: false,
      erro: "Esse código não bateu. Confira se o relógio do celular está no automático e tente com o código novo.",
    };
  }

  if (!guardado?.segredo2FA) {
    await prisma.usuario.update({ where: { id: eu.id }, data: { segredo2FA: segredo } });
    pendentes.delete(eu.id);
  }
  return { ok: true };
}
