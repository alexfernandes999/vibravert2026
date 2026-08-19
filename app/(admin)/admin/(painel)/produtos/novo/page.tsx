import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { registrarAcao } from "@/lib/admin-auth";
import { revalidatePath } from "next/cache";
import type { TipoProduto } from "@prisma/client";
import { FotosNovoProduto } from "@/components/fotos-novo-produto";

export const dynamic = "force-dynamic";

/**
 * Cadastrar produto na mão.
 *
 * Os 85 do catálogo entraram por importação, e até agora não havia como
 * incluir o 86º sem mexer no banco. Uma peça nova que a fábrica passa a
 * vender não pode depender de alguém abrir um terminal.
 *
 * A tela pede só o que impede o produto de existir. Curva de vazão, ficha
 * técnica e fotos entram depois, na tela de edição · exigir tudo de uma vez
 * faz a pessoa desistir no meio e não cadastrar nada.
 */

/**
 * Endereço a partir do nome.
 *
 * O SKU vai no fim porque nome repete · "Amortecedor" existe para três
 * modelos, e dois produtos não podem disputar a mesma URL.
 */
function endereco(nome: string, sku: string) {
  const limpo = (t: string) =>
    t
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  return `${limpo(nome)}-${limpo(sku)}`.slice(0, 110);
}

async function criar(dados: FormData) {
  "use server";

  const nome = String(dados.get("nome") ?? "").trim();
  const sku = String(dados.get("sku") ?? "").trim().toUpperCase();
  const preco = Number(String(dados.get("preco") ?? "").replace(",", "."));

  if (!nome || !sku || !Number.isFinite(preco) || preco <= 0) {
    redirect("/admin/produtos/novo?erro=Preencha nome, SKU e um preço válido.");
  }

  const repetido = await prisma.produto.findUnique({ where: { sku }, select: { id: true } });
  if (repetido) {
    redirect(`/admin/produtos/novo?erro=Já existe produto com o SKU ${sku}.&id=${repetido.id}`);
  }

  const de = Number(String(dados.get("precoDe") ?? "").replace(",", "."));
  const num = (c: string) => {
    const v = Number(String(dados.get(c) ?? ""));
    return Number.isFinite(v) && v > 0 ? Math.round(v) : null;
  };

  const p = await prisma.produto.create({
    data: {
      nome,
      sku,
      slug: endereco(nome, sku),
      marca: String(dados.get("marca") ?? "Vibra Vert").trim() || "Vibra Vert",
      tipo: (String(dados.get("tipo") ?? "PECA") as TipoProduto),
      preco,
      precoDe: Number.isFinite(de) && de > preco ? de : null,
      descricao: String(dados.get("descricao") ?? "").trim(),
      voltagem: String(dados.get("voltagem") ?? "").trim() || null,
      vazaoMaxima: num("vazaoMaxima"),
      pocoPolegadas: num("pocoPolegadas"),
      pesoGramas: num("pesoGramas"),
      // Nasce desligado. Produto sem foto e sem ficha no ar é pior do que
      // produto que ainda não existe · quem publica é quem terminou.
      ativo: false,
      estoque: { create: { quantidade: num("estoque") ?? 0 } },
      imagens: {
        create: String(dados.get("fotos") ?? "")
          .split("|")
          .filter(Boolean)
          .map((url, i) => ({ url, alt: nome, ordem: i, principal: i === 0 })),
      },
    },
  });

  await registrarAcao(`cadastrou o produto ${sku}`);
  revalidatePath("/admin/produtos");
  redirect(`/admin/produtos/${p.id}`);
}

function Campo({
  nome,
  rotulo,
  dica,
  tipo = "text",
  obrigatorio,
  valor,
}: {
  nome: string;
  rotulo: string;
  dica?: string;
  tipo?: string;
  obrigatorio?: boolean;
  valor?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-baseline gap-1.5 text-[12.5px] font-bold">
        {rotulo}
        {obrigatorio && <span className="text-critico">*</span>}
        {dica && <span className="font-medium text-mudo">{dica}</span>}
      </span>
      <input
        name={nome}
        type={tipo}
        defaultValue={valor}
        inputMode={tipo === "number" ? "decimal" : undefined}
        className="w-full rounded-lg border border-linha-2 bg-superficie px-3 py-2.5 text-[14px]"
      />
    </label>
  );
}

export default async function NovoProduto({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; id?: string }>;
}) {
  const { erro, id } = await searchParams;

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <Link href="/admin/produtos" className="text-[12.5px] font-bold text-marca">
        ← Voltar aos produtos
      </Link>

      <h1 className="mt-3 text-[26px] font-extrabold tracking-tight">Novo produto</h1>
      <p className="mt-1.5 text-[14.5px] text-tinta-2">
        Preencha o essencial. O produto nasce <b>desativado</b> · a ficha técnica completa
        você acerta na tela seguinte, e publica quando estiver pronto.
      </p>

      {erro && (
        <p className="mt-4 rounded-lg border-l-[3px] border-critico bg-critico/[0.06] px-4 py-3 text-[13.5px] text-tinta-2">
          {erro}{" "}
          {id && (
            <Link href={`/admin/produtos/${id}`} className="font-bold text-marca underline">
              abrir o produto existente
            </Link>
          )}
        </p>
      )}

      <form action={criar} className="mt-6 grid gap-4">
        <Campo nome="nome" rotulo="Nome do produto" obrigatorio dica="como aparece na loja" />

        <div className="grid gap-4 sm:grid-cols-2">
          <Campo nome="sku" rotulo="SKU" obrigatorio dica="o mesmo código do Bling" />
          <Campo nome="marca" rotulo="Marca" valor="Vibra Vert" />
        </div>

        <label className="block">
          <span className="mb-1.5 block text-[12.5px] font-bold">Tipo</span>
          <select
            name="tipo"
            defaultValue="PECA"
            className="w-full rounded-lg border border-linha-2 bg-superficie px-3 py-2.5 text-[14px] font-semibold"
          >
            <option value="BOMBA">Bomba · frete grátis sempre</option>
            <option value="PECA">Peça · paga frete</option>
            <option value="KIT_AVULSO">Kit avulso · paga frete</option>
            <option value="ACESSORIO">Acessório · paga frete</option>
          </select>
          <span className="mt-1 block text-[11.5px] text-mudo">
            É isto que decide o frete grátis. Marcar peça como bomba faz a loja pagar o frete
            de um item de trinta reais.
          </span>
        </label>

        <div className="grid gap-4 sm:grid-cols-3">
          <Campo nome="preco" rotulo="Preço" obrigatorio dica="R$" />
          <Campo nome="precoDe" rotulo="Preço de" dica="riscado, opcional" />
          <Campo nome="estoque" rotulo="Estoque" tipo="number" />
        </div>

        <FotosNovoProduto />

        <label className="block">
          <span className="mb-1.5 block text-[12.5px] font-bold">Descrição</span>
          <textarea
            name="descricao"
            rows={5}
            className="w-full rounded-lg border border-linha-2 bg-superficie px-3 py-2.5 text-[14px]"
          />
        </label>

        <fieldset className="rounded-caixa border border-linha p-4">
          <legend className="px-1.5 text-[12px] font-extrabold uppercase tracking-wide text-mudo">
            Só para bomba
          </legend>
          <div className="grid gap-4 sm:grid-cols-3">
            <Campo nome="voltagem" rotulo="Voltagem" dica="220V, 110/127V" />
            <Campo nome="vazaoMaxima" rotulo="Vazão máxima" tipo="number" dica="L/h" />
            <Campo nome="pocoPolegadas" rotulo="Poço" tipo="number" dica="polegadas" />
          </div>
        </fieldset>

        <Campo
          nome="pesoGramas"
          rotulo="Peso da caixa"
          tipo="number"
          dica="gramas · sem isto o frete sai errado"
        />

        <div>
          <button className="rounded-lg bg-marca px-5 py-3 text-[14.5px] font-extrabold text-white">
            Cadastrar e continuar
          </button>
        </div>
      </form>
    </div>
  );
}
