/**
 * Primeira carga do espelho do Bling, do computador (sem o limite de tempo da
 * Vercel). Roda em rodadas até não sobrar página nem detalhe.
 *
 *   npx tsx --env-file=.env prisma/espelho.mts            # tudo
 *   npx tsx --env-file=.env prisma/espelho.mts produto    # só uma fonte
 */
import { sincronizar, situacao } from "@/lib/erp/espelho";

const entidades = process.argv.slice(2);

let seguidas = 0;
for (let rodada = 1; ; rodada++) {
  const r = await sincronizar({ orcamentoMs: 5 * 60_000, entidades: entidades.length ? entidades : undefined });
  if (!r.ok) {
    console.log(r.motivo);
    process.exit(1);
  }
  for (const x of r.relatorio) {
    console.log(`rodada ${rodada} · ${x.entidade}: ${x.paginas} páginas, ${x.mudaram} mudaram, ${x.detalhes} detalhes${x.completa ? " · completa" : ""}${x.erro ? ` · ERRO ${x.erro}` : ""}`);
  }
  const s = await situacao();
  const falta = s.some((f) => (!entidades.length || entidades.includes(f.entidade)) && (f.estado?.varreduraDe || f.pendentes > 0));
  if (!falta) break;
  // Token vencido: para (quem renova é o site). Falha de rede passageira: tenta
  // de novo, mas três rodadas seguidas com erro é problema de verdade.
  const erros = r.relatorio.filter((x) => x.erro);
  if (erros.some((x) => /vencido|401|autoriza/i.test(x.erro!))) break;
  seguidas = erros.length ? seguidas + 1 : 0;
  if (seguidas >= 3) break;
  if (erros.length) await new Promise((s) => setTimeout(s, 30_000));
}
console.log("\nfim:");
for (const f of await situacao()) console.log(`${f.rotulo}: ${f.estado?.registros ?? 0} registros, ${f.pendentes} sem detalhe`);
process.exit(0);
