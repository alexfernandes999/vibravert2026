"use client";

import { useState, useTransition } from "react";
import { enviarImagem } from "@/lib/upload";

/**
 * Fotos no cadastro, antes de o produto existir.
 *
 * O arquivo sobe para o Storage na hora de escolher e o endereço fica num
 * campo escondido · quando o formulário é enviado, o produto e as fotos
 * nascem juntos. É o mesmo caminho que os banners já usavam.
 *
 * O contrário, mandar cadastrar primeiro e voltar depois para pôr foto, é o
 * jeito de o catálogo encher de produto sem imagem: quem cadastra às pressas
 * não volta.
 */
export function FotosNovoProduto() {
  const [urls, setUrls] = useState<string[]>([]);
  const [erro, setErro] = useState("");
  const [subindo, iniciar] = useTransition();

  function subir(arquivos: FileList) {
    setErro("");
    iniciar(async () => {
      for (const f of Array.from(arquivos)) {
        const d = new FormData();
        d.set("arquivo", f);
        d.set("marca", "produto");
        d.set("pasta", "produtos");
        d.set("quadrada", "1");
        const r = await enviarImagem(d);
        if (!r.ok) {
          setErro(r.erro);
          return;
        }
        setUrls((a) => [...a, r.url]);
      }
    });
  }

  return (
    <div>
      <span className="mb-1.5 block text-[12.5px] font-bold">
        Fotos{" "}
        <span className="font-medium text-mudo">
          a primeira vira a capa · <span className="num">1200 × 1200 px</span>
        </span>
      </span>

      <input type="hidden" name="fotos" value={urls.join("|")} />

      {urls.length > 0 && (
        <ul className="mb-3 grid grid-cols-5 gap-2">
          {urls.map((u, i) => (
            <li key={u} className="relative overflow-hidden rounded-lg border border-linha">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={u} alt="" className="aspect-square w-full object-cover" />
              {i === 0 && (
                <span className="absolute left-1 top-1 rounded bg-marca px-1.5 py-0.5 text-[9px] font-extrabold uppercase text-white">
                  capa
                </span>
              )}
              <button
                type="button"
                onClick={() => setUrls((a) => a.filter((x) => x !== u))}
                className="absolute bottom-1 right-1 rounded bg-critico px-1.5 py-0.5 text-[10px] font-extrabold text-white"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      <label className="inline-block cursor-pointer rounded-lg border border-marca bg-superficie px-3.5 py-2 text-[12.5px] font-bold text-marca transition hover:bg-marca-suave">
        {subindo ? "Enviando…" : urls.length ? "Adicionar mais" : "Escolher fotos"}
        <input
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,image/avif"
          className="hidden"
          disabled={subindo}
          onChange={(e) => {
            if (e.target.files?.length) subir(e.target.files);
            e.target.value = "";
          }}
        />
      </label>

      {erro && (
        <p className="mt-2 rounded-lg border-l-[3px] border-critico bg-critico/[0.06] px-3 py-2 text-[12px] text-critico">
          {erro}
        </p>
      )}

      <p className="mt-1.5 text-[11.5px] leading-snug text-mudo">
        Dá para escolher várias de uma vez. A loja ajusta todas para{" "}
        <b className="num text-tinta-2">1200 × 1200 px</b>, o padrão do Mercado Livre · a imagem
        entra inteira, o que sobra vira fundo branco e nada é cortado.
      </p>
    </div>
  );
}
