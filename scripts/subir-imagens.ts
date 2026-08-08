/**
 * Publica as imagens de produto no Supabase Storage e reaponta o banco.
 *
 * Enquanto as fotos vivem em public/, cada deploy carrega 86 MB e o repositório
 * incha. No Storage elas saem pelo CDN, o build fica leve e trocar uma foto
 * deixa de exigir deploy.
 */
import { createClient } from "@supabase/supabase-js";
import { PrismaClient } from "@prisma/client";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const BUCKET = "produtos";
const ORIGEM = join(process.cwd(), "data", "imagens");

// Script avulso, fora do runtime do Next: carrega o .env por conta própria.
for (const linha of readFileSync(join(process.cwd(), ".env"), "utf8").split("\n")) {
  const m = linha.match(/^\s*([A-Z_]+)\s*=\s*"?(.*?)"?\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);
const prisma = new PrismaClient();

async function main() {
  // Público de propósito: são fotos de catálogo, pedidas direto pelo navegador
  // de qualquer visitante. Privado obrigaria a assinar cada URL sem ganho nenhum.
  const { error: erroBucket } = await supabase.storage.createBucket(BUCKET, {
    public: true,
    fileSizeLimit: "10MB",
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/avif"],
  });
  if (erroBucket && !/exist/i.test(erroBucket.message)) throw erroBucket;
  console.log(erroBucket ? `→ bucket "${BUCKET}" já existia` : `→ bucket "${BUCKET}" criado`);

  const arquivos = readdirSync(ORIGEM).filter((f) => f.endsWith(".jpg"));
  console.log(`→ ${arquivos.length} imagens\n`);

  let enviadas = 0, existentes = 0;
  const falhas: string[] = [];

  // Em lotes: 306 uploads simultâneos derrubam a conexão e o Storage
  // começa a devolver erro de rate limit.
  const LOTE = 8;
  for (let i = 0; i < arquivos.length; i += LOTE) {
    await Promise.all(
      arquivos.slice(i, i + LOTE).map(async (nome) => {
        const { error } = await supabase.storage
          .from(BUCKET)
          .upload(nome, readFileSync(join(ORIGEM, nome)), {
            contentType: "image/jpeg",
            cacheControl: "31536000", // imagem de produto não muda; se mudar, muda o nome
            upsert: false,
          });
        if (!error) enviadas++;
        else if (/exists/i.test(error.message)) existentes++;
        else falhas.push(`${nome}: ${error.message}`);
      }),
    );
    process.stdout.write(`\r   ${Math.min(i + LOTE, arquivos.length)}/${arquivos.length}`);
  }

  const base = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}/`;
  console.log(`\n\n   enviadas ${enviadas} · já existiam ${existentes} · falhas ${falhas.length}`);
  if (falhas.length) falhas.slice(0, 5).forEach((f) => console.log(`     ✗ ${f}`));

  // reaponta os registros que ainda usam o caminho local
  const locais = await prisma.imagem.findMany({ where: { url: { startsWith: "/produtos/" } } });
  for (const img of locais) {
    await prisma.imagem.update({
      where: { id: img.id },
      data: { url: base + img.url.replace("/produtos/", "") },
    });
  }
  console.log(`   ${locais.length} registros reapontados para o CDN`);

  const amostra = await prisma.imagem.findFirst({ select: { url: true } });
  console.log(`\n   exemplo: ${amostra?.url}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
