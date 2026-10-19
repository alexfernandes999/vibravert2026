-- ═══════════════════════════════════════════════════════════════════════════
-- Assistência técnica · o que o Prisma não expressa
--
-- Aplicar depois do `prisma db push`:  npm run db:assistencia
-- Idempotente: pode rodar de novo a cada mudança.
--
-- Garantias que moram AQUI, e não em instrução de prompt nem só no código:
--   1. decisoes é append-only, para todos.
--   2. Negativa e recusa só existem com autor "pessoa", usuário identificado e
--      "Conferi as 6 fotos" marcado.
--   3. Chamado só vira NEGADO/RECUSADO, e laudo de negativa/recusa só é
--      liberado, se houver essa decisão humana.
--   4. Laudo de bancada só é assinado por usuário TECNICO; assinado, não muda.
--   5. Nada se apaga: chamados, histórico, fotos, laudos.
--   6. O papel do conector da Claude não consegue escrever negativa, recusa
--      nem assinatura, e lê o CPF mascarado.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 5. nada se apaga ────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION assistencia.bloquear_delete() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'assistencia: % não pode ser apagado (histórico imutável)', TG_TABLE_NAME;
END $$;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['chamados','respostas','fotos','avaliacoes','decisoes','bancada','laudos','chamadas_ia'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS sem_delete ON assistencia.%I', t);
    EXECUTE format('CREATE TRIGGER sem_delete BEFORE DELETE ON assistencia.%I FOR EACH ROW EXECUTE FUNCTION assistencia.bloquear_delete()', t);
  END LOOP;
END $$;

-- ── 1. decisoes append-only ─────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION assistencia.decisoes_imutaveis() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'assistencia: decisoes é append-only · registre uma nova decisão';
END $$;

DROP TRIGGER IF EXISTS imutavel ON assistencia.decisoes;
CREATE TRIGGER imutavel BEFORE UPDATE ON assistencia.decisoes
  FOR EACH ROW EXECUTE FUNCTION assistencia.decisoes_imutaveis();

-- TRUNCATE também apaga: bloqueado.
DROP TRIGGER IF EXISTS sem_truncate ON assistencia.decisoes;
CREATE TRIGGER sem_truncate BEFORE TRUNCATE ON assistencia.decisoes
  FOR EACH STATEMENT EXECUTE FUNCTION assistencia.bloquear_delete();

-- ── 2. negativa e recusa só de pessoa ───────────────────────────────────────
ALTER TABLE assistencia.decisoes DROP CONSTRAINT IF EXISTS negativa_so_de_pessoa;
ALTER TABLE assistencia.decisoes ADD CONSTRAINT negativa_so_de_pessoa CHECK (
  "decisaoFinal" IS NULL
  OR "decisaoFinal" NOT IN ('negativa', 'recusa')
  OR (autor = 'pessoa' AND "usuarioId" IS NOT NULL AND "conferiuFotos")
);

ALTER TABLE assistencia.decisoes DROP CONSTRAINT IF EXISTS autor_valido;
ALTER TABLE assistencia.decisoes ADD CONSTRAINT autor_valido CHECK (
  autor IN ('codigo', 'claude', 'pessoa') AND (autor <> 'pessoa' OR "usuarioId" IS NOT NULL)
);

-- ── 3. status e laudo desfavoráveis exigem a decisão humana ─────────────────
CREATE OR REPLACE FUNCTION assistencia.tem_decisao_humana(p_chamado text, p_decisao text) RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM assistencia.decisoes d
    WHERE d."chamadoId" = p_chamado AND d.autor = 'pessoa'
      AND d."decisaoFinal" = p_decisao AND d."conferiuFotos"
  );
$$;

CREATE OR REPLACE FUNCTION assistencia.status_desfavoravel() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'NEGADO' AND NOT assistencia.tem_decisao_humana(NEW.id, 'negativa') THEN
    RAISE EXCEPTION 'assistencia: chamado % só fica NEGADO com negativa confirmada por uma pessoa', NEW.protocolo;
  END IF;
  IF NEW.status = 'RECUSADO' AND NOT assistencia.tem_decisao_humana(NEW.id, 'recusa') THEN
    RAISE EXCEPTION 'assistencia: chamado % só fica RECUSADO com recusa confirmada por uma pessoa', NEW.protocolo;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS desfavoravel_humano ON assistencia.chamados;
CREATE TRIGGER desfavoravel_humano BEFORE INSERT OR UPDATE OF status ON assistencia.chamados
  FOR EACH ROW EXECUTE FUNCTION assistencia.status_desfavoravel();

CREATE OR REPLACE FUNCTION assistencia.laudo_liberacao() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.liberado AND (NEW.conteudo IS DISTINCT FROM OLD.conteudo OR NEW.tipo <> OLD.tipo) THEN
    RAISE EXCEPTION 'assistencia: laudo liberado não muda · gere uma nova versão';
  END IF;
  IF NEW.liberado AND NEW.tipo IN ('negativa', 'recusa') THEN
    IF NEW."liberadoPorAutor" <> 'pessoa' OR NEW."liberadoPorId" IS NULL
       OR NOT assistencia.tem_decisao_humana(NEW."chamadoId", NEW.tipo) THEN
      RAISE EXCEPTION 'assistencia: laudo de % só é liberado por uma pessoa, depois da decisão confirmada', NEW.tipo;
    END IF;
  END IF;
  IF NEW.liberado AND NEW.tipo = 'bancada' AND NOT EXISTS (
    SELECT 1 FROM assistencia.bancada b WHERE b."chamadoId" = NEW."chamadoId" AND b."assinadoEm" IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'assistencia: laudo de bancada só é liberado depois da assinatura do técnico';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS liberacao ON assistencia.laudos;
CREATE TRIGGER liberacao BEFORE INSERT OR UPDATE ON assistencia.laudos
  FOR EACH ROW EXECUTE FUNCTION assistencia.laudo_liberacao();

-- ── 4. bancada: só o técnico assina, e assinado não muda ────────────────────
CREATE OR REPLACE FUNCTION assistencia.bancada_assinatura() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD."assinadoEm" IS NOT NULL THEN
    RAISE EXCEPTION 'assistencia: registro de bancada assinado não muda';
  END IF;
  IF NEW."assinadoPorId" IS NOT NULL OR NEW."assinadoEm" IS NOT NULL THEN
    IF NEW."assinadoPorId" IS NULL OR NEW."assinadoEm" IS NULL THEN
      RAISE EXCEPTION 'assistencia: assinatura exige técnico e data';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM vibravert."Usuario" u WHERE u.id = NEW."assinadoPorId" AND u.papel = 'TECNICO' AND u.ativo
    ) THEN
      RAISE EXCEPTION 'assistencia: só um usuário TECNICO ativo assina laudo de bancada';
    END IF;
    IF coalesce(btrim(NEW.observacao), '') = '' OR NEW."conclusaoFinal" IS NULL THEN
      RAISE EXCEPTION 'assistencia: assinatura exige observação e conclusão definidas';
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS assinatura ON assistencia.bancada;
CREATE TRIGGER assinatura BEFORE INSERT OR UPDATE ON assistencia.bancada
  FOR EACH ROW EXECUTE FUNCTION assistencia.bancada_assinatura();

-- ── RLS: ligado em tudo. A aplicação é dona das tabelas; o resto não entra. ─
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['chamados','respostas','fotos','avaliacoes','decisoes','bancada','laudos','chamadas_ia','conversas','emails'] LOOP
    EXECUTE format('ALTER TABLE assistencia.%I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;

-- ── 6. papel do conector da Claude ──────────────────────────────────────────
-- Criado sem login. A senha entra por fora do repositório:
--   ALTER ROLE claude_conector LOGIN PASSWORD '...';
-- e a URL vai em DATABASE_URL_CLAUDE.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'claude_conector') THEN
    CREATE ROLE claude_conector NOLOGIN;
  END IF;
END $$;

REVOKE ALL ON ALL TABLES IN SCHEMA assistencia FROM claude_conector;
GRANT USAGE ON SCHEMA assistencia TO claude_conector;

-- Leitura: o chamado só pela visão com CPF mascarado.
CREATE OR REPLACE VIEW assistencia.chamados_claude AS
SELECT
  id, protocolo, status, faixa, "regrasVersao", "pendenciaRegra",
  nome,
  CASE
    WHEN length(documento) = 11 THEN '***.' || substr(documento, 4, 3) || '.' || substr(documento, 7, 3) || '-**'
    ELSE substr(documento, 1, 2) || '.***.***/' || substr(documento, 9, 4) || '-**'
  END AS documento,
  canal, "canalConfirmado", usou, recebimento, "nfTexto", "nfNumero", "nfChave", "nfSerie", "nfCnpjEmitente",
  emissao, "emissaoFonte", modelo, tensao, serie, ocorrido, rastreio, "rastreioStatus",
  "enviadoEm", "criadoEm"
FROM assistencia.chamados;

GRANT SELECT ON assistencia.chamados_claude TO claude_conector;
GRANT SELECT ON assistencia.respostas, assistencia.fotos, assistencia.avaliacoes,
                assistencia.decisoes, assistencia.laudos TO claude_conector;
GRANT SELECT ("chamadoId", checklist, "resistenciaOhm", "isolacaoMOhm", "correnteA", pecas,
              observacao, "conclusaoSugerida", "conclusaoFinal", "assinadoEm")
  ON assistencia.bancada TO claude_conector;

-- Escrita: só o que a matriz permite.
GRANT INSERT ON assistencia.decisoes, assistencia.avaliacoes, assistencia.laudos,
                assistencia.chamadas_ia TO claude_conector;
-- Para mudar o status o Postgres exige ler a coluna do WHERE: só id, protocolo e
-- status, nada pessoal. O resto do chamado continua só pela visão mascarada.
GRANT SELECT (id, protocolo, status) ON assistencia.chamados TO claude_conector;
GRANT UPDATE (status, "atualizadoEm") ON assistencia.chamados TO claude_conector;
GRANT UPDATE ("conclusaoSugerida", "atualizadoEm") ON assistencia.bancada TO claude_conector;

-- Políticas do papel da Claude (a aplicação, dona das tabelas, passa por fora).
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['chamados','respostas','fotos','avaliacoes','decisoes','bancada','laudos','chamadas_ia'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS claude_le ON assistencia.%I', t);
    EXECUTE format('CREATE POLICY claude_le ON assistencia.%I FOR SELECT TO claude_conector USING (true)', t);
  END LOOP;
END $$;

DROP POLICY IF EXISTS claude_decide ON assistencia.decisoes;
CREATE POLICY claude_decide ON assistencia.decisoes FOR INSERT TO claude_conector
  WITH CHECK (autor = 'claude' AND "usuarioId" IS NULL
              AND ("decisaoFinal" IS NULL OR "decisaoFinal" NOT IN ('negativa', 'recusa')));

DROP POLICY IF EXISTS claude_avalia ON assistencia.avaliacoes;
CREATE POLICY claude_avalia ON assistencia.avaliacoes FOR INSERT TO claude_conector
  WITH CHECK (origem = 'claude');

-- Rascunho de qualquer laudo; liberar, só os favoráveis e com autor claude.
DROP POLICY IF EXISTS claude_redige ON assistencia.laudos;
CREATE POLICY claude_redige ON assistencia.laudos FOR INSERT TO claude_conector
  WITH CHECK (NOT liberado OR (tipo IN ('autorizacao_troca', 'aprovacao_31_90', 'aprovacao_91')
                               AND "liberadoPorAutor" = 'claude' AND "liberadoPorId" IS NULL));

DROP POLICY IF EXISTS claude_registra_custo ON assistencia.chamadas_ia;
CREATE POLICY claude_registra_custo ON assistencia.chamadas_ia FOR INSERT TO claude_conector WITH CHECK (true);

-- Status: nunca para NEGADO, RECUSADO ou CONCLUIDO.
DROP POLICY IF EXISTS claude_status ON assistencia.chamados;
CREATE POLICY claude_status ON assistencia.chamados FOR UPDATE TO claude_conector
  USING (true) WITH CHECK (status NOT IN ('NEGADO', 'RECUSADO', 'CONCLUIDO'));

DROP POLICY IF EXISTS claude_sugere_bancada ON assistencia.bancada;
CREATE POLICY claude_sugere_bancada ON assistencia.bancada FOR UPDATE TO claude_conector
  USING ("assinadoEm" IS NULL) WITH CHECK ("assinadoEm" IS NULL);

-- ── Storage privado: fotos e PDFs ───────────────────────────────────────────
-- Sem política para anon/authenticated: só a chave de serviço acessa, e o
-- cliente e o portal recebem URL assinada de curta duração.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('assistencia', 'assistencia', false, 15728640,
        ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf'])
ON CONFLICT (id) DO UPDATE SET public = false;
