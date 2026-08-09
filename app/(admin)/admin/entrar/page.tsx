import { redirect } from "next/navigation";
import Image from "next/image";
import { entrar, autenticado } from "@/lib/admin-auth";

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
    <div className="grid min-h-screen place-items-center bg-fundo px-5">
      <form action={acao} className="w-full max-w-sm rounded-caixa border border-linha bg-superficie p-7">
        <Image src="/logo-vibravert.png" alt="Vibra Vert" width={158} height={55} />
        <h1 className="mt-5 text-lg font-extrabold tracking-tight">Administração</h1>
        <label className="mt-4 block">
          <span className="mb-1.5 block text-[12.5px] font-bold">Senha</span>
          <input
            name="senha"
            type="password"
            autoFocus
            className="w-full rounded-lg border border-linha-2 bg-superficie px-3 py-2.5 text-[14px] font-semibold"
          />
        </label>
        {erro && <p className="mt-2 text-[12.5px] font-semibold text-critico">{erro}</p>}
        <button className="mt-4 w-full rounded-lg bg-marca py-3 text-sm font-bold text-white">Entrar</button>
      </form>
    </div>
  );
}
