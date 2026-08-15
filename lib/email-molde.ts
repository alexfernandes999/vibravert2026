import { TELEFONE, TELEFONE_LINK } from "@/lib/contato";

/**
 * Molde dos e-mails da loja.
 *
 * Tabela e estilo em linha, que é o que Gmail, Outlook e o app do iPhone
 * realmente renderizam. Largura de 560 pixels, a caixa de leitura do Outlook.
 *
 * O cabeçalho é branco com o logotipo de verdade, e não o nome escrito à mão
 * numa faixa colorida: a marca é o desenho, e o azul dele só funciona sobre
 * claro. Nada de dourado no corpo — na loja ele é acento pontual, e num e-mail
 * inteiro vira aviso de promoção duvidosa.
 */

const AZUL = "#14307a";
const AZUL_ESC = "#0a1b4d";
const AZUL_SUAVE = "#eef2fb";
const AZUL_LINHA = "#c7d3ec";
const TINTA = "#12172a";
const TINTA_2 = "#3a4356";
const MUDO = "#79818f";
const LINHA = "#e3e8f0";
const FUNDO = "#f4f6fa";
const BOM = "#12694a";
const BOM_SUAVE = "#e7f3ec";

export const brl = (v: unknown) =>
  Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const base = () => process.env.NEXT_PUBLIC_URL || "https://vibravert-loja.vercel.app";
const F = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

export type Peca = { nome: string; qtd: number; total: number; sku?: string; imagem?: string | null };

function linhaItem(i: Peca) {
  return `<tr>
    <td style="padding:11px 0;border-bottom:1px solid ${LINHA};font:14px/1.45 ${F};color:${TINTA_2}">
      <strong style="color:${TINTA};font-weight:600">${i.nome}</strong>
      <br><span style="font-size:12px;color:${MUDO}">${i.sku ? `SKU ${i.sku} · ` : ""}${i.qtd} un</span>
    </td>
    <td align="right" style="padding:11px 0;border-bottom:1px solid ${LINHA};font:600 14px ${F};color:${TINTA};white-space:nowrap">
      ${brl(i.total)}
    </td>
  </tr>`;
}

export type Molde = {
  etiqueta: string;
  titulo: string;
  texto: string[];
  aviso?: { titulo: string; corpo: string; tom?: "bom" | "azul" };
  itens?: Peca[];
  resumo?: { rotulo: string; valor: string; forte?: boolean }[];
  botao?: { rotulo: string; href: string };
  entrega?: string[];
  assinatura?: boolean;
};

export function montar(m: Molde) {
  const itens = m.itens?.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px">
         <tr><td colspan="2" style="padding-bottom:6px;font:700 11px ${F};letter-spacing:1.4px;text-transform:uppercase;color:${AZUL}">Seu pedido</td></tr>
         ${m.itens.map(linhaItem).join("")}
       </table>`
    : "";

  const resumo = m.resumo?.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px">
        ${m.resumo
          .map((r) =>
            r.forte
              ? `<tr>
                  <td style="padding:12px 0 0;border-top:1px solid ${LINHA};font:800 18px ${F};color:${TINTA}">${r.rotulo}</td>
                  <td align="right" style="padding:12px 0 0;border-top:1px solid ${LINHA};font:800 18px ${F};color:${AZUL}">${r.valor}</td>
                </tr>`
              : `<tr>
                  <td style="padding:3px 0;font:14px ${F};color:${TINTA_2}">${r.rotulo}</td>
                  <td align="right" style="padding:3px 0;font:600 14px ${F};color:${TINTA}">${r.valor}</td>
                </tr>`,
          )
          .join("")}
       </table>`
    : "";

  const aviso = m.aviso
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:22px">
        <tr><td style="background:${m.aviso.tom === "bom" ? BOM_SUAVE : AZUL_SUAVE};border-left:3px solid ${m.aviso.tom === "bom" ? BOM : AZUL};border-radius:0 10px 10px 0;padding:15px 17px">
          <div style="font:700 13.5px ${F};color:${m.aviso.tom === "bom" ? BOM : AZUL}">${m.aviso.titulo}</div>
          <div style="margin-top:5px;font:13.5px/1.55 ${F};color:${TINTA_2}">${m.aviso.corpo}</div>
        </td></tr>
       </table>`
    : "";

  const botao = m.botao
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:26px">
        <tr><td style="background:${AZUL};border-radius:9px">
          <a href="${m.botao.href}" style="display:inline-block;padding:14px 30px;font:700 14.5px ${F};color:#ffffff;text-decoration:none">${m.botao.rotulo} &nbsp;›</a>
        </td></tr>
       </table>`
    : "";

  const entrega = m.entrega?.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:26px">
        <tr><td style="background:${FUNDO};border-radius:10px;padding:16px 18px">
          <div style="font:700 11px ${F};letter-spacing:1.4px;text-transform:uppercase;color:${AZUL}">Entrega</div>
          <div style="margin-top:6px;font:14px/1.65 ${F};color:${TINTA_2}">${m.entrega.join("<br>")}</div>
        </td></tr>
       </table>`
    : "";

  const assinatura = m.assinatura
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px;border-top:1px solid ${LINHA};padding-top:4px">
        <tr>
          <td width="66" style="padding-top:18px;vertical-align:top">
            <img src="${base()}/vibrinha.png" width="56" height="56" alt="Vibrinha" style="display:block;border:0">
          </td>
          <td style="padding-top:18px;font:13.5px/1.55 ${F};color:${TINTA_2}">
            <strong style="color:${TINTA}">Vibrinha</strong>
            <span style="color:${MUDO}"> · atendimento Vibra Vert</span><br>
            Qualquer dúvida é só responder este e-mail · ele chega em pedido@vibravert.com.br · ou chamar no
            <a href="tel:${TELEFONE_LINK}" style="color:${AZUL};text-decoration:none;font-weight:600">${TELEFONE}</a>.
            Falamos de bomba, não é SAC.
          </td>
        </tr>
       </table>`
    : "";

  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<title>${m.titulo}</title></head>
<body style="margin:0;padding:0;background:${FUNDO}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${m.texto[0] ?? m.titulo}</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${FUNDO};padding:30px 12px">
<tr><td align="center">
  <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid ${LINHA}">

    <!-- Cabeçalho branco com o logotipo real: o azul da marca só funciona
         sobre claro, e escrever o nome à mão joga fora a marca. -->
    <tr><td style="padding:26px 26px 20px">
      <img src="${base()}/logo-vibravert.png" width="176" alt="Vibra Vert · Bombas Submersas Vibratórias" style="display:block;border:0">
    </td></tr>

    <tr><td style="height:3px;background:${AZUL};font-size:0;line-height:0">&nbsp;</td></tr>

    <tr><td style="padding:26px 26px 30px">
      <div style="font:700 11px ${F};letter-spacing:1.5px;text-transform:uppercase;color:${AZUL}">${m.etiqueta}</div>
      <h1 style="margin:8px 0 12px;font:800 25px/1.22 ${F};letter-spacing:-.5px;color:${TINTA}">${m.titulo}</h1>
      ${m.texto.map((t) => `<p style="margin:0 0 11px;font:15px/1.62 ${F};color:${TINTA_2}">${t}</p>`).join("")}
      ${aviso}${itens}${resumo}${botao}${entrega}${assinatura}
    </td></tr>

    <tr><td style="background:${AZUL_ESC};padding:20px 26px;font:12px/1.7 ${F};color:rgba(255,255,255,.62)">
      <strong style="color:#ffffff;font-weight:600">Vibra Vert Bombas Submersas Vibratórias</strong><br>
      Fábrica desde 1974 · Rua Charles Darwin, 707 · Vila Santa Catarina · São Paulo/SP<br>
      CNPJ 21.276.576/0001-56 · <a href="${base()}" style="color:${AZUL_LINHA};text-decoration:none">vibravert.com.br</a>
    </td></tr>

  </table>
</td></tr></table>
</body></html>`;
}
