import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { validarToken, concluirTroca } from "@/lib/recuperacao";
import { FormNovaSenha } from "@/components/form-nova-senha";

export const dynamic = "force-dynamic";
export const metadata = { title: "Nova senha", robots: { index: false, follow: false } };

export default async function NovaSenha({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ erro?: string }>;
}) {
  const { token } = await params;
  const { erro } = await searchParams;
  const conta = await validarToken(token);

  async function acao(dados: FormData) {
    "use server";
    const r = await concluirTroca(
      token,
      String(dados.get("senha") ?? ""),
      String(dados.get("repetida") ?? ""),
      String(dados.get("codigo") ?? ""),
    );
    redirect(
      r.ok
        ? "/admin/entrar?erro=" + encodeURIComponent("Senha trocada. Entre com a nova.")
        : `/admin/recuperar/${token}?erro=${encodeURIComponent(r.erro)}`,
    );
  }

  return (
    <div className="grid min-h-screen place-items-center px-5">
      <div className="w-full max-w-sm rounded-caixa border border-linha bg-superficie p-7 shadow-xl shadow-marca/5">
        <div className="flex items-center gap-3">
          <Image src="/vibrinha.png" alt="" width={52} height={52} className="h-13 w-13 shrink-0" priority />
          <Image src="/logo-vibravert.png" alt="Vibra Vert" width={140} height={36} priority />
        </div>

        {!conta ? (
          <>
            <h1 className="mt-5 text-lg font-extrabold tracking-tight">Este link não vale mais</h1>
            <p className="mt-2 text-[13px] leading-relaxed text-tinta-2">
              Links de troca de senha valem 30 minutos e funcionam uma vez só. Peça outro e use
              assim que chegar.
            </p>
            <Link
              href="/admin/recuperar"
              className="mt-4 inline-block rounded-lg bg-marca px-4 py-2.5 text-[13px] font-bold text-white"
            >
              Pedir um link novo
            </Link>
          </>
        ) : (
          <>
            <h1 className="mt-5 text-lg font-extrabold tracking-tight">Nova senha</h1>
            <p className="mt-1 text-[12.5px] text-mudo">
              Conta <strong className="font-bold text-tinta-2">{conta.login}</strong> · {conta.nome}
            </p>
            <FormNovaSenha acao={acao} erro={erro} pedeCodigo={conta.temDoisFatores} />
          </>
        )}
      </div>
    </div>
  );
}
