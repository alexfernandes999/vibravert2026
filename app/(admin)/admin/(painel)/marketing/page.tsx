import { prisma } from "@/lib/prisma";
import { FormMarketing } from "@/components/form-marketing";

export const dynamic = "force-dynamic";
export const metadata = { title: "Marketing" };

/**
 * As chaves de quem cuida do tráfego, editáveis sem deploy.
 *
 * É a diferença entre uma integração e um painel. A agência troca um pixel
 * numa terça de manhã · se para isso precisar de nós, o pixel não se troca e
 * a campanha fica quebrada até alguém ter tempo.
 */
export default async function Marketing() {
  const [m, comFoto, base] = await Promise.all([
    prisma.marketing.findUnique({ where: { id: "unico" } }),
    prisma.produto.count({ where: { ativo: true, imagens: { some: {} } } }),
    Promise.resolve(process.env.NEXT_PUBLIC_URL || "https://www.vibravert.com.br"),
  ]);

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <h1 className="text-[26px] font-extrabold tracking-tight">Marketing</h1>
      <p className="mt-1.5 max-w-2xl text-[14.5px] leading-relaxed text-tinta-2">
        As chaves de quem cuida do tráfego. O que for salvo aqui vale na loja em minutos ·
        sem precisar de programador e sem publicar nada.
      </p>

      <FormMarketing
        pixelMeta={m?.pixelMeta ?? ""}
        gtmId={m?.gtmId ?? ""}
        googleAds={m?.googleAds ?? ""}
        rotuloCompra={m?.rotuloCompra ?? ""}
        testeCapi={m?.testeCapi ?? ""}
        temToken={Boolean(m?.tokenCapi)}
        ativo={m?.ativo ?? true}
        base={base}
        ofertas={comFoto}
        atualizadoEm={m?.atualizadoEm?.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) ?? null}
      />
    </div>
  );
}
