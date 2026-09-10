"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { registrarAcao } from "@/lib/admin-auth";

/**
 * Salvar as chaves de marketing.
 *
 * O token da API de Conversões é o único segredo aqui, e nunca volta para a
 * tela · o formulário mostra só que existe. Campo em branco significa "não
 * mexi", e não "apague" · quem abre a tela para trocar o pixel não deveria
 * apagar o token sem querer.
 */
export async function salvarMarketing(dados: FormData) {
  const texto = (c: string) => String(dados.get(c) ?? "").trim();

  const pixel = texto("pixelMeta").replace(/\D/g, "");
  const gtm = texto("gtmId").toUpperCase();
  const ads = texto("googleAds").toUpperCase();
  const rotulo = texto("rotuloCompra");
  const token = texto("tokenCapi");
  const teste = texto("testeCapi");

  if (gtm && !/^GTM-[A-Z0-9]+$/.test(gtm)) {
    return { erro: "O id do GTM tem o formato GTM-XXXXXXX." };
  }
  if (pixel && pixel.length < 10) {
    return { erro: "O id do pixel tem 15 ou 16 dígitos." };
  }
  if (ads && !/^AW-\d{9,}$/.test(ads)) {
    return { erro: "O id do Google Ads tem o formato AW-123456789." };
  }
  if (rotulo && !ads) {
    return { erro: "O rótulo da conversão só funciona junto com o id do Google Ads." };
  }

  await prisma.marketing.upsert({
    where: { id: "unico" },
    create: {
      id: "unico",
      pixelMeta: pixel || null,
      gtmId: gtm || null,
      googleAds: ads || null,
      rotuloCompra: rotulo || null,
      tokenCapi: token || null,
      testeCapi: teste || null,
      ativo: dados.get("ativo") === "on",
    },
    update: {
      pixelMeta: pixel || null,
      gtmId: gtm || null,
      googleAds: ads || null,
      rotuloCompra: rotulo || null,
      // Em branco mantém o que estava · só troca quando alguém digita outro.
      ...(token ? { tokenCapi: token } : {}),
      testeCapi: teste || null,
      ativo: dados.get("ativo") === "on",
    },
  });

  await registrarAcao("alterou as chaves de marketing");
  revalidatePath("/admin/marketing");
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Apaga o token, para quando ele vazar ou for trocado no Meta. */
export async function apagarToken() {
  await prisma.marketing.update({ where: { id: "unico" }, data: { tokenCapi: null } });
  await registrarAcao("apagou o token da API de Conversões");
  revalidatePath("/admin/marketing");
}
