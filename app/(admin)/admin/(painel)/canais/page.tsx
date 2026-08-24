import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata = { title: "Canais e feeds" };

/**
 * Onde a loja se conecta com o mundo de fora.
 *
 * O feed do Google, o sitemap e os códigos de verificação de domínio existem
 * há semanas · o que faltava era um lugar onde alguém pudesse copiar o
 * endereço sem perguntar. Integração pronta que ninguém sabe que existe é
 * integração que não existe.
 *
 * A tela mostra o estado de verdade: quantas ofertas o feed tem agora, se o
 * código de verificação já foi colado, e qual domínio está no ar. Não adianta
 * dizer "está pronto" · tem de dizer quantas.
 */

function Bloco({
  o,
  para,
  children,
}: {
  o: string;
  para: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-caixa border border-linha bg-superficie p-5">
      <h2 className="text-[16px] font-extrabold">{o}</h2>
      <p className="mt-1 text-[13.5px] leading-relaxed text-tinta-2">{para}</p>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Endereco({ url }: { url: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener"
      className="num block break-all rounded-lg border border-linha bg-fundo px-3 py-2.5 text-[12.5px] font-semibold text-marca hover:underline"
    >
      {url}
    </a>
  );
}

function Estado({ ok, sim, nao }: { ok: boolean; sim: string; nao: string }) {
  return (
    <p
      className={`mt-2.5 rounded-lg border-l-[3px] px-3.5 py-2.5 text-[12.5px] leading-relaxed ${
        ok ? "border-bom bg-bom/[0.06]" : "border-atencao bg-atencao/[0.07]"
      }`}
    >
      <b className={ok ? "text-bom" : "text-atencao"}>{ok ? "Feito." : "Falta."}</b>{" "}
      <span className="text-tinta-2">{ok ? sim : nao}</span>
    </p>
  );
}

export default async function Canais() {
  const base = process.env.NEXT_PUBLIC_URL || "https://vibravert-loja.vercel.app";

  const [ofertas, semFoto, semPeso] = await Promise.all([
    prisma.produto.count({ where: { ativo: true, imagens: { some: {} } } }),
    prisma.produto.count({ where: { ativo: true, imagens: { none: {} } } }),
    prisma.produto.count({ where: { ativo: true, pesoGramas: null } }),
  ]);

  const proprio = !base.includes("vercel.app");

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <h1 className="text-[26px] font-extrabold tracking-tight">Canais e feeds</h1>
      <p className="mt-1.5 max-w-2xl text-[14.5px] leading-relaxed text-tinta-2">
        Os endereços que o Google, o Instagram e as ferramentas de busca leem. Está tudo pronto
        do lado da loja · o que falta é ligar cada um na conta certa.
      </p>

      <div className="mt-6 grid gap-4">
        <Bloco
          o="Feed do Google Shopping"
          para="A lista de produtos que o Merchant Center lê para montar os anúncios e as vitrines gratuitas do Google. Atualiza sozinho a cada hora."
        >
          <Endereco url={`${base}/feed-google`} />
          <p className="mt-2 text-[12.5px] text-tinta-2">
            <b className="num">{ofertas}</b> ofertas prontas
            {semFoto > 0 && (
              <>
                {" · "}
                <b className="num text-atencao">{semFoto}</b> fora do feed por não ter foto
              </>
            )}
            {semPeso > 0 && (
              <>
                {" · "}
                <b className="num text-atencao">{semPeso}</b> sem peso da caixa
              </>
            )}
          </p>
          <p className="mt-1.5 text-[12px] leading-relaxed text-mudo">
            O feed manda o preço cheio, nunca o do PIX · o Google compara o feed com a página, e
            anunciar desconto que só vale num meio de pagamento é a causa nº 1 de reprovação.
          </p>
        </Bloco>

        <Bloco
          o="Sitemap"
          para="O mapa do site para o Google. Vai no Search Console, uma vez só."
        >
          <Endereco url={`${base}/sitemap.xml`} />
        </Bloco>

        <Bloco
          o="Verificação de domínio"
          para="O Search Console, o Merchant Center e o catálogo do Instagram só falam com quem prova ser dono do endereço. Cada um dá um código para colar."
        >
          <Estado
            ok={Boolean(process.env.NEXT_PUBLIC_VERIFICACAO_GOOGLE)}
            sim="O código do Google já está na página."
            nao="Assim que o Google der o código, ele entra na variável NEXT_PUBLIC_VERIFICACAO_GOOGLE · não precisa mexer em código."
          />
          <Estado
            ok={Boolean(process.env.NEXT_PUBLIC_VERIFICACAO_META)}
            sim="O código da Meta já está na página."
            nao="O código do catálogo do Instagram entra em NEXT_PUBLIC_VERIFICACAO_META."
          />
        </Bloco>

        <Bloco
          o="Domínio"
          para="É daqui que saem todos os endereços acima, e é este domínio que precisa ser verificado nas contas."
        >
          <Endereco url={base} />
          <Estado
            ok={proprio}
            sim="A loja está no domínio próprio."
            nao="A loja ainda está no endereço da Vercel. O Merchant Center e o Search Console funcionam assim, mas tudo o que for construído aqui precisa ser refeito quando o domínio mudar · vale ligar as contas depois da virada, não antes."
          />
        </Bloco>
      </div>
    </div>
  );
}
