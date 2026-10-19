import { readFileSync } from "node:fs";
import path from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod/v4";
import { ITENS_LISTA_FECHADA, type AvaliacaoItem } from "@/lib/regras/lista-fechada";
import type { EspacoFoto } from "./esquemas";

/**
 * A Claude no portal da assistência: só ler fotos e redigir textos.
 *
 * Ela não decide faixa, não decide liberação e não nega nada · isso é do
 * código (lib/regras) e de uma pessoa. Daqui sai um JSON validado ou um erro;
 * erro manda o chamado para a fila humana e ninguém tenta de novo em loop.
 */
export const MODELO_FOTOS = "claude-sonnet-5-5";
export const MODELO_TEXTO = "claude-haiku-5-5";

/** US$ por milhão de tokens. Cache write é o de 5 minutos (1,25× a entrada). */
const PRECO: Record<string, { entrada: number; saida: number; cacheLeitura: number; cacheEscrita: number }> = {
  [MODELO_FOTOS]: { entrada: 2, saida: 10, cacheLeitura: 0.2, cacheEscrita: 2.5 },
  // Até 100 mil tokens por chamada; o chamado fica muito abaixo disso.
  [MODELO_TEXTO]: { entrada: 0.1, saida: 0.5, cacheLeitura: 0.01, cacheEscrita: 0.125 },
};

export type Uso = {
  modelo: string;
  tokensEntrada: number;
  tokensSaida: number;
  cacheLeitura: number;
  cacheEscrita: number;
  custoUsd: number;
};

function uso(modelo: string, u: Anthropic.Usage): Uso {
  const p = PRECO[modelo];
  const r = {
    modelo,
    tokensEntrada: u.input_tokens,
    tokensSaida: u.output_tokens,
    cacheLeitura: u.cache_read_input_tokens ?? 0,
    cacheEscrita: u.cache_creation_input_tokens ?? 0,
  };
  const custoUsd =
    (r.tokensEntrada * p.entrada + r.tokensSaida * p.saida + r.cacheLeitura * p.cacheLeitura + r.cacheEscrita * p.cacheEscrita) /
    1_000_000;
  return { ...r, custoUsd };
}

export class FalhaIA extends Error {
  constructor(
    mensagem: string,
    readonly uso: Uso | null,
  ) {
    super(mensagem);
  }
}

let cliente: Anthropic | null = null;
function api() {
  // Uma tentativa extra só para 429/5xx/rede, feita pelo SDK. Nada de loop.
  cliente ??= new Anthropic({ maxRetries: 1, timeout: 90_000 });
  return cliente;
}

/**
 * As regras, iguais em todo chamado: bloco de sistema com cache.
 * O Guia é a fonte de verdade · a mesma versão que o motor implementa.
 */
let guia: string | null = null;
function regras() {
  guia ??= readFileSync(path.join(process.cwd(), "docs/assistencia/regras/Guia_de_Laudos_v2.md"), "utf8");
  return guia;
}

// ── 1. lista fechada nas fotos (Sonnet) ─────────────────────────────────

const SaidaLista = z.object({
  itens: z
    .array(
      z.object({
        item: z.enum(ITENS_LISTA_FECHADA),
        resultado: z.enum(["encontrado", "nao_encontrado", "inconclusivo"]),
        foto_ref: z.enum(["frente", "verso", "cabo_emenda", "etiqueta", "local_longe", "local_perto"]).nullable(),
        motivo_inconclusivo: z.enum(["foto escura", "parte fora do quadro", "foto desfocada", "outro"]).nullable(),
      }),
    )
    .length(4),
});

const INSTRUCAO_LISTA = `Você identifica, nas fotos de um chamado de garantia de bomba submersa vibratória Vibra Vert/Rymer, apenas os quatro itens da lista fechada do Guia (seção 7):

- bomba_outra_marca: a bomba da foto não é Vibra Vert nem Rymer.
- cabo_cortado: o cabo elétrico está cortado ou seccionado.
- produto_violado: a bomba foi aberta ou violada (parafusos mexidos, lacre rompido, carcaça separada).
- carcaca_quebrada_impacto: a carcaça está quebrada ou trincada por impacto ou queda.

Para cada item, devolva exatamente um resultado:
- "encontrado" só quando a foto mostra o item com clareza;
- "nao_encontrado" quando a parte relevante aparece com clareza e o item não está lá;
- "inconclusivo" quando a foto não permite afirmar (escura, desfocada, parte fora do quadro, etiqueta ilegível). Diga o motivo.
Na dúvida, "inconclusivo": inconclusivo nunca vira recusa, mas um "encontrado" errado vira.

Em foto_ref, a foto que fundamenta o resultado. Não avalie nada fora destes quatro itens, não descreva defeitos e não sugira decisão.`;

export async function identificarListaFechada(
  fotos: { espaco: EspacoFoto; jpeg: Buffer }[],
): Promise<{ itens: AvaliacaoItem[]; uso: Uso }> {
  const conteudo: Anthropic.ContentBlockParam[] = [];
  for (const f of fotos) {
    conteudo.push({ type: "text", text: `Foto: ${f.espaco}` });
    conteudo.push({ type: "image", source: { type: "base64", media_type: "image/jpeg", data: f.jpeg.toString("base64") } });
  }
  conteudo.push({ type: "text", text: "Avalie os quatro itens da lista fechada nestas fotos." });

  let r;
  try {
    r = await api().messages.parse({
      model: MODELO_FOTOS,
      max_tokens: 8000,
      output_config: { effort: "medium", format: zodOutputFormat(SaidaLista) },
      system: [
        { type: "text", text: regras(), cache_control: { type: "ephemeral" } },
        { type: "text", text: INSTRUCAO_LISTA, cache_control: { type: "ephemeral" } },
      ],
      messages: [{ role: "user", content: conteudo }],
    });
  } catch (e) {
    throw new FalhaIA(`API: ${e instanceof Error ? e.message : String(e)}`, null);
  }

  const u = uso(MODELO_FOTOS, r.usage);
  if (r.stop_reason === "refusal") throw new FalhaIA(`recusa: ${r.stop_details?.category ?? "sem categoria"}`, u);
  if (r.stop_reason === "max_tokens") throw new FalhaIA("resposta cortada (max_tokens)", u);
  const saida = r.parsed_output;
  if (!saida) throw new FalhaIA("saída fora do esquema", u);
  // Um item repetido e outro ausente passaria no .length(4): confere os quatro.
  const vistos = new Set(saida.itens.map((i) => i.item));
  if (vistos.size !== 4) throw new FalhaIA("lista fechada incompleta ou repetida", u);

  return { itens: saida.itens, uso: u };
}

// ── 2. textos (Haiku) ───────────────────────────────────────────────────

export const SaidaTexto = z.object({
  fundamentacao: z.string(),
  conclusao: z.string(),
  mensagem_cliente: z.string(),
});
export type Texto = z.infer<typeof SaidaTexto>;

const INSTRUCAO_TEXTO = `Você redige laudos e mensagens da Assistência Técnica Vibra Vert, em português do Brasil, a partir dos dados que o código já decidiu. Você não decide nada: o resultado, a faixa, o frete e os pontos a verificar vêm prontos.

Regras de redação (Guia, seções 9 e 10):
- Claro, cordial e curto. Fundamentação em 2 a 4 frases, citando só os fatos recebidos.
- Nunca afirmações jurídicas, sobre CDC ou sobre cobrança; não prometa troca antes da bancada.
- Nunca escreva "2 anos de garantia" (nem 6 meses, 1 ano) sem a ressalva "no motor e na carcaça · borrachas 90 dias".
- Em negativa ou recusa: o motivo, a saída de análise física e a cortesia de peças pelo custo.
- Em laudo de bancada: a mensagem ao cliente não descreve o defeito.
- Não use o CPF do cliente no texto.`;

export async function redigir(dados: Record<string, unknown>): Promise<{ texto: Texto; uso: Uso }> {
  let r;
  try {
    r = await api().messages.parse({
      model: MODELO_TEXTO,
      max_tokens: 4000,
      output_config: { effort: "low", format: zodOutputFormat(SaidaTexto) },
      system: [
        { type: "text", text: regras(), cache_control: { type: "ephemeral" } },
        { type: "text", text: INSTRUCAO_TEXTO, cache_control: { type: "ephemeral" } },
      ],
      messages: [{ role: "user", content: `Dados do chamado (JSON):\n${JSON.stringify(dados)}` }],
    });
  } catch (e) {
    throw new FalhaIA(`API: ${e instanceof Error ? e.message : String(e)}`, null);
  }
  const u = uso(MODELO_TEXTO, r.usage);
  if (r.stop_reason !== "end_turn" || !r.parsed_output) throw new FalhaIA(`texto não validado (${r.stop_reason})`, u);

  const t = r.parsed_output;
  // Regra 9 do CLAUDE.md, conferida em código: prazo longo sem a ressalva não sai.
  const tudo = `${t.fundamentacao} ${t.conclusao} ${t.mensagem_cliente}`;
  if (/\b(2 anos|1 ano|6 meses|dois anos|um ano|seis meses)\b/i.test(tudo) && !/borrachas 90 dias/i.test(tudo))
    throw new FalhaIA("texto cita prazo de garantia sem a ressalva das borrachas", u);
  if (/\b(cdc|c[oó]digo de defesa|procon|lei )/i.test(tudo)) throw new FalhaIA("texto com afirmação jurídica", u);

  return { texto: t, uso: u };
}
