"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import {
  assinarBancada,
  confirmarCompraManual,
  decidirChamado,
  receberBomba,
  salvarBancada,
} from "@/lib/assistencia/acoes-portal";

const input = "w-full rounded-lg border border-linha-2 bg-superficie px-3 py-2 text-[13.5px] focus:border-marca focus:outline-none";
const botao = "rounded-lg bg-marca px-4 py-2 text-[13px] font-bold text-white disabled:opacity-60";

function Retorno({ estado }: { estado: { ok: boolean; erro?: string; mensagem?: string } | null }) {
  if (!estado) return null;
  return (
    <p role={estado.ok ? "status" : "alert"} className={`mt-2 text-[12.5px] font-semibold ${estado.ok ? "text-bom" : "text-critico"}`}>
      {estado.ok ? estado.mensagem : estado.erro}
    </p>
  );
}

/**
 * Decisão do operador. Negativa e recusa exigem "Conferi as 6 fotos";
 * decidir diferente da sugestão exige o motivo.
 */
export function FormDecisao({ protocolo, sugestao, troca }: { protocolo: string; sugestao: string | null; troca: boolean }) {
  const [estado, acao, pendente] = useActionState(decidirChamado, null);
  const opcoes = troca
    ? [["autorizacao", "Autorizar Troca Expressa"], ["recusa", "Recusar"], ["pedido_informacao", "Pedir informação"], ["resolvido_fora", "Já resolvido por fora"]]
    : [["aprovacao", "Aprovar envio"], ["negativa", "Negar"], ["pedido_informacao", "Pedir informação"], ["resolvido_fora", "Já resolvido por fora"]];
  const inicial = opcoes.find(([v]) => v === sugestao)?.[0] ?? "";
  const [escolha, setEscolha] = useState(inicial);
  const diferente = sugestao && sugestao !== "revisar" && escolha && escolha !== sugestao && escolha !== "resolvido_fora";
  const desfavoravel = escolha === "negativa" || escolha === "recusa";

  return (
    <form action={acao} className="space-y-3">
      <input type="hidden" name="protocolo" value={protocolo} />
      <fieldset>
        <legend className="mb-1.5 text-[12.5px] font-bold">Decisão</legend>
        <div className="flex flex-wrap gap-2">
          {opcoes.map(([v, r]) => (
            <label key={v} className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-linha-2 px-3 py-1.5 text-[13px] font-semibold has-[:checked]:border-marca has-[:checked]:bg-marca-suave">
              <input type="radio" name="decisao" value={v} checked={escolha === v} onChange={() => setEscolha(v)} className="accent-marca" />
              {r}
            </label>
          ))}
        </div>
      </fieldset>
      {diferente && (
        <label className="block text-[12.5px] font-bold">
          Motivo da alteração (obrigatório)
          <textarea name="motivo" rows={2} className={`${input} mt-1`} />
        </label>
      )}
      <label className="block text-[12.5px] font-bold">
        {escolha === "pedido_informacao"
          ? "O que falta (vai para o cliente)"
          : escolha === "resolvido_fora"
            ? "O que foi feito (fica no histórico · encerra o chamado)"
            : "Fundamento para o laudo (opcional · reescreve o rascunho)"}
        <textarea name="nota" rows={2} className={`${input} mt-1`} />
      </label>
      <label className={`flex items-center gap-2 text-[13px] font-bold ${desfavoravel ? "text-critico" : ""}`}>
        <input type="checkbox" name="conferiuFotos" className="h-4 w-4 accent-marca" />
        Conferi as 6 fotos e as respostas deste chamado
      </label>
      <button disabled={pendente || !escolha} className={desfavoravel ? `${botao} bg-critico` : botao}>
        {pendente ? "Registrando…" : desfavoravel ? `Confirmar ${escolha}` : "Confirmar"}
      </button>
      <Retorno estado={estado} />
    </form>
  );
}

export function FormCompraManual({ protocolo }: { protocolo: string }) {
  const [estado, acao, pendente] = useActionState(confirmarCompraManual, null);
  return (
    <form action={acao} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="protocolo" value={protocolo} />
      <label className="text-[12.5px] font-bold">
        Emissão da NF
        <input type="date" name="emissao" className={`${input} mt-1`} required />
      </label>
      <label className="text-[12.5px] font-bold">
        Canal
        <select name="canal" className={`${input} mt-1`} required defaultValue="">
          <option value="" disabled>Escolha</option>
          <option value="site">Site</option>
          <option value="venda_direta_outra">Venda direta (fora do site)</option>
          <option value="ml">Mercado Livre</option>
          <option value="shopee">Shopee</option>
          <option value="magalu">Magalu</option>
          <option value="amazon">Amazon</option>
          <option value="revenda">Loja ou revenda</option>
        </select>
      </label>
      <button disabled={pendente} className={botao}>Confirmar e reanalisar</button>
      <div className="w-full"><Retorno estado={estado} /></div>
    </form>
  );
}

export function FormReceber() {
  const router = useRouter();
  const [estado, acao, pendente] = useActionState(async (a: unknown, d: FormData) => {
    const r = await receberBomba(a, d);
    if (r.ok && r.protocolo) router.push(`/admin/assistencia/bancada/${r.protocolo}`);
    return r;
  }, null);
  return (
    <form action={acao}>
      <label htmlFor="busca" className="mb-1.5 block text-[13px] font-bold">
        Leia a etiqueta ou digite protocolo, rastreio, CPF, NF ou nº de série
      </label>
      <div className="flex gap-2">
        <input id="busca" name="busca" autoFocus autoComplete="off" className={`num ${input} text-[15px]`} />
        <button disabled={pendente} className={botao}>Receber</button>
      </div>
      <Retorno estado={estado} />
    </form>
  );
}

const TOQUES: [string, string, [string, string][]][] = [
  ["cabo", "Cabo", [["integro", "Íntegro"], ["danificado", "Danificado"], ["cortado", "Cortado"]]],
  ["carcaca", "Carcaça", [["integra", "Íntegra"], ["furo", "Furo"], ["quebrada", "Trincada/quebrada"]]],
  ["abertura", "Sinais de abertura", [["nao", "Sem sinais"], ["sim", "Com sinais"]]],
  ["liga", "Partida", [["sim", "Liga"], ["nao", "Não liga"]]],
  ["recalca", "Recalque", [["normal", "Normal"], ["fraco", "Fraco"], ["nao", "Não recalca"]]],
  ["borrachas", "Borrachas", [["boas", "Boas"], ["desgaste", "Desgaste"], ["rompidas", "Rompidas"]]],
  ["bobina", "Bobina", [["integra", "Íntegra"], ["queimada", "Queimada"]]],
  ["vedacao", "Vedação", [["ok", "Ok"], ["infiltracao", "Infiltração"]]],
  ["interior", "Interior da caneca", [["limpo", "Limpo e seco"], ["agua", "Água"], ["areia", "Areia/barro"]]],
];

export function FormBancada({ protocolo, inicial }: { protocolo: string; inicial: { checklist: Record<string, string>; resistenciaOhm: string; isolacaoMOhm: string; correnteA: string; pecas: string; observacao: string; conclusao: string } }) {
  const [estado, acao, pendente] = useActionState(salvarBancada, null);
  return (
    <form action={acao} className="space-y-4">
      <input type="hidden" name="protocolo" value={protocolo} />
      <div className="grid gap-3 sm:grid-cols-3">
        {TOQUES.map(([k, r, ops]) => (
          <fieldset key={k}>
            <legend className="mb-1 text-[12px] font-bold">{r}</legend>
            <div className="flex flex-wrap gap-1">
              {ops.map(([v, t]) => (
                <label key={v} className="cursor-pointer rounded-md border border-linha-2 px-2 py-1 text-[12px] font-semibold has-[:checked]:border-marca has-[:checked]:bg-marca-suave">
                  <input type="radio" name={`c_${k}`} value={v} defaultChecked={inicial.checklist[k] === v} className="sr-only" />
                  {t}
                </label>
              ))}
            </div>
          </fieldset>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-[12px] font-bold">Resistência (Ω)<input name="resistenciaOhm" defaultValue={inicial.resistenciaOhm} inputMode="decimal" className={`num ${input} mt-1`} /></label>
        <label className="text-[12px] font-bold">Isolação (MΩ)<input name="isolacaoMOhm" defaultValue={inicial.isolacaoMOhm} inputMode="decimal" className={`num ${input} mt-1`} /></label>
        <label className="text-[12px] font-bold">Corrente (A)<input name="correnteA" defaultValue={inicial.correnteA} inputMode="decimal" className={`num ${input} mt-1`} /></label>
      </div>
      <label className="block text-[12px] font-bold">Peças trocadas (uma por linha)<textarea name="pecas" rows={2} defaultValue={inicial.pecas} className={`${input} mt-1`} /></label>
      <label className="block text-[12px] font-bold">
        Observação (vai para o laudo exatamente como escrita)
        <textarea name="observacao" rows={4} defaultValue={inicial.observacao} className={`${input} mt-1`} />
      </label>
      <fieldset>
        <legend className="mb-1 text-[12px] font-bold">Conclusão (definida pelo técnico)</legend>
        <div className="flex flex-wrap gap-2">
          {[["garantia", "Defeito de fabricação · garantia"], ["mau_uso", "Mau uso"], ["sem_defeito", "Sem defeito"]].map(([v, t]) => (
            <label key={v} className="cursor-pointer rounded-lg border border-linha-2 px-3 py-1.5 text-[12.5px] font-semibold has-[:checked]:border-marca has-[:checked]:bg-marca-suave">
              <input type="radio" name="conclusao" value={v} defaultChecked={inicial.conclusao === v} className="mr-1.5 accent-marca" />
              {t}
            </label>
          ))}
        </div>
      </fieldset>
      <button disabled={pendente} className={botao}>{pendente ? "Salvando…" : "Salvar registro"}</button>
      <Retorno estado={estado} />
    </form>
  );
}

export function FormAssinar({ protocolo, tecnico }: { protocolo: string; tecnico: boolean }) {
  const [estado, acao, pendente] = useActionState(assinarBancada, null);
  if (!tecnico) return <p className="text-[12.5px] text-mudo">Só o usuário com papel Técnico assina o laudo de bancada.</p>;
  return (
    <form action={acao} className="space-y-2">
      <input type="hidden" name="protocolo" value={protocolo} />
      <label className="flex items-center gap-2 text-[13px] font-bold">
        <input type="checkbox" name="responsavel" className="h-4 w-4 accent-marca" />
        Sou o responsável técnico por este laudo
      </label>
      <button disabled={pendente} className={botao}>{pendente ? "Assinando…" : "Assinar e liberar laudo"}</button>
      <Retorno estado={estado} />
    </form>
  );
}
