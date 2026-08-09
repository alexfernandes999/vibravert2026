import { redirect } from "next/navigation";
import Image from "next/image";
import { entrar, autenticado } from "@/lib/admin-auth";
import { FormLoginAdmin } from "@/components/form-login-admin";

export const dynamic = "force-dynamic";

export default async function Entrar({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  if (await autenticado()) redirect("/admin");
  const { erro } = await searchParams;

  async function acao(dados: FormData) {
    "use server";
    const r = await entrar(String(dados.get("senha") ?? ""));
    redirect(r.ok ? "/admin" : `/admin/entrar?erro=${encodeURIComponent(r.erro ?? "Erro")}`);
  }

  return (
    <div className="grid min-h-screen place-items-center px-5">
      <div className="w-full max-w-sm rounded-caixa border border-linha bg-superficie p-7 shadow-xl shadow-marca/5">
        <Image src="/logo-vibravert.png" alt="Vibra Vert" width={158} height={41} priority />
        <h1 className="mt-5 text-lg font-extrabold tracking-tight">Administração</h1>
        <FormLoginAdmin acao={acao} erro={erro} />
      </div>
    </div>
  );
}
