# Loja Oficial Vibra Vert

E-commerce D2C das marcas próprias **Vibra Vert** e **Rymer** — bombas submersas
vibratórias. Loja nova, em endereço próprio, sem tocar na `vibravert.com.br`
atual (VTEX), que segue vendendo o catálogo de revenda.

## Por que uma loja separada

O catálogo atual tem 3.852 produtos, dos quais **48 são de marca própria**
(31 Vibra Vert + 17 Rymer) — 1,2% do total. Reconstruir a loja inteira para
vender essa fração não se justificava, e migrar o domínio arriscaria o tráfego
orgânico das outras 3.800 páginas.

A loja nova nasce limpa: sem risco de SEO na migração, em compensação começa do
zero no Google. O crescimento vem de conteúdo técnico, filtros por especificação
e Google Shopping.

## Stack

| | |
|---|---|
| Framework | Next.js 15 · App Router · React 19 |
| Estilo | Tailwind CSS 4 |
| Banco | Postgres no Supabase (`sa-east-1`), schema `vibravert` |
| ORM | Prisma 6 |
| Pagamento | Mercado Pago — checkout transparente (PIX, cartão, boleto) |

O banco é **compartilhado com o projeto Multiplica**, isolado no schema
`vibravert` para que as tabelas nunca colidam. Quando a loja faturar, a intenção
é mover para um projeto Supabase próprio — e, quando isso acontecer, os dados de
cliente e pedido saem junto sem precisar desembaraçar nada.

## Modelo de dados

Além do catálogo e das vendas, o schema cobre três coisas que costumam ficar de
fora e depois viram chamado para o desenvolvedor:

- **`Banner`** — vitrine editável pelo cliente, com versão desktop e mobile,
  ordem, e datas de início e fim. A promoção sobe sozinha na data marcada.
- **`Especificacao`** — vazão, altura manométrica, voltagem, potência. Cadastradas
  uma vez, alimentam a ficha técnica, os filtros da listagem **e** os atributos
  do feed do Google Shopping. É o que evita catálogo desencontrado, causa nº 1
  de produto reprovado no Merchant Center.
- **`Redirecionamento`** — links antigos circulam em anúncios e no WhatsApp dos
  revendedores muito depois de a página mudar.

## Catálogo

Extraído da API pública da VTEX e normalizado em `data/produtos.json`.

| | |
|---|---|
| Produtos | 48 (1 SKU cada, sem variações) |
| Imagens | ~6,4 por produto, em resolução original |
| Com `mpn` (RefId) | 100% |
| Com `ean` | 1 de 48 |
| Sem descrição | 2 |

### Sobre o GTIN

Quase nenhum produto de marca própria tem código de barras cadastrado. O feed do
Shopping sobe com `brand` + `mpn` e `identifier_exists: false`, que o Google
aceita para fabricante que não emite GTIN. Vale registrar a faixa na **GS1 Brasil**:
produto com GTIN rende mais no Shopping.

### Sobre o estoque

Hoje todos os itens estão marcados com 99.999 unidades na VTEX — ou seja, o
estoque não é controlado. O alerta de estoque baixo do painel só funciona quando
houver quantidade real, via ERP ou lançamento manual.

## Rodando localmente

```bash
npm install
cp .env.example .env      # preencher as credenciais
npx prisma migrate dev
npm run db:seed           # carrega os 48 produtos de data/produtos.json
npm run dev
```

`DATABASE_URL` usa o pooler (6543) para a aplicação; `DIRECT_URL` usa a conexão
direta (5432) e é obrigatória para as migrações — o pooler de transações não
executa DDL.

As imagens originais ficam fora do git (`data/imagens/`) e são publicadas no
Supabase Storage.
