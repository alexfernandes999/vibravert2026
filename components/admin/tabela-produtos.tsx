"use client";

import Link from "next/link";
import Image from "next/image";
import { useMemo, useState, useTransition } from "react";
import { brl, precoPix } from "@/lib/formato";
import { salvarPreco, clonarProduto } from "@/lib/produtos-admin";

export type LinhaProduto = {
  id: string;
  nome: string;
  sku: string;
  marca: string;
  categorias: string[];
  preco: number;
  ativo: boolean;
  imagem: string | null;
  detalhe: string;
  /** BOMBA, BOIA, KIT, BOIA_KIT (versões da bomba), PECA, KIT_AVULSO ou ACESSORIO. */
  tipo: string;
  voltagem: string | null;
  principal: boolean;
  /** Saldo no Bling por depósito; nulo quando o código não está no espelho. */
  darwin: number | null;
  mlFull: number | null;
  /** Posição na prateleira da home e no selo de líder (nulo = não marcado). */
  vitrine: number | null;
  lider: number | null;
};

const TIPOS: [string, string][] = [
  ["BOMBA", "Bomba"],
  ["BOIA", "Bomba + boia"],
  ["KIT", "Bomba + kit"],
  ["BOIA_KIT", "Bomba + boia + kit"],
  ["PECA", "Peças"],
  ["KIT_AVULSO", "Kit avulso"],
  ["ACESSORIO", "Acessório"],
];

type Coluna = "nome" | "sku" | "marca" | "voltagem" | "preco" | "darwin" | "mlFull";

export function TabelaProdutos({
  linhas,
  limiteLider,
  limiteVitrine,
  alternarAtivo,
  alternarVitrine,
  alternarDestaque,
}: {
  linhas: LinhaProduto[];
  limiteLider: number;
  limiteVitrine: number;
  alternarAtivo: (id: string, ativo: boolean) => Promise<void>;
  alternarVitrine: (id: string, naVitrine: boolean) => Promise<void>;
  alternarDestaque: (id: string, destaque: boolean) => Promise<void>;
}) {
  const [nome, setNome] = useState("");
  const [codigo, setCodigo] = useState("");
  const [categoria, setCategoria] = useState("");
  const [marca, setMarca] = useState("");
  const [situacao, setSituacao] = useState<"" | "ativo" | "inativo">("");
  const [tipo, setTipo] = useState("");
  const [voltagem, setVoltagem] = useState("");
  const [ordem, setOrdem] = useState<{ c: Coluna; asc: boolean }>({ c: "marca", asc: true });

  const categorias = useMemo(() => [...new Set(linhas.flatMap((l) => l.categorias))].sort(), [linhas]);
  const marcas = useMemo(() => [...new Set(linhas.map((l) => l.marca))].sort(), [linhas]);
  const voltagens = useMemo(() => [...new Set(linhas.map((l) => l.voltagem).filter((v): v is string => Boolean(v)))].sort(), [linhas]);

  const visiveis = useMemo(() => {
    const sem = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
    const n = sem(nome.trim());
    const c = codigo.trim().toLowerCase();
    const f = linhas.filter(
      (l) =>
        (!n || sem(l.nome).includes(n)) &&
        (!c || l.sku.toLowerCase().includes(c)) &&
        (!categoria || l.categorias.includes(categoria)) &&
        (!marca || l.marca === marca) &&
        (!tipo || l.tipo === tipo) &&
        (!voltagem || (voltagem === "-" ? !l.voltagem : l.voltagem === voltagem)) &&
        (!situacao || (situacao === "ativo") === l.ativo),
    );
    const v = (l: LinhaProduto) => l[ordem.c];
    return [...f].sort((a, b) => {
      const x = v(a), y = v(b);
      if (x === null && y === null) return 0;
      if (x === null) return 1; // sem saldo vai para o fim nos dois sentidos
      if (y === null) return -1;
      const r = typeof x === "number" ? x - (y as number) : String(x).localeCompare(String(y), "pt-BR");
      return ordem.asc ? r : -r;
    });
  }, [linhas, nome, codigo, categoria, marca, tipo, voltagem, situacao, ordem]);

  const campo = "rounded-lg border border-linha bg-superficie px-2.5 py-1.5 text-[12.5px]";
  const Cab = ({ c, r, direita }: { c: Coluna; r: string; direita?: boolean }) => (
    <th className={`px-2 py-2.5 font-bold ${direita ? "text-right" : ""}`}>
      <button
        type="button"
        onClick={() => setOrdem((o) => ({ c, asc: o.c === c ? !o.asc : true }))}
        className={`inline-flex items-center gap-1 uppercase tracking-[0.12em] hover:text-tinta ${ordem.c === c ? "text-tinta" : ""}`}
        title="Ordenar"
      >
        {r}
        <span aria-hidden className="text-[11px]">{ordem.c === c ? (ordem.asc ? "▲" : "▼") : "↕"}</span>
      </button>
    </th>
  );

  return (
    <>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome" aria-label="Filtrar por nome" className={`${campo} w-48`} />
        <input value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="Código" aria-label="Filtrar por código" className={`${campo} num w-32`} />
        <select value={categoria} onChange={(e) => setCategoria(e.target.value)} aria-label="Categoria" className={campo}>
          <option value="">Todas as categorias</option>
          {categorias.map((c) => <option key={c}>{c}</option>)}
        </select>
        <select value={marca} onChange={(e) => setMarca(e.target.value)} aria-label="Marca" className={campo}>
          <option value="">Todas as marcas</option>
          {marcas.map((m) => <option key={m}>{m}</option>)}
        </select>
        <select value={tipo} onChange={(e) => setTipo(e.target.value)} aria-label="Tipo" className={campo}>
          <option value="">Todos os tipos</option>
          {TIPOS.map(([v, r]) => <option key={v} value={v}>{r}</option>)}
        </select>
        <select value={voltagem} onChange={(e) => setVoltagem(e.target.value)} aria-label="Voltagem" className={campo}>
          <option value="">Todas as voltagens</option>
          {voltagens.map((v) => <option key={v}>{v}</option>)}
          <option value="-">Sem voltagem</option>
        </select>
        <select value={situacao} onChange={(e) => setSituacao(e.target.value as typeof situacao)} aria-label="Situação" className={campo}>
          <option value="">Ativos e inativos</option>
          <option value="ativo">Só ativos</option>
          <option value="inativo">Só inativos</option>
        </select>
        <span className="text-[12px] text-mudo">{visiveis.length} de {linhas.length}</span>
      </div>

      <div className="mt-3 overflow-x-auto rounded-caixa border border-linha bg-superficie">
        <table className="w-full text-[12.5px]">
          <thead>
            <tr className="border-b border-linha text-left text-[10px] uppercase tracking-[0.12em] text-mudo">
              <th className="w-14 py-2.5 pl-4" />
              <Cab c="nome" r="Produto" />
              <Cab c="sku" r="Código" />
              <Cab c="marca" r="Marca" />
              <Cab c="voltagem" r="Voltagem" />
              <Cab c="preco" r="Preço a prazo" direita />
              <th className="px-2 py-2.5 text-right font-bold">PIX</th>
              <Cab c="darwin" r="Darwin" direita />
              <Cab c="mlFull" r="ML Full" direita />
              <th className="px-2 py-2.5 text-center font-bold" title="Aparece na prateleira da home">Vitrine</th>
              <th className="px-2 py-2.5 text-center font-bold" title="Selo de líder em vendas no cartão">Líder</th>
              <th className="px-2 py-2.5 font-bold">Situação</th>
              <th className="px-4 py-2.5 font-bold" />
            </tr>
          </thead>
          <tbody>
            {visiveis.map((p) => (
              <tr key={p.id} className="border-b border-linha last:border-0">
                <td className="w-14 py-1.5 pl-4">
                  {p.imagem && (
                    <Link href={`/admin/produtos/${p.id}`}>
                      <Image src={p.imagem} alt="" width={44} height={44} className="h-11 w-11 rounded-lg border border-linha object-cover transition hover:border-marca" />
                    </Link>
                  )}
                </td>
                <td className="py-2 pl-2">
                  {p.principal && <span className="mr-1 text-ouro-escuro">★</span>}
                  <Link href={`/admin/produtos/${p.id}`} className="font-semibold hover:text-marca hover:underline">{p.nome}</Link>
                  <span className="num block text-[10.5px] text-mudo">{p.detalhe}</span>
                </td>
                <td className="num px-2 py-2 text-mudo">{p.sku}</td>
                <td className="px-2 py-2 text-mudo">{p.marca}</td>
                <td className="num px-2 py-2 text-mudo">{p.voltagem ?? "—"}</td>
                <Preco id={p.id} inicial={p.preco} />
                <Saldo n={p.darwin} />
                <Saldo n={p.mlFull} />
                <td className="px-2 py-2 text-center">
                  <form action={alternarVitrine.bind(null, p.id, p.vitrine === null)}>
                    <Posicao n={p.vitrine} limite={limiteVitrine} cor="marca" titulo={p.vitrine === null ? "Mostrar na prateleira da home" : "Tirar da prateleira da home"} />
                  </form>
                </td>
                <td className="px-2 py-2 text-center">
                  <form action={alternarDestaque.bind(null, p.id, p.lider === null)}>
                    <Posicao n={p.lider} limite={limiteLider} cor="ouro" titulo={p.lider === null ? "Marcar como líder em vendas" : "Tirar o selo de líder em vendas"} />
                  </form>
                </td>
                <td className="px-2 py-2">
                  <form action={alternarAtivo.bind(null, p.id, !p.ativo)}>
                    <button className={`rounded px-2 py-0.5 text-[10px] font-extrabold tracking-wide ${p.ativo ? "bg-bom-suave text-bom" : "bg-critico/10 text-critico"}`}>
                      {p.ativo ? "ATIVO" : "INATIVO"}
                    </button>
                  </form>
                </td>
                <td className="px-4 py-2">
                  <form action={clonarProduto.bind(null, p.id)}>
                    <button className="rounded-md border border-linha-2 px-2 py-0.5 text-[11px] font-bold text-tinta-2 hover:border-marca hover:text-marca" title="Cria uma cópia inativa para editar">
                      Clonar
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

/**
 * Preço editável na própria linha. O PIX ao lado acompanha enquanto digita;
 * grava ao sair do campo ou no Enter.
 */
function Preco({ id, inicial }: { id: string; inicial: number }) {
  const [texto, setTexto] = useState(inicial.toFixed(2).replace(".", ","));
  const [salvo, setSalvo] = useState(inicial);
  const [estado, setEstado] = useState<"" | "salvando" | "ok" | "erro">("");
  const [, iniciar] = useTransition();
  const valor = Number(texto.replace(/\./g, "").replace(",", "."));
  const valido = Number.isFinite(valor) && valor > 0;

  const gravar = () => {
    if (!valido || Math.abs(valor - salvo) < 0.005) return;
    setEstado("salvando");
    iniciar(async () => {
      const r = await salvarPreco(id, valor);
      if (r.ok) {
        setSalvo(valor);
        setEstado("ok");
        setTimeout(() => setEstado(""), 1800);
      } else setEstado("erro");
    });
  };

  return (
    <>
      <td className="px-2 py-2 text-right">
        <input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onBlur={gravar}
          onKeyDown={(e) => e.key === "Enter" && (e.currentTarget as HTMLInputElement).blur()}
          inputMode="decimal"
          aria-label="Preço a prazo"
          className={`num w-24 rounded-md border px-2 py-1 text-right font-bold ${
            !valido || estado === "erro" ? "border-critico" : estado === "ok" ? "border-bom" : Math.abs(valor - salvo) >= 0.005 ? "border-atencao" : "border-linha"
          }`}
        />
        <span className="block text-[10px] text-mudo">{estado === "salvando" ? "salvando…" : estado === "ok" ? "salvo" : estado === "erro" ? "não salvou" : " "}</span>
      </td>
      <td className="num px-2 py-2 text-right font-bold text-bom">{valido ? brl(precoPix(valor)) : "—"}</td>
    </>
  );
}

function Saldo({ n }: { n: number | null }) {
  return (
    <td className={`num px-2 py-2 text-right font-semibold ${n === null ? "text-mudo" : n < 0 ? "text-critico" : ""}`}>
      {n === null ? "—" : n.toLocaleString("pt-BR")}
    </td>
  );
}

/**
 * O botão que liga e desliga, mostrando a posição na loja.
 *
 * Marcado e dentro do limite: número em cor cheia · é o que se vê no site.
 * Marcado e fora do limite: número riscado, porque a prateleira acabou.
 * Não marcado: traço, que convida a clicar sem parecer erro.
 */
function Posicao({ n, limite, cor, titulo }: { n: number | null; limite: number; cor: "ouro" | "marca"; titulo: string }) {
  const dentro = n !== null && n <= limite;
  const fora = n !== null && n > limite;
  return (
    <button
      title={fora ? `Marcado, mas a prateleira mostra só ${limite} · este é o ${n}º` : dentro ? `Aparece na posição ${n} da prateleira` : titulo}
      className={`num grid h-6 w-6 place-items-center rounded-md text-[11.5px] font-extrabold transition ${
        dentro
          ? cor === "ouro" ? "bg-ouro text-ouro-txt" : "bg-marca text-white"
          : fora
            ? "border border-dashed border-linha-2 text-mudo line-through"
            : "text-linha-2 hover:bg-superficie-2 hover:text-tinta-2"
      }`}
    >
      {n ?? "–"}
    </button>
  );
}
