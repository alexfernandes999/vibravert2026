/**
 * As garantias que moram no banco (prisma/sql/assistencia.sql), testadas num
 * Postgres de verdade (PGlite) com o schema completo gerado pelo Prisma.
 *
 * Se um destes testes falhar, a promessa "nenhuma negativa sem uma pessoa"
 * deixou de ser garantida pelo sistema.
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it } from "vitest";

const raiz = path.resolve(__dirname, "../..");
let db: PGlite;

const CHAMADO = `INSERT INTO assistencia.chamados
  (id, protocolo, status, faixa, "regrasVersao", nome, documento, telefone, email, canal, usou, "nfTexto",
   ocorrido, "lgpdEm", "enviadoEm", "atualizadoEm")
  VALUES ($1, $2, 'EM_ANALISE', 'normal_31_90', 'guia-laudos-v2', 'Cliente Teste', '52998224725',
   '11999999999', 'c@t.com', 'site', true, '123', 'parou', now(), current_date, now())`;

async function chamado(id: string) {
  await db.query(CHAMADO, [id, `AT-2026-${id.padStart(6, "0")}`]);
}

async function falha(sql: string, params: unknown[] = []) {
  let erro: unknown = null;
  try {
    await db.query(sql, params);
  } catch (e) {
    erro = e;
  }
  expect(erro, `deveria ter falhado: ${sql}`).not.toBeNull();
  return String((erro as Error).message);
}

beforeAll(async () => {
  const schema = execFileSync(
    "npx",
    ["prisma", "migrate", "diff", "--from-empty", "--to-schema-datamodel", "prisma/schema.prisma", "--script"],
    { cwd: raiz, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
  );
  db = new PGlite();
  await db.exec(`CREATE SCHEMA storage;
    CREATE TABLE storage.buckets (id text PRIMARY KEY, name text, public boolean,
      file_size_limit bigint, allowed_mime_types text[]);`);
  await db.exec(schema);
  await db.exec(readFileSync(path.join(raiz, "prisma/sql/assistencia.sql"), "utf8"));
  await db.exec(`
    INSERT INTO vibravert."Usuario" (id, login, nome, email, "senhaHash", papel, "atualizadoEm")
    VALUES ('op', 'op', 'Operador', 'op@x', 'h', 'OPERADOR', now()),
           ('tec', 'tec', 'Técnico', 'tec@x', 'h', 'TECNICO', now());`);
}, 120_000);

describe("decisoes é append-only", () => {
  it("não aceita UPDATE nem DELETE, de ninguém", async () => {
    await chamado("1");
    await db.query(`INSERT INTO assistencia.decisoes (id, "chamadoId", autor, sugestao) VALUES ('d1', '1', 'codigo', 'aprovacao')`);
    expect(await falha(`UPDATE assistencia.decisoes SET sugestao = 'negativa' WHERE id = 'd1'`)).toMatch(/append-only/);
    expect(await falha(`DELETE FROM assistencia.decisoes WHERE id = 'd1'`)).toMatch(/não pode ser apagado/);
    expect(await falha(`DELETE FROM assistencia.chamados WHERE id = '1'`)).toMatch(/não pode ser apagado/);
  });
});

describe("negativa e recusa só de pessoa", () => {
  it("Claude não registra negativa", async () => {
    await chamado("2");
    expect(
      await falha(`INSERT INTO assistencia.decisoes (id, "chamadoId", autor, "decisaoFinal") VALUES ('d2', '2', 'claude', 'negativa')`),
    ).toMatch(/negativa_so_de_pessoa/);
  });
  it("pessoa sem marcar 'Conferi as 6 fotos' não registra negativa", async () => {
    expect(
      await falha(`INSERT INTO assistencia.decisoes (id, "chamadoId", autor, "usuarioId", "decisaoFinal") VALUES ('d3', '2', 'pessoa', 'op', 'negativa')`),
    ).toMatch(/negativa_so_de_pessoa/);
  });
  it("chamado não vira NEGADO sem a decisão humana; com ela, vira", async () => {
    expect(await falha(`UPDATE assistencia.chamados SET status = 'NEGADO' WHERE id = '2'`)).toMatch(/confirmada por uma pessoa/);
    await db.query(`INSERT INTO assistencia.decisoes (id, "chamadoId", autor, "usuarioId", "decisaoFinal", "conferiuFotos")
                    VALUES ('d4', '2', 'pessoa', 'op', 'negativa', true)`);
    await db.query(`UPDATE assistencia.chamados SET status = 'NEGADO' WHERE id = '2'`);
  });
  it("laudo de negativa não é liberado por código nem pela Claude", async () => {
    await chamado("3");
    expect(
      await falha(`INSERT INTO assistencia.laudos (id, "chamadoId", tipo, versao, conteudo, liberado, "liberadoPorAutor")
                   VALUES ('l1', '3', 'negativa', 1, '{}', true, 'claude')`),
    ).toMatch(/só é liberado por uma pessoa/);
  });
});

describe("bancada: só o técnico assina", () => {
  it("operador não assina; técnico sem observação não assina; assinado não muda", async () => {
    await chamado("4");
    await db.query(`INSERT INTO assistencia.bancada (id, "chamadoId", "recebidoEm", "identificadoPor", "atualizadoEm")
                    VALUES ('b1', '4', now(), 'protocolo_caixa', now())`);
    expect(
      await falha(`UPDATE assistencia.bancada SET "assinadoPorId" = 'op', "assinadoEm" = now(), observacao = 'ok', "conclusaoFinal" = 'garantia' WHERE id = 'b1'`),
    ).toMatch(/TECNICO/);
    expect(
      await falha(`UPDATE assistencia.bancada SET "assinadoPorId" = 'tec', "assinadoEm" = now(), "conclusaoFinal" = 'garantia' WHERE id = 'b1'`),
    ).toMatch(/observação/);
    await db.query(`UPDATE assistencia.bancada SET "assinadoPorId" = 'tec', "assinadoEm" = now(), observacao = 'Bobina íntegra', "conclusaoFinal" = 'garantia' WHERE id = 'b1'`);
    expect(await falha(`UPDATE assistencia.bancada SET "conclusaoFinal" = 'mau_uso' WHERE id = 'b1'`)).toMatch(/assinado não muda/);
  });
});

describe("papel do conector da Claude", () => {
  async function comoClaude<T>(f: () => Promise<T>) {
    await db.exec("SET ROLE claude_conector");
    try {
      return await f();
    } finally {
      await db.exec("RESET ROLE");
    }
  }

  it("não lê a tabela de chamados direto; lê a visão com CPF mascarado", async () => {
    await chamado("5");
    await comoClaude(async () => {
      expect(await falha(`SELECT documento FROM assistencia.chamados`)).toMatch(/permission denied/);
      const r = await db.query<{ documento: string }>(`SELECT documento FROM assistencia.chamados_claude WHERE id = '5'`);
      expect(r.rows[0].documento).toBe("***.982.247-**");
    });
  });

  it("registra sugestão e nota como Claude, nunca como pessoa nem negativa", async () => {
    await comoClaude(async () => {
      await db.query(`INSERT INTO assistencia.decisoes (id, "chamadoId", autor, sugestao) VALUES ('c1', '5', 'claude', 'aprovacao')`);
      expect(await falha(`INSERT INTO assistencia.decisoes (id, "chamadoId", autor, "usuarioId", sugestao) VALUES ('c2', '5', 'pessoa', 'op', 'x')`)).toMatch(/row-level security|violates/);
      expect(await falha(`INSERT INTO assistencia.decisoes (id, "chamadoId", autor, "decisaoFinal") VALUES ('c3', '5', 'claude', 'recusa')`)).toMatch(/row-level security|negativa_so_de_pessoa/);
    });
  });

  it("muda status para aprovado, nunca para NEGADO, RECUSADO ou CONCLUIDO", async () => {
    await comoClaude(async () => {
      await db.query(`UPDATE assistencia.chamados SET status = 'AGUARDANDO_ENVIO' WHERE id = '5'`);
      expect(await falha(`UPDATE assistencia.chamados SET status = 'CONCLUIDO' WHERE id = '5'`)).toMatch(/row-level security/);
      expect(await falha(`UPDATE assistencia.chamados SET nome = 'outro' WHERE id = '5'`)).toMatch(/permission denied/);
    });
  });

  it("não assina bancada nem apaga histórico", async () => {
    await comoClaude(async () => {
      expect(await falha(`UPDATE assistencia.bancada SET "assinadoPorId" = 'tec' WHERE id = 'b1'`)).toMatch(/permission denied/);
      expect(await falha(`DELETE FROM assistencia.decisoes WHERE id = 'c1'`)).toMatch(/permission denied|não pode ser apagado/);
    });
  });

  it("libera laudo favorável, nunca negativa", async () => {
    await comoClaude(async () => {
      await db.query(`INSERT INTO assistencia.laudos (id, "chamadoId", tipo, versao, conteudo, liberado, "liberadoPorAutor")
                      VALUES ('cl1', '5', 'aprovacao_31_90', 1, '{}', true, 'claude')`);
      expect(
        await falha(`INSERT INTO assistencia.laudos (id, "chamadoId", tipo, versao, conteudo, liberado, "liberadoPorAutor")
                     VALUES ('cl2', '5', 'negativa', 1, '{}', true, 'claude')`),
      ).toMatch(/row-level security|liberado por uma pessoa/);
    });
  });
});

describe("storage", () => {
  it("bucket da assistência é privado", async () => {
    const r = await db.query<{ public: boolean }>(`SELECT public FROM storage.buckets WHERE id = 'assistencia'`);
    expect(r.rows[0].public).toBe(false);
  });
});
