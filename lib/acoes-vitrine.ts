"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { autenticado, registrarAcao } from "@/lib/admin-auth";

/**
 * Montar as prateleiras da home.
 *
 * Antes isso era um botão pequeno numa coluna da tabela de produtos, e
 * ninguém achava. Aqui a pessoa vê as vagas do jeito que aparecem na loja e
 * clica para preencher · o que se monta é o que se vê.
 */
export type Resultado = { ok: boolean; erro?: string };

async function mexer(id: string, campo: "destaque" | "naVitrine", valor: boolean): Promise<Resultado> {
  if (!(await autenticado())) return { ok: false, erro: "Sessão expirada." };

  const p = await prisma.produto.update({
    where: { id },
    data: { [campo]: valor },
    select: { nome: true },
  });

  await registrarAcao(
    valor ? "colocou na prateleira" : "tirou da prateleira",
    p.nome.slice(0, 60),
    campo === "destaque" ? "mais vendidas" : "peças",
  );

  revalidatePath("/admin/vitrine");
  revalidatePath("/admin/produtos");
  // A home é estática por cinco minutos; sem isto a troca só apareceria depois.
  revalidatePath("/", "layout");
  return { ok: true };
}

// Precisam ser funções async declaradas: num arquivo "use server", uma const
// com arrow não passa como Server Action.
export async function porNaVitrine(id: string, campo: "destaque" | "naVitrine") {
  return mexer(id, campo, true);
}

export async function tirarDaVitrine(id: string, campo: "destaque" | "naVitrine") {
  return mexer(id, campo, false);
}
