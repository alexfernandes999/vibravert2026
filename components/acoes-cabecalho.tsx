import Link from "next/link";
import { brl } from "@/lib/formato";
import { EMPRESA } from "@/lib/paginas";

/**
 * Ações do cabeçalho: telefone, pedidos e carrinho.
 *
 * Ícone com rótulo, não só rótulo. Numa loja técnica o visitante varre o topo
 * da página com o olho procurando o desenho — o telefone e o carrinho são
 * reconhecidos pela forma antes de qualquer palavra ser lida.
 *
 * O telefone vem primeiro e é o único em destaque: aqui o cliente está sem
 * água e ligar resolve mais rápido que navegar.
 */
function Bloco({
  href,
  externo,
  icone,
  rotulo,
  valor,
  destaque = false,
}: {
  href: string;
  externo?: boolean;
  icone: React.ReactNode;
  rotulo: string;
  valor: string;
  destaque?: boolean;
}) {
  const conteudo = (
    <>
      <span
        className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${
          destaque ? "bg-marca text-white" : "bg-superficie-2 text-marca"
        }`}
      >
        {icone}
      </span>
      <span className="hidden leading-tight lg:block">
        <span className="block text-[11px] font-semibold text-mudo">{rotulo}</span>
        <span className={`num block text-[13.5px] font-extrabold ${destaque ? "text-marca" : "text-tinta"}`}>
          {valor}
        </span>
      </span>
    </>
  );

  const classe = "flex items-center gap-2.5 rounded-lg px-1.5 py-1 transition hover:bg-superficie-2";

  return externo ? (
    <a href={href} className={classe}>{conteudo}</a>
  ) : (
    <Link href={href} className={classe}>{conteudo}</Link>
  );
}

export function AcoesCabecalho({ qtd, total }: { qtd: number; total: number }) {
  return (
    <nav className="ml-auto flex items-center gap-1.5 sm:gap-3">
      <Bloco
        href={`tel:+55${EMPRESA.telefone.replace(/\D/g, "")}`}
        externo
        destaque
        rotulo="Vibra Phone"
        valor={EMPRESA.telefone}
        icone={
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className="h-5 w-5">
            <path d="M4 4h4l2 5-2.5 1.5a12 12 0 006 6L15 14l5 2v4a1 1 0 01-1.1 1A17 17 0 013 5.1 1 1 0 014 4z" />
          </svg>
        }
      />

      <Bloco
        href="/pedidos"
        rotulo="Seu pedido"
        valor="Acompanhar"
        icone={
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className="h-5 w-5">
            <circle cx="12" cy="8" r="3.4" />
            <path d="M4.5 20a7.5 7.5 0 0115 0" />
          </svg>
        }
      />

      <Link
        href="/carrinho"
        className="flex items-center gap-2.5 rounded-lg px-1.5 py-1 transition hover:bg-superficie-2"
      >
        <span className="relative grid h-10 w-10 shrink-0 place-items-center rounded-full bg-superficie-2 text-marca">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className="h-5 w-5">
            <path d="M2.5 3h2.2l2.3 11.2a1.6 1.6 0 001.6 1.3h8.6a1.6 1.6 0 001.6-1.2l1.6-6.3H6" />
            <circle cx="9.5" cy="19.5" r="1.5" />
            <circle cx="17" cy="19.5" r="1.5" />
          </svg>
          {qtd > 0 && (
            <span className="num absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-ouro px-1 text-[10.5px] font-extrabold text-ouro-txt">
              {qtd}
            </span>
          )}
        </span>
        <span className="hidden leading-tight lg:block">
          <span className="block text-[11px] font-semibold text-mudo">Meu carrinho</span>
          <span className="num block text-[13.5px] font-extrabold">{brl(total)}</span>
        </span>
      </Link>
    </nav>
  );
}
