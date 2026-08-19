import { NextRequest } from "next/server";
import { trocarCodigo } from "@/lib/bling";

export const dynamic = "force-dynamic";

/**
 * Volta do link de convite do Bling.
 *
 * Quem autoriza é quem tem acesso ao Bling, e essa pessoa não é necessariamente
 * quem tem senha do nosso painel · por isso esta rota não pede login. O que a
 * protege é o próprio `code`: vale uma vez, dura pouco, e só existe se alguém
 * autorizou o nosso client_id lá dentro.
 *
 * A resposta é uma página, não um JSON. Quem chega aqui chegou pelo navegador,
 * no meio de uma tarefa, e merece uma frase em vez de um objeto.
 */
function pagina(titulo: string, texto: string, ok: boolean) {
  return new Response(
    `<!doctype html><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${titulo}</title>
<style>
  body { margin:0; min-height:100vh; display:grid; place-items:center;
         background:#f6f7fa; color:#101623; padding:24px;
         font:400 16px/1.6 ui-sans-serif,-apple-system,"Segoe UI",Roboto,sans-serif; }
  .c { max-width:460px; background:#fff; border:1px solid #e0e5ee; border-radius:16px;
       padding:34px 32px; box-shadow:0 8px 24px -12px rgba(16,22,35,.16); }
  .s { display:inline-block; padding:4px 10px; border-radius:7px; font-size:11px;
       font-weight:800; letter-spacing:.08em; text-transform:uppercase;
       background:${ok ? "#e4f1ea" : "#fdeaea"}; color:${ok ? "#12694a" : "#a51d1d"}; }
  h1 { margin:14px 0 0; font-size:23px; font-weight:800; letter-spacing:-.02em; }
  p { margin:12px 0 0; color:#3c4557; font-size:15px; }
  code { display:block; margin-top:14px; padding:12px 14px; border-radius:9px;
         background:#f0f2f7; font:13px/1.5 ui-monospace,Menlo,monospace;
         word-break:break-all; color:#3c4557; }
  a { display:inline-block; margin-top:22px; padding:11px 20px; border-radius:9px;
      background:#14307a; color:#fff; text-decoration:none; font-weight:700; font-size:14.5px; }
</style>
<div class="c">
  <span class="s">${ok ? "Conectado" : "Não deu"}</span>
  <h1>${titulo}</h1>
  <p>${texto}</p>
  <a href="/admin/integracoes">Ir para o painel</a>
</div>`,
    { status: ok ? 200 : 400, headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const erro = searchParams.get("error_description") ?? searchParams.get("error");

  if (erro) {
    return pagina("O Bling recusou a autorização", erro, false);
  }
  if (!code) {
    return pagina(
      "Faltou o código",
      "Este endereço só funciona quando o Bling manda de volta o código da autorização. Abra o link de convite pelo painel do Bling.",
      false,
    );
  }

  try {
    await trocarCodigo(code);
    return pagina(
      "Bling conectado",
      "A loja já consegue emitir nota e enviar os pedidos. Não é preciso repetir isso a cada venda · a conexão se renova sozinha.",
      true,
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "erro desconhecido";
    // O motivo cru vai para a tela de propósito: o código expira em segundos, e
    // saber se foi isso ou outra coisa decide se é só clicar de novo.
    return pagina(
      "Não consegui trocar o código",
      `O código chegou, mas o Bling recusou a troca. Se a mensagem falar em código inválido ou expirado, é só abrir o link de convite de novo · ele dura poucos segundos.<code>${msg.replace(/[<>]/g, "")}</code>`,
      false,
    );
  }
}
