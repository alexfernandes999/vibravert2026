import { ativo as doisFatoresAtivo } from "@/lib/dois-fatores";
import { Cadastro2FA } from "@/components/cadastro-2fa";

export const dynamic = "force-dynamic";
export const metadata = { title: "Segurança" };

/**
 * O mesmo cadastro, agora de dentro do painel.
 *
 * Trocar de celular é o caso comum: o aplicativo antigo some junto com o
 * aparelho, e sem uma tela para ler o QR de novo a saída seria mexer em
 * variável de ambiente no Vercel. A senha continua sendo pedida aqui, mesmo já
 * estando logado, porque o QR é o segundo fator inteiro em uma foto.
 */
export default function Seguranca() {
  return (
    <div className="max-w-lg">
      <h1 className="text-xl font-extrabold tracking-tight">Segurança</h1>
      <p className="mt-1.5 text-[13.5px] leading-relaxed text-tinta-2">
        O painel pede a senha e um código de 6 dígitos que muda a cada 30 segundos. Assim, senha
        descoberta não é suficiente para entrar.
      </p>

      {doisFatoresAtivo ? (
        <>
          <p className="mt-4 text-[13px] font-semibold text-tinta-2">
            Trocou de celular, ou quer cadastrar o aplicativo em mais um aparelho? É aqui.
          </p>
          <Cadastro2FA />
        </>
      ) : (
        <div className="mt-4 rounded-caixa border border-atencao/35 bg-atencao/10 p-4 text-[13px] leading-relaxed text-tinta-2">
          O segundo fator está <strong className="font-bold">desligado</strong> neste ambiente.
          Para ligar, defina <strong className="font-bold">ADMIN_2FA_SECRET</strong> em Vercel →
          Settings → Environment Variables e publique o site.
        </div>
      )}
    </div>
  );
}
