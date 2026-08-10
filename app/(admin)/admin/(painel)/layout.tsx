import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { autenticado, sair } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const MENU = [
  { href: "/admin", r: "Painel", grupo: "" },
  { href: "/admin/pedidos", r: "Pedidos", grupo: "" },
  { href: "/admin/produtos", r: "Produtos", grupo: "" },
  { href: "/admin/estoque", r: "Estoque", grupo: "" },
  { href: "/admin/banners", r: "Banners e vitrine", grupo: "Loja" },
  { href: "/admin/videos", r: "Vídeos", grupo: "Loja" },
  { href: "/admin/seguranca", r: "Segurança", grupo: "Conta" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!(await autenticado())) redirect("/admin/entrar");

  const [aSeparar, estoqueBaixo] = await Promise.all([
    prisma.pedido.count({ where: { status: { in: ["PAGO", "SEPARANDO"] } } }),
    prisma.estoque.count({ where: { quantidade: { lte: 5 } } }),
  ]);

  const contagem: Record<string, number> = { "/admin/pedidos": aSeparar, "/admin/estoque": estoqueBaixo };

  return (
    <div className="grid min-h-screen grid-cols-1 md:grid-cols-[218px_1fr]">
      <aside className="border-r border-linha bg-superficie-2 p-4">
        <Link href="/" className="block border-b border-linha pb-4">
          <Image src="/logo-vibravert.png" alt="Vibra Vert" width={140} height={49} />
          <span className="mt-2 block text-[9.5px] font-extrabold uppercase tracking-[0.16em] text-mudo">
            Administração
          </span>
        </Link>

        <nav className="mt-4 flex flex-col gap-0.5">
          {MENU.map((m, i) => (
            <span key={m.href}>
              {m.grupo && MENU[i - 1]?.grupo !== m.grupo && (
                <span className="block px-2.5 pb-1.5 pt-4 text-[9.5px] font-extrabold uppercase tracking-[0.14em] text-tenue">
                  {m.grupo}
                </span>
              )}
              <Link
                href={m.href}
                className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-[13.5px] font-semibold text-tinta-2 hover:bg-superficie hover:text-tinta"
              >
                {m.r}
                {contagem[m.href] > 0 && (
                  <span className="num ml-auto rounded-full bg-critico/10 px-1.5 py-0.5 text-[10px] font-extrabold text-critico">
                    {contagem[m.href]}
                  </span>
                )}
              </Link>
            </span>
          ))}
        </nav>

        <form action={async () => { "use server"; await sair(); redirect("/admin/entrar"); }} className="mt-6 border-t border-linha pt-4">
          <button className="text-[12.5px] font-semibold text-mudo underline underline-offset-2">Sair</button>
        </form>
      </aside>

      <main className="min-w-0 bg-fundo">{children}</main>
    </div>
  );
}
