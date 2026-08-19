/**
 * Reproduções das telas do painel, dentro do manual.
 *
 * Não são capturas. Captura envelhece calada: o painel muda, o print fica, e
 * o manual passa a ensinar uma tela que não existe mais · o pior tipo de erro,
 * porque parece certo. Estas são desenhadas com os mesmos tokens do painel,
 * então acompanham o tema claro e o escuro e envelhecem junto.
 *
 * E deixam marcar o que uma captura não marca: o número fica ancorado no
 * elemento, não numa coordenada que sai do lugar quando a tela é outra.
 */

/** O número que aparece sobre a tela e de novo na explicação. */
export function Marca({ n, flutua }: { n: number; flutua?: boolean }) {
  return (
    <span
      className={`grid h-[19px] w-[19px] shrink-0 place-items-center rounded-full bg-marca text-[11px] font-extrabold text-white ${
        flutua ? "absolute z-10 shadow-md shadow-tinta/25" : "inline-grid align-middle"
      }`}
    >
      {n}
    </span>
  );
}

export function Tela({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <figure className="mt-3.5 overflow-hidden rounded-caixa border border-linha-2 bg-fundo">
      <div className="flex items-center gap-1.5 border-b border-linha bg-superficie-2 px-3 py-2">
        <span className="h-2 w-2 rounded-full bg-linha-2" />
        <span className="h-2 w-2 rounded-full bg-linha-2" />
        <span className="h-2 w-2 rounded-full bg-linha-2" />
        <figcaption className="ml-1.5 truncate text-[11px] font-semibold text-mudo">{titulo}</figcaption>
      </div>
      <div className="relative p-4">{children}</div>
    </figure>
  );
}

/** A lista numerada que acompanha cada tela. */
export function Legenda({ itens }: { itens: [number, string, string][] }) {
  return (
    <ul className="mt-3 grid gap-2">
      {itens.map(([n, o, texto]) => (
        <li key={n} className="flex gap-2.5">
          <Marca n={n} />
          <span className="text-[13.5px] leading-relaxed text-tinta-2">
            <b className="text-tinta">{o}</b> · {texto}
          </span>
        </li>
      ))}
    </ul>
  );
}

/* ── peças soltas, para montar as telas ─────────────────────────── */

export function Botao({ children, cor = "marca" }: { children: React.ReactNode; cor?: "marca" | "linha" }) {
  return (
    <span
      className={`inline-block rounded-lg px-2.5 py-1.5 text-[11px] font-extrabold ${
        cor === "marca" ? "bg-marca text-white" : "border border-linha-2 bg-superficie text-tinta-2"
      }`}
    >
      {children}
    </span>
  );
}

export function Campo({ r, v }: { r: string; v?: string }) {
  return (
    <span className="block">
      <span className="mb-1 block text-[10px] font-bold text-tinta-2">{r}</span>
      <span className="block rounded-md border border-linha-2 bg-superficie px-2 py-1.5 text-[11px] text-mudo">
        {v ?? " "}
      </span>
    </span>
  );
}

/** Um quadrado de foto, com ou sem selo de capa. */
export function Foto({ capa, alto }: { capa?: boolean; alto?: boolean }) {
  return (
    <span
      className={`relative block overflow-hidden rounded-md border border-linha bg-gradient-to-br from-marca-suave to-superficie-2 ${
        alto ? "aspect-square" : "aspect-square"
      }`}
    >
      {capa && (
        <span className="absolute left-1 top-1 rounded bg-marca px-1 py-0.5 text-[7.5px] font-extrabold uppercase tracking-wide text-white">
          capa
        </span>
      )}
    </span>
  );
}
