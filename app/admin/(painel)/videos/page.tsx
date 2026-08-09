import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import type { TipoVideo } from "@prisma/client";

export const dynamic = "force-dynamic";

/**
 * Aceita o que a pessoa tiver na mão: a URL da barra do navegador, o link de
 * compartilhar, ou o id solto. Exigir "cole apenas o ID de 11 caracteres" é
 * empurrar para o operador um trabalho que o código faz em duas linhas.
 */
function extrairId(entrada: string): string | null {
  const s = entrada.trim();
  const m =
    s.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|live\/|shorts\/)|youtu\.be\/)([\w-]{11})/) ??
    s.match(/^([\w-]{11})$/);
  return m ? m[1] : null;
}

async function salvar(dados: FormData) {
  "use server";
  const id = String(dados.get("id") ?? "");
  const youtubeId = extrairId(String(dados.get("youtube") ?? ""));
  const titulo = String(dados.get("titulo") ?? "").trim();
  const resumo = String(dados.get("resumo") ?? "").trim() || null;
  const familia = String(dados.get("familia") ?? "").trim() || null;
  const tipo = String(dados.get("tipo") ?? "PRODUTO") as TipoVideo;
  if (!titulo || (!id && !youtubeId)) return;

  if (id) await prisma.video.update({ where: { id }, data: { titulo, resumo, familia, tipo } });
  else await prisma.video.create({ data: { youtubeId: youtubeId!, titulo, resumo, familia, tipo, ativo: true } });

  revalidatePath("/admin/videos");
  revalidatePath("/", "layout");
}

async function alternar(id: string, ativo: boolean) {
  "use server";
  await prisma.video.update({ where: { id }, data: { ativo } });
  revalidatePath("/admin/videos");
  revalidatePath("/", "layout");
}

async function apagar(id: string) {
  "use server";
  await prisma.video.delete({ where: { id } });
  revalidatePath("/admin/videos");
}

export default async function Videos() {
  const [videos, familias] = await Promise.all([
    prisma.video.findMany({ orderBy: [{ tipo: "asc" }, { ordem: "asc" }] }),
    prisma.produto.groupBy({ by: ["familia"], where: { familia: { not: null }, ativo: true } }),
  ]);

  // A família guarda a tensão junto, mas o vídeo é do modelo: a bomba é a
  // mesma em 110 e em 220.
  const modelos = [...new Set(familias.map((f) => f.familia!.replace(/-(110127v|220v)$/, "")))].sort();

  return (
    <div className="p-6">
      <h1 className="text-xl font-extrabold tracking-tight">Vídeos</h1>
      <p className="mt-1 max-w-2xl text-[13px] text-mudo">
        Cole a URL do YouTube. Vídeos de produto aparecem na ficha do modelo escolhido; os de
        defeito, na página de assistência técnica.
      </p>

      <ul className="mt-5 space-y-3">
        {videos.map((v) => (
          <li key={v.id} className="rounded-caixa border border-linha bg-superficie p-4">
            <div className="flex gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`https://i.ytimg.com/vi/${v.youtubeId}/mqdefault.jpg`}
                alt=""
                className="h-[68px] w-[120px] shrink-0 rounded-lg object-cover"
              />
              <form action={salvar} className="grid flex-1 gap-2.5">
                <input type="hidden" name="id" value={v.id} />
                <div className="flex flex-wrap items-center gap-2.5">
                  <span
                    className={`rounded px-2 py-0.5 text-[10px] font-extrabold tracking-wide ${
                      v.ativo ? "bg-bom-suave text-bom" : "bg-superficie-2 text-mudo"
                    }`}
                  >
                    {v.ativo ? "NO AR" : "DESLIGADO"}
                  </span>
                  <span className="num text-[11px] text-mudo">{v.youtubeId}</span>
                  <a
                    href={`https://youtu.be/${v.youtubeId}`}
                    target="_blank"
                    rel="noopener"
                    className="text-[11.5px] font-bold text-marca underline"
                  >
                    abrir
                  </a>
                  <button
                    formAction={alternar.bind(null, v.id, !v.ativo)}
                    className="text-[11.5px] font-bold text-marca underline"
                  >
                    {v.ativo ? "Desligar" : "Ligar"}
                  </button>
                  <button
                    formAction={apagar.bind(null, v.id)}
                    className="ml-auto text-[11.5px] font-semibold text-critico underline"
                  >
                    Apagar
                  </button>
                </div>

                <input
                  name="titulo"
                  defaultValue={v.titulo}
                  className="w-full rounded-lg border border-linha-2 px-3 py-1.5 text-[13px] font-semibold"
                />
                <input
                  name="resumo"
                  defaultValue={v.resumo ?? ""}
                  placeholder="Resumo (opcional)"
                  className="w-full rounded-lg border border-linha-2 px-3 py-1.5 text-[12.5px]"
                />
                <div className="flex flex-wrap gap-2.5">
                  <select name="tipo" defaultValue={v.tipo} className="rounded-lg border border-linha-2 px-2.5 py-1.5 text-[12.5px] font-semibold">
                    <option value="PRODUTO">Vídeo de produto</option>
                    <option value="PROBLEMA">Vídeo de defeito</option>
                  </select>
                  <select name="familia" defaultValue={v.familia ?? ""} className="rounded-lg border border-linha-2 px-2.5 py-1.5 text-[12.5px] font-semibold">
                    <option value="">— sem modelo —</option>
                    {modelos.map((m) => (
                      <option key={m} value={m}>{m.replace(/-/g, " ")}</option>
                    ))}
                  </select>
                  <button className="rounded-lg bg-marca px-3.5 py-1.5 text-[12.5px] font-bold text-white">
                    Salvar
                  </button>
                </div>
              </form>
            </div>
          </li>
        ))}

        <li className="rounded-caixa border border-dashed border-linha-2 bg-superficie p-4">
          <form action={salvar} className="grid gap-2.5">
            <p className="text-[12.5px] font-extrabold text-mudo">Adicionar vídeo</p>
            <input
              name="youtube"
              required
              placeholder="https://youtube.com/watch?v=… · ou youtu.be/… · ou só o id"
              className="w-full rounded-lg border border-linha-2 px-3 py-2 text-[13px] font-semibold"
            />
            <input
              name="titulo"
              required
              placeholder="Título que aparece na loja"
              className="w-full rounded-lg border border-linha-2 px-3 py-2 text-[13px] font-semibold"
            />
            <input
              name="resumo"
              placeholder="Resumo (opcional)"
              className="w-full rounded-lg border border-linha-2 px-3 py-2 text-[12.5px]"
            />
            <div className="flex flex-wrap gap-2.5">
              <select name="tipo" className="rounded-lg border border-linha-2 px-2.5 py-1.5 text-[12.5px] font-semibold">
                <option value="PRODUTO">Vídeo de produto</option>
                <option value="PROBLEMA">Vídeo de defeito</option>
              </select>
              <select name="familia" className="rounded-lg border border-linha-2 px-2.5 py-1.5 text-[12.5px] font-semibold">
                <option value="">— sem modelo —</option>
                {modelos.map((m) => (
                  <option key={m} value={m}>{m.replace(/-/g, " ")}</option>
                ))}
              </select>
              <button className="rounded-lg border border-marca px-3.5 py-1.5 text-[12.5px] font-bold text-marca">
                Adicionar
              </button>
            </div>
          </form>
        </li>
      </ul>
    </div>
  );
}
