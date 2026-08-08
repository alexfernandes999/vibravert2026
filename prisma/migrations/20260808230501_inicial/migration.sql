-- CreateEnum
CREATE TYPE "BannerPosicao" AS ENUM ('PRINCIPAL', 'FAIXA_DUPLA', 'TARJA_TOPO');

-- CreateEnum
CREATE TYPE "PedidoStatus" AS ENUM ('AGUARDANDO_PAGAMENTO', 'PAGO', 'SEPARANDO', 'ENVIADO', 'ENTREGUE', 'CANCELADO', 'REEMBOLSADO');

-- CreateEnum
CREATE TYPE "MetodoPagamento" AS ENUM ('PIX', 'CARTAO_CREDITO', 'BOLETO');

-- CreateTable
CREATE TABLE "produtos" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "slugAntigo" TEXT,
    "nome" TEXT NOT NULL,
    "marca" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "ean" TEXT,
    "modelo" TEXT,
    "descricao" TEXT NOT NULL DEFAULT '',
    "metaTitulo" TEXT,
    "metaDescricao" TEXT,
    "preco" DECIMAL(10,2) NOT NULL,
    "precoDe" DECIMAL(10,2),
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "destaque" BOOLEAN NOT NULL DEFAULT false,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    "vazaoMaxima" INTEGER,
    "alturaMaxima" INTEGER,
    "potenciaWatts" INTEGER,
    "voltagem" TEXT,
    "acompanhaBoia" BOOLEAN NOT NULL DEFAULT false,
    "acompanhaKit" BOOLEAN NOT NULL DEFAULT false,
    "pocoPolegadas" INTEGER,
    "saiaProtecao" BOOLEAN NOT NULL DEFAULT false,
    "curvaVazao" INTEGER[],

    CONSTRAINT "produtos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "especificacoes" (
    "id" TEXT NOT NULL,
    "produtoId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "nomeOriginal" TEXT,
    "valor" TEXT NOT NULL,
    "valorNumero" DECIMAL(10,2),
    "unidade" TEXT,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "filtravel" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "especificacoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "imagens" (
    "id" TEXT NOT NULL,
    "produtoId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "alt" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "principal" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "imagens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categorias" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "metaTitulo" TEXT,
    "metaDescricao" TEXT,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "paiId" TEXT,

    CONSTRAINT "categorias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "produtos_categorias" (
    "produtoId" TEXT NOT NULL,
    "categoriaId" TEXT NOT NULL,

    CONSTRAINT "produtos_categorias_pkey" PRIMARY KEY ("produtoId","categoriaId")
);

-- CreateTable
CREATE TABLE "estoques" (
    "produtoId" TEXT NOT NULL,
    "quantidade" INTEGER NOT NULL DEFAULT 0,
    "minimo" INTEGER NOT NULL DEFAULT 5,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "estoques_pkey" PRIMARY KEY ("produtoId")
);

-- CreateTable
CREATE TABLE "banners" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "posicao" "BannerPosicao" NOT NULL DEFAULT 'PRINCIPAL',
    "imagemDesktop" TEXT,
    "imagemMobile" TEXT,
    "alt" TEXT NOT NULL,
    "link" TEXT,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT false,
    "inicioEm" TIMESTAMP(3),
    "fimEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "banners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prateleiras" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "ativa" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "prateleiras_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prateleiras_produtos" (
    "prateleiraId" TEXT NOT NULL,
    "produtoId" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "prateleiras_produtos_pkey" PRIMARY KEY ("prateleiraId","produtoId")
);

-- CreateTable
CREATE TABLE "paginas" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "conteudo" TEXT NOT NULL DEFAULT '',
    "metaTitulo" TEXT,
    "metaDescricao" TEXT,
    "publicada" BOOLEAN NOT NULL DEFAULT false,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "paginas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "redirecionamentos" (
    "id" TEXT NOT NULL,
    "de" TEXT NOT NULL,
    "para" TEXT NOT NULL,
    "tipo" INTEGER NOT NULL DEFAULT 301,
    "acessos" INTEGER NOT NULL DEFAULT 0,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "redirecionamentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clientes" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cpfCnpj" TEXT,
    "telefone" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enderecos" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "cep" TEXT NOT NULL,
    "logradouro" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "complemento" TEXT,
    "bairro" TEXT NOT NULL,
    "cidade" TEXT NOT NULL,
    "uf" CHAR(2) NOT NULL,
    "principal" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "enderecos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pedidos" (
    "id" TEXT NOT NULL,
    "numero" SERIAL NOT NULL,
    "clienteId" TEXT NOT NULL,
    "enderecoId" TEXT NOT NULL,
    "status" "PedidoStatus" NOT NULL DEFAULT 'AGUARDANDO_PAGAMENTO',
    "metodo" "MetodoPagamento" NOT NULL,
    "subtotal" DECIMAL(10,2) NOT NULL,
    "frete" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "desconto" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(10,2) NOT NULL,
    "parcelas" INTEGER NOT NULL DEFAULT 1,
    "mpPagamentoId" TEXT,
    "mpStatus" TEXT,
    "mpDetalhe" TEXT,
    "pagoEm" TIMESTAMP(3),
    "rastreio" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pedidos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pedidos_itens" (
    "id" TEXT NOT NULL,
    "pedidoId" TEXT NOT NULL,
    "produtoId" TEXT NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "precoUnitario" DECIMAL(10,2) NOT NULL,
    "nomeProduto" TEXT NOT NULL,
    "skuProduto" TEXT NOT NULL,

    CONSTRAINT "pedidos_itens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "produtos_slug_key" ON "produtos"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "produtos_slugAntigo_key" ON "produtos"("slugAntigo");

-- CreateIndex
CREATE UNIQUE INDEX "produtos_sku_key" ON "produtos"("sku");

-- CreateIndex
CREATE INDEX "produtos_marca_idx" ON "produtos"("marca");

-- CreateIndex
CREATE INDEX "produtos_ativo_destaque_idx" ON "produtos"("ativo", "destaque");

-- CreateIndex
CREATE INDEX "produtos_voltagem_vazaoMaxima_idx" ON "produtos"("voltagem", "vazaoMaxima");

-- CreateIndex
CREATE INDEX "especificacoes_nome_valor_idx" ON "especificacoes"("nome", "valor");

-- CreateIndex
CREATE UNIQUE INDEX "especificacoes_produtoId_nome_key" ON "especificacoes"("produtoId", "nome");

-- CreateIndex
CREATE INDEX "imagens_produtoId_ordem_idx" ON "imagens"("produtoId", "ordem");

-- CreateIndex
CREATE UNIQUE INDEX "categorias_slug_key" ON "categorias"("slug");

-- CreateIndex
CREATE INDEX "banners_posicao_ativo_ordem_idx" ON "banners"("posicao", "ativo", "ordem");

-- CreateIndex
CREATE UNIQUE INDEX "prateleiras_slug_key" ON "prateleiras"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "paginas_slug_key" ON "paginas"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "redirecionamentos_de_key" ON "redirecionamentos"("de");

-- CreateIndex
CREATE UNIQUE INDEX "clientes_email_key" ON "clientes"("email");

-- CreateIndex
CREATE UNIQUE INDEX "pedidos_numero_key" ON "pedidos"("numero");

-- CreateIndex
CREATE UNIQUE INDEX "pedidos_mpPagamentoId_key" ON "pedidos"("mpPagamentoId");

-- CreateIndex
CREATE INDEX "pedidos_status_criadoEm_idx" ON "pedidos"("status", "criadoEm");

-- AddForeignKey
ALTER TABLE "especificacoes" ADD CONSTRAINT "especificacoes_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "produtos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "imagens" ADD CONSTRAINT "imagens_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "produtos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categorias" ADD CONSTRAINT "categorias_paiId_fkey" FOREIGN KEY ("paiId") REFERENCES "categorias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "produtos_categorias" ADD CONSTRAINT "produtos_categorias_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "produtos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "produtos_categorias" ADD CONSTRAINT "produtos_categorias_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "categorias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estoques" ADD CONSTRAINT "estoques_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "produtos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prateleiras_produtos" ADD CONSTRAINT "prateleiras_produtos_prateleiraId_fkey" FOREIGN KEY ("prateleiraId") REFERENCES "prateleiras"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prateleiras_produtos" ADD CONSTRAINT "prateleiras_produtos_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "produtos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enderecos" ADD CONSTRAINT "enderecos_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_enderecoId_fkey" FOREIGN KEY ("enderecoId") REFERENCES "enderecos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedidos_itens" ADD CONSTRAINT "pedidos_itens_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "pedidos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedidos_itens" ADD CONSTRAINT "pedidos_itens_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "produtos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
