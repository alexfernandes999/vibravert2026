import { timingSafeEqual } from "node:crypto";
import { z } from "zod/v4";
import { FERRAMENTAS, errosDoBanco, type NomeFerramenta } from "@/lib/mcp/conector";

/**
 * Servidor MCP do portal da assistência (Streamable HTTP, sem estado).
 *
 * JSON-RPC 2.0 por POST: initialize, tools/list, tools/call e ping. Cada
 * chamada de ferramenta roda com o papel restrito do banco (lib/mcp/conector).
 * Autenticação por token próprio do conector, em MCP_TOKEN_CLAUDE.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VERSAO_PROTOCOLO = "2025-06-18";

function autorizado(req: Request) {
  const esperado = process.env.MCP_TOKEN_CLAUDE;
  if (!esperado) return false;
  const recebido = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const a = Buffer.from(recebido);
  const b = Buffer.from(esperado);
  return a.length === b.length && timingSafeEqual(a, b);
}

type Pedido = { jsonrpc: "2.0"; id?: string | number | null; method: string; params?: Record<string, unknown> };

const resposta = (id: Pedido["id"], result: unknown) => ({ jsonrpc: "2.0", id: id ?? null, result });
const erro = (id: Pedido["id"], code: number, message: string) => ({ jsonrpc: "2.0", id: id ?? null, error: { code, message } });

async function tratar(p: Pedido) {
  switch (p.method) {
    case "initialize":
      return resposta(p.id, {
        protocolVersion: VERSAO_PROTOCOLO,
        capabilities: { tools: {} },
        serverInfo: { name: "vibravert-assistencia", version: "1.0.0" },
        instructions:
          "Portal de assistência técnica da Vibra Vert. As regras de faixa, triagem e liberação estão no código; você lê, sugere e redige. Negativa, recusa e assinatura de bancada são exclusivas de pessoas e não existem neste conector.",
      });
    case "ping":
      return resposta(p.id, {});
    case "tools/list":
      return resposta(p.id, {
        tools: Object.entries(FERRAMENTAS).map(([name, f]) => ({
          name,
          description: f.descricao,
          inputSchema: z.toJSONSchema(f.entrada),
        })),
      });
    case "tools/call": {
      const nome = String(p.params?.name ?? "") as NomeFerramenta;
      const f = FERRAMENTAS[nome];
      if (!f) return erro(p.id, -32602, `ferramenta inexistente: ${nome}`);
      const args = f.entrada.safeParse(p.params?.arguments ?? {});
      if (!args.success) return resposta(p.id, { isError: true, content: [{ type: "text", text: `argumentos inválidos: ${args.error.message}` }] });
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const r = await (f.rodar as (a: any) => Promise<unknown>)(args.data);
        return resposta(p.id, { content: [{ type: "text", text: JSON.stringify(r, (_, v) => (typeof v === "bigint" ? Number(v) : v)) }] });
      } catch (e) {
        return resposta(p.id, { isError: true, content: [{ type: "text", text: errosDoBanco(e) }] });
      }
    }
    default:
      return erro(p.id, -32601, `método não suportado: ${p.method}`);
  }
}

export async function POST(req: Request) {
  if (!autorizado(req)) return new Response("Não autorizado", { status: 401, headers: { "WWW-Authenticate": "Bearer" } });
  let corpo: Pedido | Pedido[];
  try {
    corpo = await req.json();
  } catch {
    return Response.json(erro(null, -32700, "JSON inválido"), { status: 400 });
  }
  const lote = Array.isArray(corpo) ? corpo : [corpo];
  const saidas = [];
  for (const p of lote) {
    // Notificação (sem id) não tem resposta.
    if (p.id === undefined) continue;
    saidas.push(await tratar(p));
  }
  if (!saidas.length) return new Response(null, { status: 202 });
  return Response.json(Array.isArray(corpo) ? saidas : saidas[0]);
}

export async function GET() {
  // Sem fluxo SSE do servidor: este conector só responde a pedidos.
  return new Response("Método não suportado", { status: 405, headers: { Allow: "POST" } });
}
