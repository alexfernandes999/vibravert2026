"use client";

import { useState, useTransition } from "react";
import { enviarImagem } from "@/lib/upload";

/**
 * Escolher a arte do banner.
 *
 * O envio acontece na hora de escolher o arquivo, não ao salvar o formulário:
 * assim a pessoa vê a imagem no lugar antes de confirmar, e descobre um
 * arquivo grande demais ou no formato errado enquanto ainda está olhando.
 *
 * O endereço da imagem viaja num campo escondido, junto com o resto do
 * formulário. Guardar a URL em vez do arquivo é o que permite trocar a arte
 * sem mexer no cadastro.
 */
export function CampoImagem({
  nome,
  rotulo,
  valor,
  medida,
  marca,
}: {
  nome: string;
  rotulo: string;
  valor?: string | null;
  medida: string;
  marca: string;
}) {
  const [url, setUrl] = useState(valor ?? "");
  const [erro, setErro] = useState("");
  const [subindo, iniciar] = useTransition();

  return (
    <div>
      <span className="mb-1.5 flex flex-wrap items-baseline gap-x-2 text-[12px] font-bold">
        {rotulo}
        <span className="font-medium text-mudo">{medida}</span>
      </span>

      <input type="hidden" name={nome} value={url} />

      <div className="flex flex-wrap items-center gap-3">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt=""
            className="h-16 w-28 rounded-md border border-linha bg-superficie-2 object-cover"
          />
        ) : (
          <span className="grid h-16 w-28 place-items-center rounded-md border border-dashed border-linha-2 text-[11px] font-semibold text-tenue">
            sem imagem
          </span>
        )}

        <label className="cursor-pointer rounded-lg border border-marca bg-superficie px-3.5 py-2 text-[12.5px] font-bold text-marca transition hover:bg-marca-suave">
          {subindo ? "Enviando…" : url ? "Trocar" : "Escolher imagem"}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            className="hidden"
            disabled={subindo}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              setErro("");
              const d = new FormData();
              d.set("arquivo", f);
              d.set("marca", marca);
              iniciar(async () => {
                const r = await enviarImagem(d);
                if (r.ok) setUrl(r.url);
                else setErro(r.erro);
              });
            }}
          />
        </label>

        {url && (
          <button
            type="button"
            onClick={() => setUrl("")}
            className="text-[12px] font-semibold text-mudo underline underline-offset-2"
          >
            Remover
          </button>
        )}
      </div>

      {erro && <p className="mt-1.5 text-[12px] font-semibold text-critico">{erro}</p>}
      {url && !erro && (
        <p className="mt-1.5 text-[11.5px] text-mudo">
          Imagem no lugar · clique em <strong className="font-bold">Salvar</strong> para publicar.
        </p>
      )}
    </div>
  );
}
