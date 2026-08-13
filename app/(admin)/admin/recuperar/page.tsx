import Link from "next/link";
import Image from "next/image";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { pedirTroca } from "@/lib/recuperacao";

export const dynamic = "force-dynamic";
export const metadata = { title: "Recuperar senha" };

export default async function Recuperar({
  searchParams,
}: {
  searchParams: Promise<{ enviado?: string; erro?: string }>;
}) {
  const { enviado, erro } = await searchParams;

  async function acao(dados: FormData) {
    "use server";
    const h = await headers();
    const base =
      process.env.NEXT_PUBLIC_URL ||
      `https://${h.get("x-forwarded-host") ?? h.get("host") ?? "vibravert-loja.vercel.app"}`;

    const r = await pedirTroca(String(dados.get("quem") ?? ""), base);
    redirect(r.ok ? "/admin/recuperar?enviado=1" : `/admin/recuperar?erro=${encodeURIComponent(r.erro)}`);
  }

  return (
    <div className="grid min-h-screen place-items-center px-5">
      <div className="w-full max-w-sm rounded-caixa border border-linha bg-superficie p-7 shadow-xl shadow-marca/5">
        <div className="flex items-center gap-3">
          <Image src="/vibrinha.png" alt="" width={52} height={52} className="h-13 w-13 shrink-0" priority />
          <Image src="/logo-vibravert.png" alt="Vibra Vert" width={140} height={36} priority />
        </div>

        {enviado ? (
          <>
            <h1 className="mt-5 text-lg font-extrabold tracking-tight">Confere o seu e-mail</h1>
            {/* A mensagem é a mesma exista a conta ou não: dizer "não achei esse
                e-mail" entrega a lista de quem tem acesso ao painel. */}
            <p className="mt-2 text-[13px] leading-relaxed text-tinta-2">
              Se essa conta existir, mandamos um link para trocar a senha. Ele vale por 30 minutos e
              funciona uma vez só.
            </p>
            <p className="mt-2.5 text-[12.5px] leading-relaxed text-mudo">
              Não chegou? Olhe no lixo eletrônico. Se ainda assim nada, fale com quem cuida do
              sistema · pode ser que o envio de e-mails ainda não esteja ligado.
            </p>
          </>
        ) : (
          <>
            <h1 className="mt-5 text-lg font-extrabold tracking-tight">Esqueci a senha</h1>
            <p className="mt-1 text-[12.5px] text-mudo">
              Digite o seu usuário ou o seu e-mail que eu mando o link.
            </p>

            <form action={acao}>
              <label className="mt-4 block">
                <span className="mb-1.5 block text-[12.5px] font-bold">Usuário ou e-mail</span>
                <input
                  name="quem"
                  autoFocus
                  autoCapitalize="none"
                  autoComplete="username"
                  className="w-full rounded-lg border border-linha-2 bg-superficie px-3 py-2.5 text-[14px] font-semibold"
                />
              </label>

              {erro && (
                <p role="alert" className="mt-2 text-[12.5px] font-semibold text-critico">
                  {erro}
                </p>
              )}

              <button className="mt-4 w-full rounded-lg bg-marca py-3 text-sm font-bold text-white shadow-lg shadow-marca/25 transition-all duration-100 hover:brightness-110 active:scale-[0.98]">
                Mandar o link
              </button>
            </form>
          </>
        )}

        <Link href="/admin/entrar" className="mt-4 inline-block text-[12.5px] font-semibold text-marca underline underline-offset-2">
          Voltar para entrar
        </Link>
      </div>
    </div>
  );
}
