import { prisma } from "@/lib/prisma";
import { chaveValida } from "@/lib/assistencia/acesso";
import { RE_PROTOCOLO } from "@/lib/assistencia/protocolo";
import { gerarPdfLaudo } from "@/lib/assistencia/pdf";
import type { ConteudoLaudo } from "@/lib/assistencia/laudo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** PDF do último laudo liberado, para quem tem o link do protocolo. */
export async function GET(req: Request, { params }: { params: Promise<{ protocolo: string }> }) {
  const { protocolo } = await params;
  const k = new URL(req.url).searchParams.get("k");
  if (!RE_PROTOCOLO.test(protocolo) || !chaveValida(protocolo, k)) return new Response("Não encontrado", { status: 404 });

  const laudo = await prisma.laudo.findFirst({
    where: { chamado: { protocolo }, liberado: true },
    orderBy: { criadoEm: "desc" },
  });
  if (!laudo) return new Response("Laudo ainda não disponível", { status: 404 });

  const pdf = await gerarPdfLaudo(laudo.conteudo as unknown as ConteudoLaudo);
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="laudo-${protocolo}-v${laudo.versao}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
