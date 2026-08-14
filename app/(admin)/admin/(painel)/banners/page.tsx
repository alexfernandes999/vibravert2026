import { prisma } from "@/lib/prisma";
import { registrarAcao } from "@/lib/admin-auth";
import { revalidatePath } from "next/cache";
import { CampoImagem } from "@/components/campo-imagem";
import type { BannerPosicao } from "@prisma/client";

export const dynamic = "force-dynamic";

const POSICOES: { v: BannerPosicao; r: string; d: string; m?: string }[] = [
  { v: "TARJA_TOPO", r: "Tarja do topo", d: "A faixa acima do cabeçalho. É o espaço mais visto da loja.", m: "só texto" },
  { v: "PRINCIPAL", r: "Banner principal", d: "O bloco grande da página inicial.", m: "2098 × 750 px" },
  { v: "FAIXA_MEIO", r: "Faixa do meio", d: "O bloco largo entre as prateleiras.", m: "2098 × 520 px" },
  { v: "FAIXA_DUPLA", r: "Faixas duplas", d: "Os dois blocos lado a lado, no meio da home.", m: "1040 × 520 px" },
];

async function alternar(id: string, ativo: boolean) {
  "use server";
  await prisma.banner.update({ where: { id }, data: { ativo } });
  await registrarAcao("mexeu nos banners");
  revalidatePath("/", "layout");
}

async function salvar(dados: FormData) {
  "use server";
  const id = String(dados.get("id") ?? "");
  const titulo = String(dados.get("titulo") ?? "").trim();
  const alt = String(dados.get("alt") ?? "").trim();
  const link = String(dados.get("link") ?? "").trim() || null;
  const inicio = String(dados.get("inicioEm") ?? "");
  const fim = String(dados.get("fimEm") ?? "");
  if (!titulo || !alt) return;

  // Campo vazio apaga a imagem de propósito · é o botão "Remover" do formulário.
  const imagemDesktop = String(dados.get("imagemDesktop") ?? "").trim() || null;
  const imagemMobile = String(dados.get("imagemMobile") ?? "").trim() || null;

  const campos = {
    titulo,
    alt,
    link,
    imagemDesktop,
    imagemMobile,
    inicioEm: inicio ? new Date(inicio) : null,
    fimEm: fim ? new Date(fim) : null,
  };

  if (id) await prisma.banner.update({ where: { id }, data: campos });
  else
    await prisma.banner.create({
      data: { ...campos, posicao: String(dados.get("posicao")) as BannerPosicao, ativo: false },
    });

  revalidatePath("/", "layout");
  revalidatePath("/admin/banners");
}

export default async function Banners() {
  const banners = await prisma.banner.findMany({ orderBy: [{ posicao: "asc" }, { ordem: "asc" }] });
  const agora = new Date();

  return (
    <div className="p-6">
      <h1 className="text-xl font-extrabold tracking-tight">Banners e vitrine</h1>
      <p className="mt-1 max-w-2xl text-[13px] text-mudo">
        Trocar banner não exige programador. Com data de início e fim, a promoção sobe sozinha na
        data marcada · dá para deixar tudo pronto antes e não depender de alguém lembrar de ligar.
      </p>

      {POSICOES.map((pos) => {
        const doGrupo = banners.filter((b) => b.posicao === pos.v);
        return (
          <section key={pos.v} className="mt-6">
            <h2 className="text-[14px] font-extrabold">{pos.r}</h2>
            <p className="text-[12.5px] text-mudo">{pos.d}</p>

            <ul className="mt-3 space-y-2">
              {doGrupo.map((b) => {
                const agendado = b.inicioEm && b.inicioEm > agora;
                const vencido = b.fimEm && b.fimEm < agora;
                const noAr = b.ativo && !agendado && !vencido;

                return (
                  <li key={b.id} className="rounded-caixa border border-linha bg-superficie p-4">
                    <form action={salvar} className="grid gap-3">
                      <input type="hidden" name="id" value={b.id} />
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span
                          className={`rounded px-2 py-0.5 text-[10px] font-extrabold tracking-wide ${
                            noAr ? "bg-bom-suave text-bom"
                            : agendado ? "bg-atencao/10 text-atencao"
                            : vencido ? "bg-critico/10 text-critico"
                            : "bg-superficie-2 text-mudo"
                          }`}
                        >
                          {noAr ? "NO AR" : agendado ? "AGENDADO" : vencido ? "VENCIDO" : "DESLIGADO"}
                        </span>
                        <button
                          formAction={alternar.bind(null, b.id, !b.ativo)}
                          className="text-[12px] font-bold text-marca underline underline-offset-2"
                        >
                          {b.ativo ? "Desligar" : "Ligar"}
                        </button>
                      </div>

                      <Campo nome="titulo" rotulo="Texto" valor={b.titulo} />
                      <Campo nome="alt" rotulo="Texto alternativo" valor={b.alt} dica="obrigatório · acessibilidade e SEO" />
                      <Campo nome="link" rotulo="Link de destino" valor={b.link ?? ""} dica="opcional" />

                      <div className="grid gap-4 sm:grid-cols-2">
                        <CampoImagem
                          nome="imagemDesktop"
                          rotulo="Imagem para computador"
                          valor={b.imagemDesktop}
                          medida={pos.m ?? ""}
                          marca={`${pos.v.toLowerCase()}-desktop`}
                        />
                        <CampoImagem
                          nome="imagemMobile"
                          rotulo="Imagem para celular"
                          valor={b.imagemMobile}
                          medida="opcional · usa a de computador se faltar"
                          marca={`${pos.v.toLowerCase()}-mobile`}
                        />
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <Campo nome="inicioEm" rotulo="Começa em" tipo="date" valor={b.inicioEm?.toISOString().slice(0, 10) ?? ""} dica="opcional" />
                        <Campo nome="fimEm" rotulo="Termina em" tipo="date" valor={b.fimEm?.toISOString().slice(0, 10) ?? ""} dica="opcional" />
                      </div>

                      <button className="w-fit rounded-lg bg-marca px-4 py-2 text-[12.5px] font-bold text-white">
                        Salvar
                      </button>
                    </form>
                  </li>
                );
              })}

              <li className="rounded-caixa border border-dashed border-linha-2 bg-superficie p-4">
                <form action={salvar} className="grid gap-3">
                  <input type="hidden" name="posicao" value={pos.v} />
                  <p className="text-[12.5px] font-extrabold text-mudo">Novo banner nesta posição</p>
                  <Campo nome="titulo" rotulo="Texto" />
                  <Campo nome="alt" rotulo="Texto alternativo" dica="obrigatório" />

                  <div className="grid gap-4 sm:grid-cols-2">
                    <CampoImagem
                      nome="imagemDesktop"
                      rotulo="Imagem para computador"
                      medida={pos.m ?? ""}
                      marca={`${pos.v.toLowerCase()}-desktop`}
                    />
                    <CampoImagem
                      nome="imagemMobile"
                      rotulo="Imagem para celular"
                      medida="opcional"
                      marca={`${pos.v.toLowerCase()}-mobile`}
                    />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Campo nome="inicioEm" rotulo="Começa em" tipo="date" dica="opcional" />
                    <Campo nome="fimEm" rotulo="Termina em" tipo="date" dica="opcional" />
                  </div>
                  <button className="w-fit rounded-lg border border-marca px-4 py-2 text-[12.5px] font-bold text-marca">
                    Criar
                  </button>
                </form>
              </li>
            </ul>
          </section>
        );
      })}
    </div>
  );
}

function Campo({ nome, rotulo, valor, tipo = "text", dica }: { nome: string; rotulo: string; valor?: string; tipo?: string; dica?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11.5px] font-bold">
        {rotulo}
        {dica && <span className="ml-1.5 font-medium text-mudo">({dica})</span>}
      </span>
      <input
        name={nome}
        type={tipo}
        defaultValue={valor}
        className="w-full rounded-lg border border-linha-2 bg-superficie px-3 py-2 text-[13px] font-semibold"
      />
    </label>
  );
}
