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

const ASSISTENCIA = "Assistência técnica";

const MENU: (Omit<ItemMenu, "badge"> & { papeis?: string[] })[] = [
  { href: "/admin", r: "Visão geral", grupo: "", icone: "painel" },

  // Vendas: tudo o que tem cliente do outro lado.
  { href: "/admin/vendas", r: "Painel de vendas", grupo: "Vendas", icone: "vendas", papeis: ["MASTER", "DESENVOLVEDOR", "OPERADOR"] },
  { href: "/admin/pedidos", r: "Pedidos", grupo: "Vendas", icone: "pedidos" },
  { href: "/admin/clientes", r: "Clientes", grupo: "Vendas", icone: "clientes" },
  { href: "/admin/recuperar-vendas", r: "Recuperar vendas", grupo: "Vendas", icone: "recuperar" },
  { href: "/admin/revenda", r: "Cadastros de revenda", grupo: "Vendas", icone: "revenda" },
  // O registro do chat do site (Vibrinha). Não é o WhatsApp: esse fica no Conversas.
  { href: "/admin/conversas", r: "Chat do site (Vibrinha)", grupo: "Vendas", icone: "conversas" },

  { href: "/admin/produtos", r: "Produtos", grupo: "Produtos", icone: "produtos" },
  { href: "/admin/estoque", r: "Estoque", grupo: "Produtos", icone: "estoque" },
  // ERP · fase 1: o espelho do Bling. Só lê; quem acompanha é quem responde pela conta.
  { href: "/admin/erp", r: "Dados do Bling (ERP)", grupo: "Produtos", icone: "espelho", papeis: ["MASTER", "DESENVOLVEDOR"] },

  // Assistência técnica: o técnico vê só este grupo (e a própria conta).
  { href: "/admin/assistencia", r: "Resumo do dia", grupo: ASSISTENCIA, icone: "assistencia" },
  { href: "/admin/assistencia/fila", r: "Fila de decisão", grupo: ASSISTENCIA, icone: "fila" },
  { href: "/admin/assistencia/chamados", r: "Chamados", grupo: ASSISTENCIA, icone: "chamados" },
  { href: "/admin/assistencia/bancada", r: "Bancada", grupo: ASSISTENCIA, icone: "bancada" },

  { href: "/admin/vitrine", r: "Vitrine da home", grupo: "Site e divulgação", icone: "vitrine" },
  { href: "/admin/banners", r: "Banners", grupo: "Site e divulgação", icone: "banners" },
  { href: "/admin/videos", r: "Vídeos", grupo: "Site e divulgação", icone: "videos" },
  { href: "/admin/marketing", r: "Pixels e anúncios", grupo: "Site e divulgação", icone: "marketing" },
  { href: "/admin/canais", r: "Google e feeds", grupo: "Site e divulgação", icone: "canais" },
  { href: "/admin/emails", r: "E-mails enviados", grupo: "Site e divulgação", icone: "emails" },

  // Quem dá e tira acesso é o dono e quem cuida do sistema. O operador não vê
  // esta tela: cada pessoa a mais com esse poder é uma porta a mais aberta.
  { href: "/admin/equipe", r: "Equipe e acessos", grupo: "Configurações", icone: "equipe", papeis: ["MASTER", "DESENVOLVEDOR"] },
  // Quem liga serviço de fora é quem responde pela conta · o operador não
  // precisa ver token nenhum.
  { href: "/admin/integracoes", r: "Integrações", grupo: "Configurações", icone: "integracoes", papeis: ["MASTER", "DESENVOLVEDOR"] },
  { href: "/admin/seguranca", r: "Minha conta", grupo: "Configurações", icone: "seguranca" },
  // O manual fica no painel, não num PDF: a dúvida aparece aqui dentro.
  { href: "/admin/manual", r: "Manual de uso", grupo: "Configurações", icone: "manual" },
];

const PAPEL = { OPERADOR: "Operador", MASTER: "Dono", DESENVOLVEDOR: "Desenvolvedor", TECNICO: "Técnico" } as const;

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const eu = await usuarioAtual();
  if (!eu) redirect("/admin/entrar");

  const [conta, aSeparar, estoqueBaixo, naFila, bling] = await Promise.all([
    // O tour aparece na primeira entrada de cada pessoa.
    prisma.usuario.findUnique({ where: { id: eu.id }, select: { viuTour: true } }),
    prisma.pedido.count({ where: { status: { in: ["PAGO", "SEPARANDO"] } } }),
    prisma.estoque.count({ where: { quantidade: { lte: 5 } } }),
    prisma.chamado.count({ where: { status: "EM_ANALISE" } }),
    prisma.integracao.findUnique({ where: { nome: "bling" }, select: { falhaEm: true } }),
  ]);

  const contagem: Record<string, number> = {
    "/admin/pedidos": aSeparar,
    "/admin/estoque": estoqueBaixo,
    "/admin/assistencia/fila": naFila,
  };
  // O técnico não opera a loja: vê a assistência, a segurança e o manual.
  const doTecnico = (m: (typeof MENU)[number]) =>
    m.grupo === ASSISTENCIA || m.href === "/admin/seguranca" || m.href === "/admin/manual";
  const itens: ItemMenu[] = MENU.filter(
    (m) => (!m.papeis || m.papeis.includes(eu.papel)) && (eu.papel !== "TECNICO" || doTecnico(m)),
  ).map(
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

      <main className="min-w-0">
        {/* Bling caído é pedido sem nota: avisa em toda tela, para todo mundo. */}
        {bling?.falhaEm && eu.papel !== "TECNICO" && (
          <div role="alert" className="border-b border-critico/30 bg-critico/[0.07] px-6 py-2.5 text-[13px] text-tinta">
            <b className="text-critico">Bling desconectado desde {bling.falhaEm.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" })}.</b>{" "}
            Pedidos novos não sobem para o Bling até reautorizar.{" "}
            {(eu.papel === "MASTER" || eu.papel === "DESENVOLVEDOR") && (
              <Link href="/admin/integracoes" className="font-bold text-marca underline">Reautorizar agora</Link>
            )}
          </div>
        )}
        {children}
      </main>

      {!conta?.viuTour && <TourPainel />}
    </div>
  );
}
