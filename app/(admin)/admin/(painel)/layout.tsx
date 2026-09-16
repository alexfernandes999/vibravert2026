import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { LogOut, PlayCircle } from "lucide-react";
import { usuarioAtual, sair } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { TourPainel } from "@/components/tour-painel";
import { repetirTour } from "@/lib/acoes-tour";
import { NavPainel, type ItemMenu } from "@/components/nav-painel";

export const dynamic = "force-dynamic";

const MENU: (Omit<ItemMenu, "badge"> & { papeis?: string[] })[] = [
  { href: "/admin", r: "Visão geral", grupo: "", icone: "painel" },
  { href: "/admin/pedidos", r: "Pedidos", grupo: "", icone: "pedidos" },
  { href: "/admin/produtos", r: "Produtos", grupo: "", icone: "produtos" },
  { href: "/admin/estoque", r: "Estoque", grupo: "", icone: "estoque" },
  { href: "/admin/recuperar-vendas", r: "Recuperar vendas", grupo: "", icone: "recuperar" },
  { href: "/admin/conversas", r: "Conversas", grupo: "", icone: "conversas" },
  { href: "/admin/revenda", r: "Revenda", grupo: "", icone: "revenda" },
  { href: "/admin/vitrine", r: "Vitrine da home", grupo: "Loja", icone: "vitrine" },
  { href: "/admin/banners", r: "Banners", grupo: "Loja", icone: "banners" },
  { href: "/admin/videos", r: "Vídeos", grupo: "Loja", icone: "videos" },
  { href: "/admin/marketing", r: "Marketing", grupo: "Loja", icone: "marketing" },
  { href: "/admin/canais", r: "Canais e feeds", grupo: "Loja", icone: "canais" },
  { href: "/admin/emails", r: "E-mails", grupo: "Loja", icone: "emails" },
  { href: "/admin/seguranca", r: "Segurança", grupo: "Conta", icone: "seguranca" },
  // Quem dá e tira acesso é o dono e quem cuida do sistema. O operador não vê
  // esta tela: cada pessoa a mais com esse poder é uma porta a mais aberta.
  { href: "/admin/equipe", r: "Equipe e acessos", grupo: "Conta", icone: "equipe", papeis: ["MASTER", "DESENVOLVEDOR"] },
  // Quem liga serviço de fora é quem responde pela conta · o operador não
  // precisa ver token nenhum.
  { href: "/admin/integracoes", r: "Integrações", grupo: "Conta", icone: "integracoes", papeis: ["MASTER", "DESENVOLVEDOR"] },
  // O manual fica no painel, não num PDF: a dúvida aparece aqui dentro.
  { href: "/admin/manual", r: "Manual de uso", grupo: "Conta", icone: "manual" },
];

const PAPEL = { OPERADOR: "Operador", MASTER: "Dono", DESENVOLVEDOR: "Desenvolvedor" } as const;

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const eu = await usuarioAtual();
  if (!eu) redirect("/admin/entrar");

  const [conta, aSeparar, estoqueBaixo] = await Promise.all([
    // O tour aparece na primeira entrada de cada pessoa.
    prisma.usuario.findUnique({ where: { id: eu.id }, select: { viuTour: true } }),
    prisma.pedido.count({ where: { status: { in: ["PAGO", "SEPARANDO"] } } }),
    prisma.estoque.count({ where: { quantidade: { lte: 5 } } }),
  ]);

  const contagem: Record<string, number> = { "/admin/pedidos": aSeparar, "/admin/estoque": estoqueBaixo };
  const itens: ItemMenu[] = MENU.filter((m) => !m.papeis || m.papeis.includes(eu.papel)).map(
    ({ papeis: _papeis, ...m }) => ({ ...m, badge: contagem[m.href] || undefined }),
  );
  const inicial = eu.nome.trim().charAt(0).toLocaleUpperCase("pt-BR");

  return (
    <div className="min-h-screen bg-fundo md:grid md:grid-cols-[248px_minmax(0,1fr)]">
      <aside className="flex flex-col border-b border-linha bg-superficie md:sticky md:top-0 md:h-screen md:border-b-0 md:border-r">
        <div className="px-5 pb-3 pt-5">
          <Link href="/admin" className="inline-block">
            <Image src="/logo-vibravert.png" alt="Vibra Vert" width={132} height={46} priority />
          </Link>
          <p className="mt-1.5 text-[12px] font-medium text-mudo">Painel administrativo</p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
          <NavPainel itens={itens} />
        </div>

        {/* Quem está logado fica visível: em máquina compartilhada, agir sem
            saber em nome de quem é o jeito de a auditoria virar ficção. */}
        <div className="border-t border-linha p-3">
          <div className="flex items-center gap-2.5 px-2 py-1.5">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-marca text-[13px] font-semibold text-white">
              {inicial}
            </span>
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold leading-tight text-tinta">{eu.nome}</p>
              <p className="text-[12px] text-mudo">{PAPEL[eu.papel as keyof typeof PAPEL] ?? eu.papel}</p>
            </div>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-1.5">
            <form action={async () => { "use server"; await repetirTour(); redirect("/admin"); }}>
              <button className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-linha px-2 py-1.5 text-[12.5px] font-medium text-tinta-2 transition-colors hover:bg-fundo hover:text-tinta">
                <PlayCircle aria-hidden className="h-3.5 w-3.5" />
                Ver tour
              </button>
            </form>
            <form action={async () => { "use server"; await sair(); redirect("/admin/entrar"); }}>
              <button className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-linha px-2 py-1.5 text-[12.5px] font-medium text-tinta-2 transition-colors hover:border-critico/40 hover:text-critico">
                <LogOut aria-hidden className="h-3.5 w-3.5" />
                Sair
              </button>
            </form>
          </div>
        </div>
      </aside>

      <main className="min-w-0">{children}</main>

      {!conta?.viuTour && <TourPainel />}
    </div>
  );
}
