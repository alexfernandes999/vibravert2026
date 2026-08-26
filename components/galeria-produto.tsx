"use client";

import Image from "next/image";
import { useRef, useState, useTransition } from "react";
import { adicionarFoto, removerFoto, tornarPrincipal, moverFoto } from "@/lib/acoes-produto";

/**
 * As fotos de um produto, editáveis.
 *
 * A capa fica marcada e vem sempre primeiro: é a foto que aparece na busca da
 * loja, no Google e no link compartilhado no WhatsApp. Quem troca a capa
 * precisa ver qual é sem contar posições.
 *
 * Apagar pede confirmação porque não tem volta · o arquivo continua no
 * Storage, mas o produto perde a referência e ninguém acha de novo.
 */
export type Foto = { id: string; url: string; alt: string; principal: boolean };

export function GaleriaProduto({ produtoId, fotos }: { produtoId: string; fotos: Foto[] }) {
  const [erro, setErro] = useState("");
  const [ocupado, agir] = useTransition();
  const entrada = useRef<HTMLInputElement>(null);

  // A capa primeiro, o resto na ordem salva: a tela tem de mostrar a mesma
  // sequência que a loja mostra.
  const lista = [...fotos].sort((a, b) => Number(b.principal) - Number(a.principal));

  function subir(arquivo: File) {
    setErro("");
    const d = new FormData();
    d.set("arquivo", arquivo);
    d.set("produtoId", produtoId);
    d.set("quadrada", "1");
    agir(async () => {
      const r = await adicionarFoto(d);
      if (r?.erro) setErro(r.erro);
      if (entrada.current) entrada.current.value = "";
    });
  }

  return (
    <div>
      {lista[0] ? (
        <div className="relative aspect-square overflow-hidden rounded-caixa border border-linha bg-superficie">
          <Image src={lista[0].url} alt={lista[0].alt} fill sizes="420px" className="object-cover" priority />
          <span className="absolute left-2.5 top-2.5 rounded-md bg-marca px-2 py-1 text-[10px] font-extrabold uppercase tracking-wide text-white">
            Capa
          </span>
        </div>
      ) : (
        <div className="grid aspect-square place-items-center rounded-caixa border border-dashed border-linha-2 text-[13px] font-semibold text-tenue">
          Sem foto nenhuma
        </div>
      )}

      {lista.length > 1 && (
        <ul className="mt-2.5 grid grid-cols-4 gap-2">
          {lista.slice(1).map((f, i) => (
            <li key={f.id} className="group relative overflow-hidden rounded-lg border border-linha">
              <Image src={f.url} alt={f.alt} width={110} height={110} className="h-full w-full object-cover" />
              <div className="absolute inset-0 hidden flex-col justify-between bg-tinta/70 p-1 group-hover:flex">
                <button
                  type="button"
                  disabled={ocupado}
                  onClick={() => agir(async () => void (await tornarPrincipal(f.id)))}
                  className="rounded bg-white/95 px-1 py-0.5 text-[9.5px] font-extrabold text-marca"
                >
                  virar capa
                </button>
                <div className="flex gap-1">
                  {i > 0 && (
                    <button
                      type="button"
                      disabled={ocupado}
                      onClick={() => agir(async () => void (await moverFoto(f.id, "sobe")))}
                      className="flex-1 rounded bg-white/95 py-0.5 text-[10px] font-extrabold text-tinta"
                    >
                      ←
                    </button>
                  )}
                  {i < lista.length - 2 && (
                    <button
                      type="button"
                      disabled={ocupado}
                      onClick={() => agir(async () => void (await moverFoto(f.id, "desce")))}
                      className="flex-1 rounded bg-white/95 py-0.5 text-[10px] font-extrabold text-tinta"
                    >
                      →
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={ocupado}
                    onClick={() => {
                      if (confirm("Apagar esta foto do produto?")) {
                        agir(async () => void (await removerFoto(f.id)));
                      }
                    }}
                    className="flex-1 rounded bg-critico px-1 py-0.5 text-[10px] font-extrabold text-white"
                  >
                    ✕
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2.5">
        <label className="cursor-pointer rounded-lg border border-marca bg-superficie px-3.5 py-2 text-[12.5px] font-bold text-marca transition hover:bg-marca-suave">
          {ocupado ? "Enviando…" : "Adicionar foto"}
          <span className="num ml-1.5 font-semibold text-mudo">1200 × 1200</span>
          <input
            ref={entrada}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            className="hidden"
            disabled={ocupado}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) subir(f);
            }}
          />
        </label>

        {lista.length > 0 && (
          <button
            type="button"
            disabled={ocupado}
            onClick={() => {
              if (confirm("Apagar a foto de capa?")) {
                agir(async () => void (await removerFoto(lista[0].id)));
              }
            }}
            className="text-[12px] font-semibold text-mudo underline underline-offset-2"
          >
            apagar a capa
          </button>
        )}

        <span className="num text-[11.5px] text-mudo">
          {lista.length} {lista.length === 1 ? "foto" : "fotos"}
        </span>
      </div>

      {erro && (
        <p className="mt-2 rounded-lg border-l-[3px] border-critico bg-critico/[0.06] px-3 py-2 text-[12px] text-critico">
          {erro}
        </p>
      )}

      <p className="mt-2 text-[11.5px] leading-snug text-mudo">
        A loja ajusta toda foto para <b className="num text-tinta-2">1200 × 1200 px</b>, o padrão
        do Mercado Livre · a imagem entra inteira e o que sobra vira fundo branco, nada é
        cortado. Mande a maior que tiver, em JPG ou PNG, até 6 MB.
      </p>
    </div>
  );
}
