/**
 * Molde dos e-mails da loja.
 *
 * Tabela e estilo em linha, que é o que os clientes de e-mail renderizam de
 * verdade. Gmail, Outlook e o app do iPhone ignoram folha de estilo externa,
 * classe e boa parte do que funciona num navegador; o que sobrevive é isto.
 *
 * Largura de 560 pixels: a caixa de leitura do Outlook e a metade da tela num
 * celular deitado. Acima disso, corta.
 */

const AZUL = "#0a1b4d";
const AZUL_CLARO = "#14307a";
const OURO = "#F5B921";
const OURO_TXT = "#6b4c00";
const TINTA = "#12172a";
const TINTA_2 = "#333b4d";
const MUDO = "#7c848f";
const LINHA = "#e0e5ee";
const FUNDO = "#f2f5fa";
const BOM = "#1A7A4F";

export const brl = (v: unknown) =>
  Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const base = () => process.env.NEXT_PUBLIC_URL ?? "https://www.vibravert.com.br";

export type Peca = { nome: string; qtd: number; total: number; sku?: string; imagem?: string | null };

/** Um item do pedido, com miniatura quando houver. */
function linhaItem(i: Peca) {
  const foto = i.imagem
    ? `<td width="64" style="padding:10px 12px 10px 0;vertical-align:top">
         <img src="${i.imagem}" width="56" height="56" alt="" style="display:block;border-radius:8px;border:1px solid ${LINHA};object-fit:cover">
       </td>`
    : "";
  return `<tr>
    ${foto}
    <td style="padding:10px 0;border-bottom:1px solid ${LINHA};font:14px/1.45 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:${TINTA_2}">
      <strong style="color:${TINTA}">${i.nome}</strong>
      ${i.sku ? `<br><span style="font-size:12px;color:${MUDO}">SKU ${i.sku} · ${i.qtd} un</span>` : `<br><span style="font-size:12px;color:${MUDO}">${i.qtd} un</span>`}
    </td>
    <td align="right" style="padding:10px 0;border-bottom:1px solid ${LINHA};font:600 14px -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:${TINTA};white-space:nowrap">
      ${brl(i.total)}
    </td>
  </tr>`;
}

export type Molde = {
  /** Palavra curta no alto da faixa colorida. */
  etiqueta: string;
  titulo: string;
  /** Parágrafos de abertura. */
  texto: string[];
  /** Destaque colorido logo abaixo do texto. */
  aviso?: { titulo: string; corpo: string; tom?: "bom" | "ouro" };
  itens?: Peca[];
  resumo?: { rotulo: string; valor: string; forte?: boolean }[];
  botao?: { rotulo: string; href: string };
  entrega?: string[];
  /** Assinatura da Vibrinha no rodapé do corpo. */
  assinatura?: boolean;
};

export function montar(m: Molde) {
  const itens = m.itens?.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:22px">
         ${m.itens.map(linhaItem).join("")}
       </table>`
    : "";

  const resumo = m.resumo?.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:14px">
        ${m.resumo
          .map(
            (r) => `<tr>
              <td style="padding:4px 0;font:${r.forte ? "800 17px" : "14px"} -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:${r.forte ? TINTA : TINTA_2}">${r.rotulo}</td>
              <td align="right" style="padding:4px 0;font:${r.forte ? "800 17px" : "600 14px"} -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:${r.forte ? TINTA : TINTA}">${r.valor}</td>
            </tr>`,
          )
          .join("")}
       </table>`
    : "";

  const aviso = m.aviso
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px">
        <tr><td style="background:${m.aviso.tom === "bom" ? "#e2f1ea" : "#fdf3dd"};border-left:4px solid ${m.aviso.tom === "bom" ? BOM : OURO};border-radius:8px;padding:14px 16px">
          <div style="font:800 13px -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:${m.aviso.tom === "bom" ? BOM : OURO_TXT}">${m.aviso.titulo}</div>
          <div style="margin-top:4px;font:13px/1.5 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:${m.aviso.tom === "bom" ? "#14603f" : OURO_TXT}">${m.aviso.corpo}</div>
        </td></tr>
       </table>`
    : "";

  const botao = m.botao
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:24px">
        <tr><td style="background:${OURO};border-radius:9px">
          <a href="${m.botao.href}" style="display:inline-block;padding:14px 28px;font:800 14px -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:${OURO_TXT};text-decoration:none">${m.botao.rotulo}</a>
        </td></tr>
       </table>`
    : "";

  const entrega = m.entrega?.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px">
        <tr><td style="border-top:1px solid ${LINHA};padding-top:18px">
          <div style="font:800 11px -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;letter-spacing:1.4px;text-transform:uppercase;color:${AZUL_CLARO}">Entrega</div>
          <div style="margin-top:6px;font:14px/1.6 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:${TINTA_2}">${m.entrega.join("<br>")}</div>
        </td></tr>
       </table>`
    : "";

  const assinatura = m.assinatura
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:26px">
        <tr>
          <td width="52" style="vertical-align:top">
            <img src="${base()}/vibrinha.png" width="44" height="44" alt="" style="display:block">
          </td>
          <td style="font:13px/1.55 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:${TINTA_2}">
            <strong style="color:${TINTA}">Vibrinha</strong><br>
            <span style="color:${MUDO}">Qualquer dúvida é só responder este e-mail ou chamar no 11 4000-2440. Falamos de bomba, não é SAC.</span>
          </td>
        </tr>
       </table>`
    : "";

  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<title>${m.titulo}</title></head>
<body style="margin:0;padding:0;background:${FUNDO}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${m.texto[0] ?? m.titulo}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${FUNDO};padding:28px 12px">
<tr><td align="center">
  <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 2px 14px rgba(10,27,77,.07)">

    <tr><td style="background:${AZUL};padding:22px 26px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
        <td>
          <div style="font:800 20px -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;letter-spacing:-.5px;color:#fff">VIBRA VERT</div>
          <div style="margin-top:2px;font:12px -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:rgba(255,255,255,.6)">Bombas Submersas Vibratórias</div>
        </td>
        <td align="right">
          <span style="display:inline-block;background:${OURO};color:${OURO_TXT};border-radius:20px;padding:5px 12px;font:800 10px -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;letter-spacing:1.2px;text-transform:uppercase">${m.etiqueta}</span>
        </td>
      </tr></table>
    </td></tr>

    <tr><td style="padding:28px 26px">
      <h1 style="margin:0 0 10px;font:800 23px/1.25 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;letter-spacing:-.4px;color:${TINTA}">${m.titulo}</h1>
      ${m.texto.map((t) => `<p style="margin:0 0 10px;font:15px/1.6 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:${TINTA_2}">${t}</p>`).join("")}
      ${aviso}${itens}${resumo}${botao}${entrega}${assinatura}
    </td></tr>

    <tr><td style="background:#eef2f9;padding:18px 26px;font:12px/1.65 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:${MUDO}">
      <strong style="color:${TINTA_2}">Vibra Vert Bombas Submersas Vibratórias</strong><br>
      Fábrica desde 1974 · Rua Charles Darwin, 707 · São Paulo/SP<br>
      CNPJ 21.276.576/0001-56 · <a href="${base()}" style="color:${AZUL_CLARO};text-decoration:none">vibravert.com.br</a>
    </td></tr>

  </table>
</td></tr></table>
</body></html>`;
}
