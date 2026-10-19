import { beforeAll, describe, expect, it } from "vitest";

let POST: (r: Request) => Promise<Response>;
beforeAll(async () => {
  process.env.MCP_TOKEN_CLAUDE = "token-de-teste";
  ({ POST } = await import("@/app/api/mcp/route"));
});

const rpc = (corpo: unknown, token = "token-de-teste") =>
  POST(new Request("http://x/api/mcp", { method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, body: JSON.stringify(corpo) }));

describe("conector MCP", () => {
  it("sem token, ou com token errado, não responde", async () => {
    expect((await rpc({ jsonrpc: "2.0", id: 1, method: "ping" }, "")).status).toBe(401);
    expect((await rpc({ jsonrpc: "2.0", id: 1, method: "ping" }, "outro")).status).toBe(401);
  });

  it("initialize anuncia ferramentas", async () => {
    const r = await (await rpc({ jsonrpc: "2.0", id: 1, method: "initialize", params: {} })).json();
    expect(r.result.capabilities.tools).toBeDefined();
  });

  it("a matriz de permissões: o que é proibido não existe", async () => {
    const r = await (await rpc({ jsonrpc: "2.0", id: 2, method: "tools/list" })).json();
    const nomes: string[] = r.result.tools.map((t: { name: string }) => t.name);
    expect(nomes.sort()).toEqual(
      [
        "criar_rascunho", "escalar_para_humano", "ler_chamado", "ler_fotos", "liberar_aprovacao", "listar_chamados",
        "orientar_marketplace", "pedir_informacao", "registrar_nota", "registrar_sugestao", "responder_conversa", "responder_email",
      ].sort(),
    );
    for (const proibida of ["confirmar_negativa", "confirmar_recusa", "assinar_laudo_bancada", "apagar_chamado"])
      expect(nomes).not.toContain(proibida);
  });

  it("chamar ferramenta proibida é erro de método", async () => {
    const r = await (await rpc({ jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "confirmar_negativa", arguments: {} } })).json();
    expect(r.error.code).toBe(-32602);
  });

  it("sem o papel restrito do banco, a ferramenta falha em vez de usar o usuário da aplicação", async () => {
    delete process.env.DATABASE_URL_CLAUDE;
    const r = await (await rpc({ jsonrpc: "2.0", id: 4, method: "tools/call", params: { name: "ler_chamado", arguments: { protocolo: "AT-2026-000001" } } })).json();
    expect(r.result.isError).toBe(true);
    expect(r.result.content[0].text).toMatch(/DATABASE_URL_CLAUDE/);
  });

  it("notificação não tem resposta", async () => {
    expect((await rpc({ jsonrpc: "2.0", method: "notifications/initialized" })).status).toBe(202);
  });
});
