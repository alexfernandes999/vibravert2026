# Publicar na Vercel

## 1. Subir o código

```bash
cd /Users/macbookpro/vibravert-loja
git push -u origin main
```

Se pedir senha, use um **token** (GitHub → Settings → Developer settings →
Personal access tokens → classic, escopo `repo`). Senha de conta o GitHub não
aceita mais.

## 2. Importar na Vercel

[vercel.com/new](https://vercel.com/new) → *Import Git Repository* →
`alexfernandes999/vibravert2026`.

O framework é detectado sozinho. Não altere o comando de build: o `package.json`
já roda `prisma generate` antes do `next build`, que é obrigatório — sem isso o
build falha na Vercel com "Prisma Client não foi gerado".

## 3. Variáveis de ambiente

Em *Settings → Environment Variables*, para **Production**:

| Variável | De onde vem |
|---|---|
| `DATABASE_URL` | copiar do `.env` local (pooler, porta 6543) |
| `DIRECT_URL` | copiar do `.env` local (porta 5432) |
| `NEXT_PUBLIC_SUPABASE_URL` | `.env` local |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `.env` local |
| `SUPABASE_SERVICE_ROLE_KEY` | `.env` local |
| `ADMIN_SENHA` | **gerar uma nova** — a local não deve ir para produção |
| `ADMIN_SEGREDO` | **gerar um novo** |
| `NEXT_PUBLIC_URL` | `https://www.vibravert.com.br` |
| `MP_ACCESS_TOKEN` | quando a credencial chegar |
| `NEXT_PUBLIC_MP_PUBLIC_KEY` | idem |
| `MP_WEBHOOK_SECRET` | idem |

⚠ Enquanto `NEXT_PUBLIC_URL` não apontar para o domínio real, o `robots.txt`
bloqueia o rastreamento inteiro. É proposital: impede que o endereço
`.vercel.app` seja indexado e concorra com a loja.

## 4. Domínio

Só depois de conferir a loja no endereço `.vercel.app`:

*Settings → Domains* → adicionar `www.vibravert.com.br` e `vibravert.com.br`.
A Vercel mostra os valores exatos a configurar. Os registros vão no **painel da
Locaweb**, não no registro.br — e **os nameservers não se tocam**, senão o
e-mail `@vibravert.com.br` cai junto.

## 5. Depois de publicar

- Webhook do Mercado Pago: `https://www.vibravert.com.br/api/webhooks/mercadopago`
- Feed do Merchant Center: `https://www.vibravert.com.br/feed-google`
- Enviar `https://www.vibravert.com.br/sitemap.xml` no Search Console
