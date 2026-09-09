import { NextResponse } from "next/server";
import { configPublica } from "@/lib/marketing";

export const dynamic = "force-dynamic";

/**
 * O que o navegador pode saber.
 *
 * Só os dois ids que já apareceriam no HTML de qualquer forma. O token da API
 * de Conversões NUNCA sai por aqui · ele é o que permite mandar vendas em nome
 * da conta, e quem o tiver pode inventar faturamento no relatório alheio.
 */
export async function GET() {
  const c = await configPublica();
  return NextResponse.json(
    { pixelMeta: c.pixelMeta, gtmId: c.gtmId },
    { headers: { "Cache-Control": "public, max-age=300, s-maxage=300" } },
  );
}
