import { usuarioAtual } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { Cadastro2FA } from "@/components/cadastro-2fa";

export const dynamic = "force-dynamic";
export const metadata = { title: "Segurança" };

const PAPEL: Record<string, string> = {
  OPERADOR: "operador",
  MASTER: "dono",
  DESENVOLVEDOR: "desenvolvedor",
};

export default async function Seguranca({
  searchParams,
}: {
  searchParams: Promise<{ novo?: string }>;
}) {
  const eu = (await usuarioAtual())!;
  const { novo } = await searchParams;
  const conta = await prisma.usuario.findUnique({
    where: { id: eu.id },
    select: { segredo2FA: true, ultimoAcesso: true },
  });
  const temAutenticador = Boolean(conta?.segredo2FA);

  return (
    <div className="max-w-lg">
      <h1 className="text-xl font-extrabold tracking-tight">Segurança</h1>
      <p className="mt-1.5 text-[13.5px] leading-relaxed text-tinta-2">
        Sua conta é <strong className="font-bold">{eu.login}</strong>, com acesso de{" "}
        {PAPEL[eu.papel]}. O painel pede a sua senha e um
        código de 6 dígitos que muda a cada 30 segundos, gerado no seu celular. Assim, senha
        descoberta não é suficiente para entrar.
      </p>

      {novo && !temAutenticador && (
        <div className="mt-4 rounded-caixa border border-atencao/35 bg-atencao/10 p-4 text-[13px] leading-relaxed text-tinta-2">
          <strong className="font-bold">Sua conta ainda está só com senha.</strong> Cadastre o
          autenticador agora · leva um minuto, e é o que impede que uma senha vazada vire acesso ao
          painel.
        </div>
      )}

      <p className="mt-4 text-[13px] font-semibold text-tinta-2">
        {temAutenticador
          ? "Trocou de celular, ou quer cadastrar o aplicativo em mais um aparelho? É aqui."
          : "Vamos ligar o autenticador na sua conta."}
      </p>
      <Cadastro2FA abertoDeInicio={!temAutenticador} />
    </div>
  );
}
