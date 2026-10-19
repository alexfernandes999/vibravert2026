/**
 * Tipos do motor de regras da garantia.
 *
 * Datas são sempre `AAAA-MM-DD` (data civil de São Paulo). Hora e fuso não
 * entram no motor: um chamado enviado às 23h50 não pode mudar de faixa por
 * causa de conversão de fuso.
 */

export type DataISO = string;

export const MODELOS = ["r1500", "r2000", "r2500", "vibrinha", "vv800", "vv900"] as const;
export type Modelo = (typeof MODELOS)[number];

export const NOME_MODELO: Record<Modelo, string> = {
  r1500: "Rymer 1500",
  r2000: "Rymer 2000",
  r2500: "Rymer 2500",
  vibrinha: "Vibrinha",
  vv800: "Vibra Vert 800",
  vv900: "Vibra Vert 900",
};

export const MARKETPLACES = ["ml", "shopee", "magalu", "amazon"] as const;
export type Marketplace = (typeof MARKETPLACES)[number];

/**
 * Onde a bomba foi comprada.
 *
 * `site` é a loja online. `venda_direta_outra` é venda da própria Vibra Vert/ARF
 * fora do site (telefone, WhatsApp, balcão), que só aparece quando o Bling diz.
 * Se ela conta como Troca Expressa ainda não está definido (PENDENCIAS).
 */
export type Canal = "site" | "venda_direta_outra" | Marketplace | "revenda";

export const ehMarketplace = (c: Canal): c is Marketplace =>
  (MARKETPLACES as readonly string[]).includes(c);

export type Faixa =
  | "arrependimento"
  | "marketplace_30"
  | "troca_expressa"
  | "normal_31_90"
  | "normal_91"
  | "indefinida";

export type Tensao = "127" | "220" | "254";
