"use server";

import { prisma } from "@/lib/prisma";
import { consultarCnpj, cnpjValido, type Empresa } from "@/lib/cnpj";
import { APROVACAO_AUTOMATICA } from "@/lib/revenda";

export type Busca = { ok: true; empresa: Empresa; jaCadastrado: boolean } | { ok: false; erro: string };

export async function buscarEmpresa(cnpj: string): Promise<Busca> {
  const c = cnpj.replace(/\D/g, "");
  if (!cnpjValido(c)) return { ok: false, erro: "CNPJ inválido. Confira os números." };

  const empresa = await consultarCnpj(c);
  if (!empresa) {
    return { ok: false, erro: "Não consegui consultar esse CNPJ agora. Tente de novo em instantes." };
  }
  // Empresa baixada ou suspensa não vira revenda, e é melhor dizer isso aqui
  // do que depois de a pessoa preencher tudo.
  if (empresa.situacao && !/ativa/i.test(empresa.situacao)) {
    return { ok: false, erro: `A Receita mostra este CNPJ como "${empresa.situacao}". Fale com a gente pelo WhatsApp.` };
  }

  const jaCadastrado = Boolean(await prisma.revendedor.findUnique({ where: { cnpj: c }, select: { id: true } }));
  return { ok: true, empresa, jaCadastrado };
}

export type Envio = { ok: true; automatico: boolean } | { ok: false; erro: string };

export async function cadastrarRevenda(d: FormData): Promise<Envio> {
  const cnpj = String(d.get("cnpj") ?? "").replace(/\D/g, "");
  if (!cnpjValido(cnpj)) return { ok: false, erro: "CNPJ inválido." };

  const responsavel = String(d.get("responsavel") ?? "").trim();
  const email = String(d.get("email") ?? "").trim().toLowerCase();
  const whatsapp = String(d.get("whatsapp") ?? "").replace(/\D/g, "");

  if (responsavel.length < 3) return { ok: false, erro: "Informe o nome do responsável." };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ok: false, erro: "E-mail inválido." };
  if (whatsapp.length < 10) return { ok: false, erro: "WhatsApp com DDD, por favor." };

  const campos = {
    razaoSocial: String(d.get("razaoSocial") ?? "").trim(),
    nomeFantasia: String(d.get("nomeFantasia") ?? "").trim() || null,
    inscricaoEstadual: String(d.get("inscricaoEstadual") ?? "").trim() || null,
    cnae: String(d.get("cnae") ?? "").trim() || null,
    situacao: String(d.get("situacao") ?? "").trim() || null,
    logradouro: String(d.get("logradouro") ?? "").trim() || null,
    numero: String(d.get("numero") ?? "").trim() || null,
    bairro: String(d.get("bairro") ?? "").trim() || null,
    cidade: String(d.get("cidade") ?? "").trim() || null,
    uf: String(d.get("uf") ?? "").trim().toUpperCase() || null,
    cep: String(d.get("cep") ?? "").replace(/\D/g, "") || null,
    responsavel,
    email,
    whatsapp,
    status: APROVACAO_AUTOMATICA ? ("APROVADO" as const) : ("PENDENTE" as const),
  };

  await prisma.revendedor.upsert({
    where: { cnpj },
    update: campos,
    create: { cnpj, ...campos },
  });

  return { ok: true, automatico: APROVACAO_AUTOMATICA };
}
