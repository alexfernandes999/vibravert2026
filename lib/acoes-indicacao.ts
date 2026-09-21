"use server";

import { guardarConversa } from "@/lib/acoes-vibrinha";
import { whatsappLink } from "@/lib/contato";

/**
 * Pedido de indicação de bomba, vindo da página de campanha.
 *
 * Quem procura bomba no Google quase sempre não sabe qual serve: o diâmetro do
 * poço e a voltagem decidem, e errar isso é a principal causa de devolução.
 * Em vez de deixar a pessoa adivinhar sozinha, ela conta o que tem e o
 * vendedor responde.
 *
 * O registro vai para a mesma tela de Conversas que a Vibrinha alimenta · o
 * time de vendas já olha ali, e um segundo lugar para procurar contato é um
 * lugar que ninguém olha.
 */
const texto = (d: FormData, campo: string, limite = 200) =>
  String(d.get(campo) ?? "").trim().slice(0, limite);

export type EstadoIndicacao = { ok?: boolean; erro?: string; whatsapp?: string; resumo?: string };

export async function pedirIndicacao(_anterior: EstadoIndicacao, dados: FormData): Promise<EstadoIndicacao> {
  const nome = texto(dados, "nome", 80);
  const whats = texto(dados, "whatsapp", 30);
  const email = texto(dados, "email", 120);
  const estado = texto(dados, "estado", 40);
  const poco = texto(dados, "poco", 20);
  const voltagem = texto(dados, "voltagem", 20);
  const profundidade = texto(dados, "profundidade", 40);
  const uso = texto(dados, "uso", 40);
  const obs = texto(dados, "observacoes", 600);

  if (nome.length < 2) return { erro: "Diga o seu nome para o vendedor saber com quem fala." };
  if (whats.replace(/\D/g, "").length < 10) {
    return { erro: "Escreva o WhatsApp com DDD · é por ele que a resposta chega." };
  }

  const rotulo = (v: string, vazio = "não informou") => v || vazio;
  const resumo = [
    poco ? `poço ${poco}` : null,
    voltagem ? voltagem : null,
    profundidade ? `${profundidade} de profundidade` : null,
    uso ? uso : null,
  ]
    .filter(Boolean)
    .join(" · ");

  await guardarConversa({
    nome,
    origem: "página de campanha · bomba para poço",
    apurado: resumo || "não informou nada além do contato",
    dialogo: [
      `Nome: ${nome}`,
      `WhatsApp: ${whats}`,
      `E-mail: ${rotulo(email)}`,
      `Estado: ${rotulo(estado)}`,
      `Diâmetro do poço: ${rotulo(poco)}`,
      `Voltagem disponível: ${rotulo(voltagem)}`,
      `Profundidade: ${rotulo(profundidade)}`,
      `O que vai bombear: ${rotulo(uso)}`,
      obs ? `Observações: ${obs}` : null,
    ]
      .filter(Boolean)
      .join("\n"),
  });

  // A pessoa não fica esperando: leva a própria conversa pronta para o
  // WhatsApp, e o vendedor recebe o mesmo texto que ficou registrado.
  const mensagem = [
    `Olá! Sou ${nome} e quero uma indicação de bomba.`,
    resumo ? `Meu caso: ${resumo}.` : null,
    obs || null,
  ]
    .filter(Boolean)
    .join("\n");

  return { ok: true, whatsapp: whatsappLink(mensagem), resumo };
}
