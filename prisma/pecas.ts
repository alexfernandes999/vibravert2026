/**
 * Importa as peças de reposição.
 *
 * Vieram do catálogo da A Casa São Paulo, que é a loja do mesmo grupo onde as
 * peças já são vendidas. São 37 SKUs com preço, foto e estoque.
 *
 * Entram com `tipo: PECA`, e isso não é detalhe: a promessa da vitrine é
 * "frete grátis em todas as bombas". Peça paga frete, senão uma arruela de
 * setenta e sete centavos sairia com trinta reais de entrega por conta da loja.
 *
 * As fotos são re-hospedadas no nosso Storage. Apontar para o CDN da outra
 * loja deixaria a vitrine dependendo de um site que a gente não controla.
 *
 *   npx tsx --env-file=.env.local prisma/pecas.ts            confere
 *   npx tsx --env-file=.env.local prisma/pecas.ts --aplicar  grava
 */
import { PrismaClient } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const prisma = new PrismaClient();

type Peca = {
  sku: string;
  nome: string;
  marca: string;
  descricao: string;
  categoria: string;
  preco: number;
  ean: string | null;
  imagens: { url: string; alt: string }[];
};

const slugificar = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80).replace(/-+$/g, "");

/** "Caneca ou Motor que serve Bomba Submersa Vibratoria Modelo 900 220v" é o
 *  nome do marketplace. Na loja da fábrica, o produto é a caneca. */
function limparNome(n: string) {
  return n
    .replace(/\s+que serve\s+/i, " para ")
    .replace(/Vibratoria/g, "Vibratória")
    .replace(/\bNivel\b/g, "Nível")
    .replace(/\s{2,}/g, " ")
    .trim();
}

const BUCKET = "produtos";

async function subir(url: string, nome: string) {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
  const r = await fetch(url);
  if (!r.ok) throw new Error(`imagem ${r.status}`);
  const bytes = await r.arrayBuffer();
  const { error } = await sb.storage.from(BUCKET).upload(nome, bytes, {
    contentType: r.headers.get("content-type") ?? "image/jpeg",
    cacheControl: "31536000",
    upsert: true,
  });
  if (error) throw new Error(error.message);
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${nome}`;
}

async function main() {
  const aplicar = process.argv.includes("--aplicar");
  const pecas: Peca[] = JSON.parse(readFileSync("data/pecas.json", "utf8"));

  console.log(`  ${pecas.length} peças no arquivo`);
  if (!aplicar) {
    pecas.slice(0, 5).forEach((p) =>
      console.log(`     ${p.sku.padEnd(9)} R$ ${p.preco.toFixed(2).padStart(7)}  ${limparNome(p.nome).slice(0, 52)}`),
    );
    return console.log("\n  simulação · rode com --aplicar\n");
  }

  let novas = 0, atualizadas = 0, semFoto = 0;

  for (const p of pecas) {
    const nome = limparNome(p.nome);
    const slug = slugificar(`${nome}-${p.sku}`);

    // A foto é re-hospedada uma vez só: se o produto já existe com imagem
    // nossa, não baixa de novo a cada execução.
    const jaExiste = await prisma.produto.findUnique({
      where: { sku: p.sku },
      select: { id: true, imagens: { select: { url: true } } },
    });

    let urls: { url: string; alt: string }[] = jaExiste?.imagens.length
      ? jaExiste.imagens.map((i) => ({ url: i.url, alt: nome }))
      : [];

    if (!urls.length) {
      // Com a chave de serviço à mão, as fotos são re-hospedadas. Sem ela,
      // apontam para o CDN do grupo: melhor a peça aparecer com a foto de lá
      // do que aparecer sem foto nenhuma.
      const podeSubir = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

      for (const [i, img] of p.imagens.slice(0, 4).entries()) {
        const alt = img.alt || nome;
        if (!podeSubir) {
          urls.push({ url: img.url, alt });
          continue;
        }
        try {
          const arquivo = `peca-${slugificar(p.sku)}-${i + 1}.jpg`;
          urls.push({ url: await subir(img.url, arquivo), alt });
        } catch {
          urls.push({ url: img.url, alt });
        }
      }
      if (!urls.length) semFoto++;
    }

    const dados = {
      nome,
      marca: p.marca === "Vibra Vert" ? "Vibra Vert" : p.marca,
      descricao: p.descricao || nome,
      metaTitulo: `${nome} | Peça original Vibra Vert`,
      metaDescricao: `${nome}. Peça de reposição original, direto da fábrica, com envio para todo o Brasil.`,
      preco: p.preco,
      precoDe: null,
      ativo: p.preco > 0,
      tipo: "PECA" as const,
      ean: p.ean,
      modelo: p.categoria,
      familia: null,
      principalDaFamilia: false,
      // Peça pequena vai em envelope, não em caixa de bomba.
      pesoGramas: 300,
      alturaCm: 6,
      larguraCm: 14,
      comprimentoCm: 18,
      medidasEstimadas: true,
    };

    if (jaExiste) {
      await prisma.produto.update({ where: { id: jaExiste.id }, data: dados });
      atualizadas++;
    } else {
      await prisma.produto.create({
        data: {
          ...dados,
          slug,
          sku: p.sku,
          imagens: { create: urls.map((u, i) => ({ url: u.url, alt: u.alt, ordem: i, principal: i === 0 })) },
          estoque: { create: { quantidade: 200, minimo: 20 } },
        },
      });
      novas++;
    }
  }

  console.log(`\n  ${novas} criadas · ${atualizadas} atualizadas · ${semFoto} sem foto`);
  const total = await prisma.produto.count({ where: { ativo: true } });
  const bombas = await prisma.produto.count({ where: { ativo: true, tipo: "BOMBA" } });
  console.log(`  catálogo: ${total} ativos · ${bombas} bombas · ${total - bombas} peças`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
