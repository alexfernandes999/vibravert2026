"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  Boxes,
  Handshake,
  Image as Imagem,
  LayoutDashboard,
  LayoutTemplate,
  Mail,
  Megaphone,
  MessagesSquare,
  Package,
  Plug,
  RefreshCcw,
  Rss,
  ShieldCheck,
  ShoppingBag,
  Users,
  Video,
  type LucideIcon,
} from "lucide-react";

/**
 * O menu do painel.
 *
 * Mostra onde a pessoa está. Sem a página atual marcada, quem abre três abas
 * do painel não sabe qual é qual sem ler o título de cada uma · e é o detalhe
 * que mais separa uma ferramenta de trabalho de um protótipo.
 *
 * Os ícones chegam por nome e não como componente: o menu é montado no
 * servidor, e componente não atravessa para o navegador.
 */
const ICONES: Record<string, LucideIcon> = {
  painel: LayoutDashboard,
  pedidos: ShoppingBag,
  produtos: Package,
  estoque: Boxes,
  recuperar: RefreshCcw,
  conversas: MessagesSquare,
  revenda: Handshake,
  vitrine: LayoutTemplate,
  banners: Imagem,
  videos: Video,
  marketing: Megaphone,
  canais: Rss,
  emails: Mail,
  seguranca: ShieldCheck,
  equipe: Users,
  integracoes: Plug,
  manual: BookOpen,
};

export type ItemMenu = { href: string; r: string; grupo: string; icone: string; badge?: number };

export function NavPainel({ itens }: { itens: ItemMenu[] }) {
  const caminho = usePathname();
  const ativo = (href: string) =>
    href === "/admin" ? caminho === "/admin" : caminho === href || caminho.startsWith(`${href}/`);

  return (
    <nav aria-label="Painel" className="flex flex-col gap-0.5">
      {itens.map((m, i) => {
        const Icone = ICONES[m.icone] ?? LayoutDashboard;
        const on = ativo(m.href);
        const abreGrupo = m.grupo && m.grupo !== itens[i - 1]?.grupo;
        return (
          <div key={m.href}>
            {abreGrupo && (
              <p className="px-3 pb-1.5 pt-5 text-[11px] font-semibold uppercase tracking-[0.1em] text-tenue">
                {m.grupo}
              </p>
            )}
            <Link
              href={m.href}
              aria-current={on ? "page" : undefined}
              className={`group flex items-center gap-2.5 rounded-lg px-3 py-[7px] text-[13.5px] transition-colors ${
                on ? "bg-marca-suave font-semibold text-marca" : "font-medium text-tinta-2 hover:bg-fundo hover:text-tinta"
              }`}
            >
              <Icone
                aria-hidden
                strokeWidth={1.8}
                className={`h-[17px] w-[17px] shrink-0 ${on ? "text-marca" : "text-mudo group-hover:text-tinta-2"}`}
              />
              <span className="truncate">{m.r}</span>
              {!!m.badge && (
                <span className="num ml-auto rounded-full bg-critico px-1.5 py-px text-[10.5px] font-semibold text-white">
                  {m.badge}
                </span>
              )}
            </Link>
          </div>
        );
      })}
    </nav>
  );
}
