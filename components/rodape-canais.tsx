import { TELEFONE, TELEFONE_LINK, WHATSAPP_BONITO, whatsappLink } from "@/lib/contato";

/**
 * Canais de atendimento e redes, no rodapé.
 *
 * Quem chega ao pé da página está decidindo se confia. Um telefone que atende,
 * um WhatsApp e um e-mail com horário declarado respondem essa pergunta melhor
 * do que qualquer selo.
 *
 * O Vibra Phone e o WhatsApp são o mesmo número, e isso é dito: repetir o
 * número em dois blocos sem explicar parece erro de montagem.
 */
const CANAIS = [
  {
    rot: "Vibra Phone",
    valor: TELEFONE,
    nota: "de segunda a sexta, das 8h às 18h",
    href: `tel:${TELEFONE_LINK}`,
    icone: (
      <path d="M4 4h4l2 5-2.5 1.5a12 12 0 006 6L15 14l5 2v4a1 1 0 01-1.1 1A17 17 0 013 5.1 1 1 0 014 4z" />
    ),
  },
  {
    rot: "WhatsApp de vendas",
    valor: WHATSAPP_BONITO,
    nota: "o mesmo número do Vibra Phone",
    href: whatsappLink("Olá! Vim pelo site da Vibra Vert."),
    icone: (
      <>
        <path d="M3.5 20.5l1.3-4.6a8.2 8.2 0 111 1.5z" />
        <path d="M8.8 8.4c.3-.6 1-.5 1.3.1l.6 1.2c.2.4 0 .8-.3 1-.4.3-.4.6-.2 1a5 5 0 002 2c.4.2.7.1 1-.2.3-.4.7-.5 1.1-.3l1.2.6c.6.3.7 1 .1 1.3a3 3 0 01-3.3.1 9 9 0 01-3.8-3.8 3 3 0 01.3-3z" />
      </>
    ),
  },
  {
    rot: "Pedidos",
    valor: "pedido@vibravert.com.br",
    nota: "dúvida sobre uma compra",
    href: "mailto:pedido@vibravert.com.br",
    icone: (
      <>
        <path d="M3.5 7.5 12 3l8.5 4.5v9L12 21l-8.5-4.5z" />
        <path d="M3.5 7.5 12 12l8.5-4.5M12 12v9" />
      </>
    ),
  },
  {
    rot: "SAC",
    valor: "sac@vibravert.com.br",
    nota: "assistência e garantia",
    href: "mailto:sac@vibravert.com.br",
    icone: (
      <>
        <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
        <path d="M3 7l9 6 9-6" />
      </>
    ),
  },
];

export function RodapeCanais() {
  return (
    <div className="border-t border-linha">
      <ul className="mx-auto grid max-w-7xl gap-3 px-5 py-7 sm:grid-cols-2 lg:grid-cols-4">
        {CANAIS.map((c) => {
          const conteudo = (
            <>
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-marca-suave text-marca transition group-hover:bg-marca group-hover:text-white">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
                  strokeLinecap="round" strokeLinejoin="round" className="h-[19px] w-[19px]">
                  {c.icone}
                </svg>
              </span>
              <span className="min-w-0">
                <span className="block text-[10px] font-extrabold uppercase tracking-[0.13em] text-mudo">
                  {c.rot}
                </span>
                <span className="num block truncate text-[14px] font-extrabold leading-tight">
                  {c.valor}
                </span>
                <span className="block text-[11.5px] leading-snug text-mudo">{c.nota}</span>
              </span>
            </>
          );
          const classe =
            "group flex items-center gap-3 rounded-caixa border border-linha bg-superficie p-3.5 transition hover:border-marca";
          return (
            <li key={c.rot}>
              {c.href ? (
                <a href={c.href} target={c.href.startsWith("http") ? "_blank" : undefined} rel="noopener" className={classe}>
                  {conteudo}
                </a>
              ) : (
                <div className={classe}>{conteudo}</div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * Redes sociais.
 *
 * A Vibra Vert ainda não tem perfil próprio. Os ícones ficam montados e
 * desativados, com o espaço reservado: quando as contas existirem, é só pôr o
 * endereço em `INSTAGRAM` e `YOUTUBE`.
 *
 * Deixar o ícone linkando para lugar nenhum seria pior que não ter ícone ·
 * clique que não leva a nada é a definição de site abandonado.
 */
const INSTAGRAM = process.env.NEXT_PUBLIC_INSTAGRAM || "";
const YOUTUBE = process.env.NEXT_PUBLIC_YOUTUBE || "";

const REDES = [
  {
    nome: "Instagram",
    href: INSTAGRAM,
    icone: (
      <>
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" stroke="none" />
      </>
    ),
  },
  {
    nome: "YouTube",
    href: YOUTUBE,
    icone: (
      <>
        <rect x="2" y="5" width="20" height="14" rx="4.5" />
        <path d="M10 9l5.5 3-5.5 3z" fill="currentColor" stroke="none" />
      </>
    ),
  },
];

export function RodapeRedes() {
  return (
    <ul className="flex items-center gap-2">
      {REDES.map((r) =>
        r.href ? (
          <li key={r.nome}>
            <a
              href={r.href}
              target="_blank"
              rel="noopener"
              aria-label={r.nome}
              className="grid h-9 w-9 place-items-center rounded-lg border border-linha bg-superficie text-marca transition hover:border-marca hover:bg-marca hover:text-white"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-[18px] w-[18px]">
                {r.icone}
              </svg>
            </a>
          </li>
        ) : (
          <li key={r.nome}>
            <span
              title={`${r.nome} da Vibra Vert · em breve`}
              aria-label={`${r.nome} em breve`}
              className="grid h-9 w-9 cursor-default place-items-center rounded-lg border border-dashed border-linha-2 text-tenue"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-[18px] w-[18px]">
                {r.icone}
              </svg>
            </span>
          </li>
        ),
      )}
      {(!INSTAGRAM || !YOUTUBE) && (
        <li className="text-[11.5px] font-semibold text-tenue">em breve</li>
      )}
    </ul>
  );
}
