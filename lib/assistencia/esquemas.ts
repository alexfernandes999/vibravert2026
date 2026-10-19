import { z } from "zod";
import { documentoValido, lerNF } from "@/lib/regras/nf";
import { dataValida } from "@/lib/regras/datas";
import { MODELOS } from "@/lib/regras/tipos";

/**
 * Validação do formulário de garantia · a mesma no navegador e no servidor.
 *
 * O servidor valida de novo tudo o que o navegador validou: o formulário é
 * público, e o que chega numa server action pode não ter passado pela tela.
 */
export const ESPACOS_FOTO = ["frente", "verso", "cabo_emenda", "etiqueta", "local_longe", "local_perto"] as const;
export type EspacoFoto = (typeof ESPACOS_FOTO)[number];

export const ROTULO_ESPACO: Record<EspacoFoto, { t: string; d: string }> = {
  frente: { t: "Frente", d: "bomba inteira" },
  verso: { t: "Verso", d: "lado oposto" },
  cabo_emenda: { t: "Cabo e emenda", d: "do motor até a emenda" },
  etiqueta: { t: "Etiqueta", d: "marca e nº de série" },
  local_longe: { t: "Local de longe", d: "poço ou cisterna inteiro" },
  local_perto: { t: "Local de perto", d: "ponto onde a bomba fica" },
};

export const CANAIS = [
  ["site", "Site Vibra Vert"],
  ["ml", "Mercado Livre"],
  ["shopee", "Shopee"],
  ["magalu", "Magalu"],
  ["amazon", "Amazon"],
  ["revenda", "Loja ou revenda"],
] as const;

const so = (s: string) => s.replace(/\D/g, "");
const msg = (m: string) => ({ message: m });

export const etapaDados = z.object({
  nome: z.string().trim().min(3, "Escreva o nome completo."),
  documento: z.string().refine((v) => documentoValido(v), msg("CPF ou CNPJ inválido. Confira os números.")),
  telefone: z.string().refine((v) => [10, 11].includes(so(v).length), msg("WhatsApp com DDD, só números.")),
  email: z.string().trim().email("E-mail inválido."),
});

export const etapaCompra = z.object({
  canal: z.enum(["site", "ml", "shopee", "magalu", "amazon", "revenda"], { errorMap: () => msg("Escolha onde comprou.") }),
  nf: z.string().trim().min(1, "Informe o número ou a chave da nota fiscal."),
  recebimento: z.string().refine(dataValida, msg("Informe a data em que recebeu a bomba.")),
  usou: z.enum(["sim", "nao"], { errorMap: () => msg("Diga se a bomba chegou a ser usada.") }),
});

export const etapaProduto = z.object({
  modelo: z.enum(MODELOS, { errorMap: () => msg("Escolha o modelo.") }),
  tensao: z.enum(["127", "220", "254"], { errorMap: () => msg("Escolha a tensão da bomba.") }),
  serie: z.string().trim().max(40).optional().default(""),
});

const ns = <const T extends [string, ...string[]]>(v: T, m: string) => z.enum(v, { errorMap: () => msg(m) });

export const etapaInstalacao = z
  .object({
    tempo: ns(["ate15", "15a30", "30a45", "45a60", "mais60", "ns"], "Escolha uma opção."),
    tempoMinutos: z.coerce.number().int().min(61).max(1440).nullable().optional(),
    rede: ns(["127", "220", "254", "ns"], "Escolha uma opção."),
    submersa: ns(["sim", "nao", "ns"], "Escolha uma opção."),
    distancia: ns(["mais40", "20a40", "menos20", "ns"], "Escolha uma opção."),
    sustentacao: ns(["corda", "cabo", "ns"], "Escolha uma opção."),
    emenda: ns(["autofusao", "comum", "sem", "ns"], "Escolha uma opção."),
    agua: ns(["limpa", "areia", "ns"], "Escolha uma opção."),
    energia: ns(["nao", "sim", "ns"], "Escolha uma opção."),
  })
  .refine((v) => v.tempo !== "mais60" || (v.tempoMinutos ?? null) !== null, {
    path: ["tempoMinutos"],
    message: "Mais ou menos quantos minutos?",
  });

export const etapaOcorrido = z.object({
  ocorrido: z.string().trim().min(20, "Escreva pelo menos uma frase (20 caracteres)."),
});

/** Caminho temporário no bucket de cada foto enviada. */
export const etapaFotos = z.object({
  fotos: z.record(z.enum(ESPACOS_FOTO), z.string().regex(/^tmp\/[a-z0-9-]+\/[a-z_]+\.(jpg|jpeg|png|webp|heic|heif)$/)),
});

export const etapaRevisao = z.object({
  lgpd: z.literal(true, { errorMap: () => msg("Marque a autorização para enviar.") }),
});

/** Chamado completo de garantia. */
export const chamadoGarantia = etapaDados
  .merge(etapaCompra)
  .merge(etapaProduto)
  .merge(etapaOcorrido)
  .merge(etapaFotos)
  .merge(etapaRevisao)
  .extend({ instalacao: etapaInstalacao, tipo: z.literal("garantia") })
  .superRefine((v, ctx) => {
    const nf = lerNF(v.nf, v.documento);
    if (nf.tipo === "invalida")
      ctx.addIssue({ code: "custom", path: ["nf"], message: MSG_NF[nf.motivo] });
  });

/** Arrependimento: sai depois da etapa 2, sem fotos nem sintoma. */
export const chamadoArrependimento = etapaDados
  .merge(etapaCompra)
  .merge(etapaRevisao)
  .extend({ tipo: z.literal("arrependimento") })
  .superRefine((v, ctx) => {
    const nf = lerNF(v.nf, v.documento);
    if (nf.tipo === "invalida")
      ctx.addIssue({ code: "custom", path: ["nf"], message: MSG_NF[nf.motivo] });
  });

export const MSG_NF = {
  cpf: "Este é um CPF. Informe o número da nota fiscal (até 9 dígitos) ou a chave de 44 dígitos.",
  documento_do_cliente: "Este é o seu CPF/CNPJ. Informe o número da nota fiscal ou a chave de 44 dígitos.",
  formato: "Número da nota (até 9 dígitos) ou chave de acesso (44 dígitos).",
} as const;

export type DadosGarantia = z.infer<typeof chamadoGarantia>;
export type DadosArrependimento = z.infer<typeof chamadoArrependimento>;
