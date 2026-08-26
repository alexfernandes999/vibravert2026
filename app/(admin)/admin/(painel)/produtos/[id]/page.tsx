import Link from "next/link";
import { GaleriaProduto } from "@/components/galeria-produto";
import { Suspense } from "react";
import { SeloBling } from "@/components/selo-bling";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { registrarAcao } from "@/lib/admin-auth";
import { brl } from "@/lib/formato";
import type { TipoProduto } from "@prisma/client";

export const dynamic = "force-dynamic";

/**
 * Ficha do produto no painel.
 *
 * Só o que o comercial precisa mexer no dia a dia: preço, textos, situação e o
 * selo de líder. Especificação técnica e curva de vazão ficam em somente
 * leitura de propósito — vêm da embalagem do fabricante, e um número editado à
 * mão aqui vira bomba errada recomendada pela calculadora.
 */
/** Campo em branco vira null, e não zero · zero é um número, ausência não. */
function inteiro(v: FormDataEntryValue | null) {
  const n = Number(String(v ?? "").trim());
  return String(v ?? "").trim() && Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

async function salvar(id: string, dados: FormData) {
  "use server";

  const preco = Number(String(dados.get("preco") ?? "").replace(",", "."));
  const precoDe = Number(String(dados.get("precoDe") ?? "").replace(",", "."));

  await prisma.produto.update({
    where: { id },
    data: {
      nome: String(dados.get("nome") ?? "").trim(),
      preco: Number.isFinite(preco) && preco > 0 ? preco : undefined,
      precoDe: Number.isFinite(precoDe) && precoDe > 0 ? precoDe : null,
      descricao: String(dados.get("descricao") ?? ""),
      metaTitulo: String(dados.get("metaTitulo") ?? "").trim() || null,
      metaDescricao: String(dados.get("metaDescricao") ?? "").trim() || null,
      ativo: dados.get("ativo") === "on",
      destaque: dados.get("destaque") === "on",

      // Ficha comercial. Diferente da técnica logo abaixo: estes são dados que
      // a fábrica conhece e muda · a saia sai de linha, a peça troca de caixa.
      tipo: String(dados.get("tipo") ?? "BOMBA") as TipoProduto,
      saiaProtecao: dados.get("saiaProtecao") === "on",
      voltagem: String(dados.get("voltagem") ?? "").trim() || null,
      vazaoMaxima: inteiro(dados.get("vazaoMaxima")),
      pocoPolegadas: inteiro(dados.get("pocoPolegadas")),
      pesoGramas: inteiro(dados.get("pesoGramas")),
    },
  });

  await registrarAcao("editou o produto");

  revalidatePath("/admin/produtos");
  revalidatePath("/", "layout");
  redirect("/admin/produtos?salvo=1");
}

export default async function EditarProduto({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await prisma.produto.findUnique({
    where: { id },
    include: {
      imagens: { orderBy: { ordem: "asc" } },
      especificacoes: { orderBy: { ordem: "asc" } },
      estoque: true,
    },
  });
  if (!p) notFound();

  return (
    <div className="p-6">
      <Link href="/admin/produtos" className="text-[12.5px] font-bold text-marca">
        ← Voltar aos produtos
      </Link>

      <div className="mt-3 flex flex-wrap items-baseline gap-3">
        <h1 className="text-xl font-extrabold tracking-tight">{p.nome}</h1>
        <span className="num text-[12px] font-semibold text-mudo">{p.sku}</span>
        <Link
          href={`/produto/${p.slug}`}
          target="_blank"
          className="ml-auto rounded-lg border border-linha bg-superficie px-3 py-1.5 text-[12.5px] font-bold text-marca"
        >
          Ver na loja ↗
        </Link>
      </div>

      <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,420px)_1fr]">
        <div>
          <GaleriaProduto
            produtoId={p.id}
            fotos={p.imagens.map((i) => ({ id: i.id, url: i.url, alt: i.alt, principal: i.principal }))}
          />
          {/* A conferência sai do Bling e não pode segurar a tela · quem abriu
              veio editar o produto, não esperar uma API de terceiro. */}
          <Suspense fallback={null}>
            <SeloBling sku={p.sku} />
          </Suspense>
        </div>

        <form action={salvar.bind(null, p.id)} className="grid gap-4">
          <Campo nome="nome" rotulo="Nome do produto" valor={p.nome} />

          <div className="grid gap-4 sm:grid-cols-2">
            <Campo nome="preco" rotulo="Preço" valor={String(p.preco)} dica="R$" />
            <Campo
              nome="precoDe"
              rotulo="Preço de"
              valor={p.precoDe ? String(p.precoDe) : ""}
              dica="opcional, aparece riscado"
            />
          </div>

          <label className="block">
            <span className="mb-1.5 block text-[12px] font-bold">Descrição</span>
            <textarea
              name="descricao"
              defaultValue={p.descricao}
              rows={6}
              className="w-full rounded-lg border border-linha-2 bg-superficie px-3 py-2.5 text-[13px] leading-relaxed"
            />
          </label>

          <Campo nome="metaTitulo" rotulo="Título no Google" valor={p.metaTitulo ?? ""} dica="até 60 caracteres" />
          <label className="block">
            <span className="mb-1.5 block text-[12px] font-bold">
              Descrição no Google <span className="font-medium text-mudo">(até 155 caracteres)</span>
            </span>
            <textarea
              name="metaDescricao"
              defaultValue={p.metaDescricao ?? ""}
              rows={3}
              className="w-full rounded-lg border border-linha-2 bg-superficie px-3 py-2.5 text-[13px]"
            />
          </label>

          <fieldset className="rounded-caixa border border-linha bg-superficie p-4">
            <legend className="px-1.5 text-[11.5px] font-extrabold uppercase tracking-wide text-mudo">
              Ficha comercial
            </legend>

            <label className="block">
              <span className="mb-1.5 block text-[12.5px] font-bold">Tipo</span>
              <select
                name="tipo"
                defaultValue={p.tipo}
                className="w-full rounded-lg border border-linha-2 bg-superficie px-3 py-2.5 text-[13.5px] font-semibold"
              >
                <option value="BOMBA">Bomba · frete grátis sempre</option>
                <option value="PECA">Peça · paga frete</option>
                <option value="KIT_AVULSO">Kit avulso · paga frete</option>
                <option value="ACESSORIO">Acessório · paga frete</option>
              </select>
            </label>

            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <label className="block">
                <span className="mb-1.5 block text-[12.5px] font-bold">Voltagem</span>
                <input
                  name="voltagem"
                  defaultValue={p.voltagem ?? ""}
                  placeholder="220V, 110/127V"
                  className="w-full rounded-lg border border-linha-2 bg-superficie px-3 py-2.5 text-[13.5px]"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 flex items-baseline gap-1.5 text-[12.5px] font-bold">
                  Vazão máxima <span className="font-medium text-mudo">L/h</span>
                </span>
                <input
                  name="vazaoMaxima"
                  inputMode="numeric"
                  defaultValue={p.vazaoMaxima ?? ""}
                  className="num w-full rounded-lg border border-linha-2 bg-superficie px-3 py-2.5 text-[13.5px]"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 flex items-baseline gap-1.5 text-[12.5px] font-bold">
                  Poço <span className="font-medium text-mudo">polegadas</span>
                </span>
                <input
                  name="pocoPolegadas"
                  inputMode="numeric"
                  defaultValue={p.pocoPolegadas ?? ""}
                  className="num w-full rounded-lg border border-linha-2 bg-superficie px-3 py-2.5 text-[13.5px]"
                />
              </label>
            </div>

            <label className="mt-3 flex cursor-pointer items-start gap-2.5">
              <input
                type="checkbox"
                name="saiaProtecao"
                defaultChecked={p.saiaProtecao}
                className="mt-0.5 h-4 w-4 accent-marca"
              />
              <span>
                <span className="block text-[13px] font-bold">Com saia de proteção lateral</span>
                <span className="block text-[11.5px] leading-snug text-mudo">
                  A borracha que envolve o corpo e deixa a bomba trabalhar ajustada num poço de 6&quot;
                  sem bater nas paredes. Aparece no cartão do produto, na ficha e na calculadora.
                </span>
              </span>
            </label>

            <label className="mt-3 block sm:max-w-[220px]">
              <span className="mb-1.5 flex items-baseline gap-1.5 text-[12.5px] font-bold">
                Peso da caixa <span className="font-medium text-mudo">gramas</span>
              </span>
              <input
                name="pesoGramas"
                inputMode="numeric"
                defaultValue={p.pesoGramas ?? ""}
                className="num w-full rounded-lg border border-linha-2 bg-superficie px-3 py-2.5 text-[13.5px]"
              />
            </label>

            <p className="mt-3 rounded-lg border-l-[3px] border-atencao bg-atencao/[0.07] px-3.5 py-2.5 text-[12px] leading-relaxed text-tinta-2">
              <b className="text-atencao">Vazão e poço alimentam a calculadora.</b> São eles que
              decidem qual bomba a loja recomenda para a profundidade que o cliente digita ·
              um número trocado aqui vira bomba errada vendida. E sem peso, o frete não calcula.
            </p>
          </fieldset>

          <div className="flex flex-wrap gap-5 rounded-caixa border border-linha bg-superficie p-4">
            <label className="flex cursor-pointer items-center gap-2.5 text-[13px] font-bold">
              <input type="checkbox" name="ativo" defaultChecked={p.ativo} className="h-4 w-4 accent-marca" />
              À venda na loja
            </label>
            <label className="flex cursor-pointer items-center gap-2.5 text-[13px] font-bold">
              <input type="checkbox" name="destaque" defaultChecked={p.destaque} className="h-4 w-4 accent-ouro" />
              <span className="text-ouro-escuro">★</span> Líder em vendas
            </label>
          </div>

          <button className="w-fit rounded-lg bg-marca px-6 py-3 text-[13.5px] font-bold text-white shadow-lg shadow-marca/25 transition active:scale-[0.98]">
            Salvar alterações
          </button>

          <section className="mt-2 rounded-caixa border border-linha bg-superficie-2 p-4">
            <h2 className="text-[12.5px] font-extrabold">Ficha técnica</h2>
            <p className="mt-0.5 text-[11.5px] leading-snug text-mudo">
              Vem da embalagem do fabricante e não se edita aqui. Um número trocado à mão faria a
              calculadora recomendar a bomba errada.
            </p>
            <dl className="mt-3 grid gap-x-6 gap-y-1.5 text-[12px] sm:grid-cols-2">
              {p.especificacoes
                .filter((e) => e.nome !== "Curva de vazão")
                .map((e) => (
                  <div key={e.id} className="flex gap-2 border-b border-linha py-1">
                    <dt className="text-mudo">{e.nome}</dt>
                    <dd className="num ml-auto text-right font-bold">{e.valor.slice(0, 34)}</dd>
                  </div>
                ))}
            </dl>
          </section>
        </form>
      </div>
    </div>
  );
}

function Campo({ nome, rotulo, valor, dica }: { nome: string; rotulo: string; valor: string; dica?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12px] font-bold">
        {rotulo}
        {dica && <span className="ml-1.5 font-medium text-mudo">({dica})</span>}
      </span>
      <input
        name={nome}
        defaultValue={valor}
        className="w-full rounded-lg border border-linha-2 bg-superficie px-3 py-2.5 text-[13.5px] font-semibold"
      />
    </label>
  );
}
