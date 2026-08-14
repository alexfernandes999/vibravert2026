import Link from "next/link";
import type { Versao } from "@prisma/client";
import { brl } from "@/lib/formato";

/**
 * As quatro montagens da mesma bomba.
 *
 * Eram quatro produtos separados disputando a mesma busca no Google, cada um
 * com um quarto das avaliações e dos links. Viram versões de um produto só:
 * uma página forte no lugar de quatro fracas — e o comprador para de escolher
 * entre quatro resultados quase idênticos sem entender a diferença.
 */
const DESCRICAO: Record<Versao, { titulo: string; explica: string }> = {
  BOMBA: {
    titulo: "Só a bomba",
    explica: "Para quem já tem a instalação pronta e vai só substituir.",
  },
  BOIA: {
    titulo: "+ Boia de nível",
    explica: "Liga e desliga sozinha. Protege contra rodar sem água.",
  },
  KIT: {
    titulo: "+ Kit de manutenção",
    explica: "Peças de desgaste extras. Quem mora longe não fica sem água.",
  },
  BOIA_KIT: {
    titulo: "+ Boia e kit",
    explica: "Instalação completa, automática e com reposição na mão.",
  },
};

const ORDEM: Versao[] = ["BOMBA", "BOIA", "KIT", "BOIA_KIT"];

export type ItemVersao = {
  slug: string;
  versao: Versao;
  preco: unknown;
};

export function SeletorVersao({
  versoes,
  atual,
}: {
  versoes: ItemVersao[];
  atual: Versao;
}) {
  if (versoes.length < 2) return null;

  const base = Math.min(...versoes.map((v) => Number(v.preco)));
  const ordenadas = [...versoes].sort((a, b) => ORDEM.indexOf(a.versao) - ORDEM.indexOf(b.versao));

  // Só avisa quando as duas montagens realmente empatam: se um dia o preço
  // mudar, a frase some sozinha em vez de virar mentira na vitrine.
  const boia = versoes.find((v) => v.versao === "BOIA");
  const kit = versoes.find((v) => v.versao === "KIT");
  const mesmoPreco = Boolean(boia && kit && Number(boia.preco) === Number(kit.preco));

  return (
    <section className="mt-5">
      <h2 className="text-[13px] font-extrabold tracking-tight">
        Escolha a versão
        <span className="ml-2 font-medium text-mudo">mesma bomba, quatro montagens</span>
      </h2>

      <ul className="mt-2.5 grid gap-2 sm:grid-cols-2">
        {ordenadas.map((v) => {
          const d = DESCRICAO[v.versao];
          const dif = Number(v.preco) - base;
          const ativo = v.versao === atual;

          return (
            <li key={v.slug}>
              <Link
                href={`/produto/${v.slug}`}
                aria-current={ativo ? "true" : undefined}
                className={`flex h-full flex-col rounded-caixa border p-3 transition ${
                  ativo
                    ? "border-[1.5px] border-ouro bg-ouro/10"
                    : "border-linha bg-superficie hover:border-marca-linha"
                }`}
              >
                <span className="flex items-baseline gap-2">
                  <span className="text-[13px] font-extrabold">{d.titulo}</span>
                  <span className="num ml-auto text-[12.5px] font-bold">
                    {dif > 0 ? `+ ${brl(dif)}` : brl(Number(v.preco))}
                  </span>
                </span>
                <span className="mt-1 text-[11.8px] leading-snug text-mudo">{d.explica}</span>
              </Link>
            </li>
          );
        })}
      </ul>

      {/* Boia e kit custam o mesmo, e preço igual em opções diferentes parece
          erro de cadastro. Dizer que é de propósito evita a dúvida que trava a
          compra — e ainda transforma a coincidência em argumento. */}
      {mesmoPreco && (
        <p className="mt-2.5 text-[12.3px] font-semibold text-tinta-2">
          Boia <strong className="font-extrabold">ou</strong> kit de manutenção · mesmo preço,
          escolha o seu.
        </p>
      )}
    </section>
  );
}
