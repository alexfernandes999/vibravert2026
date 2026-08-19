/**
 * De SKU nosso para código no Bling.
 *
 * A maioria dos 85 produtos bate direto: o código é o mesmo dos dois lados.
 * Estes não batem, e quase sempre por pontuação · a loja guarda `3001` e o
 * Bling tem `3.001`. As três últimas mudam de código mesmo, e foram
 * emparelhadas pelo nome, que coincide palavra por palavra.
 *
 * Mapear aqui, e não renomear o SKU da loja, é de propósito: o SKU aparece em
 * pedido antigo, em etiqueta impressa e em planilha que alguém já baixou.
 */
export const MAPA_BLING: Record<string, string> = {
  "3001": "3.001",   // Amortecedor Rymer 1500/2000/2500
  "3005": "3.005",   // Carcaça RYMER 1500/2000/2500
  "3095": "3.095",   // Saída de Água (3/4) Rymer
  "9507": "9.507",   // Carcaça Vibra Vert VIBRINHA/800/900
  "9515": "9.515",   // Saída de Água 3/4 VIBRINHA e Vibra Vert 800
  "9516": "9.516",   // Saída de Água 1" VIBRA VERT 900
  "VT 111": "VT111", // Arruela de regulagem 0,1 MM
  "4005": "4.015",   // Anel da saída da Bomba Vibra Vert e Rymer
  "6.112": "6.115",  // Caneca Motor Vibrinha 125V 340W
  "6.113": "6.116",  // Caneca Motor Vibrinha 220V 340W
  "3008": "6g11",    // Martelete 45MM · confirmado pelo João, e o preço bate
  AQ11: "PA002615",  // Boia Automatica de Nivel Mar Girius · ver aviso abaixo
};

/**
 * Pares confirmados pelo Bling mas com a ficha divergente.
 *
 * O par foi dado pelo João, então a nota sai certa. O que não bate é o que a
 * loja publica · e isso é problema de quem compra, não de quem emite.
 *
 * Não corrijo sozinho: pode ser que a peça tenha mudado de fornecedor e a
 * loja é que está velha, ou que o código esteja trocado. Quem sabe é a
 * fábrica.
 */
export const DIVERGENTES: Record<string, string> = {
  AQ11:
    "A loja anuncia \"Vibrinhamatic, 1,5 m de cabo\" por R$ 58,36. O PA002615 do Bling é \"Boia Automatica de Nivel Mar Girius 15 Amperes 1,2M\", R$ 70,06. Marca, comprimento do cabo e preço diferentes.",
};

/** O código que o Bling conhece para um SKU nosso. */
export const codigoBling = (sku: string) => MAPA_BLING[sku] ?? sku;
