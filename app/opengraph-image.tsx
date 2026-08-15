import { ImageResponse } from "next/og";

export const alt = "Loja Oficial Vibra Vert · Bomba sapo direto da fábrica";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Imagem de compartilhamento, gerada pelo próprio site.
 *
 * Sem ela, o WhatsApp e o Facebook mostram um retângulo cinza com a URL · e
 * nesta categoria o link circula justamente por WhatsApp, entre instalador e
 * cliente. Gerada em tempo de build, sem serviço externo e sem custo.
 *
 * Trazia o slogan antigo, "Potência e qualidade para sua necessidade", que
 * saiu do site quando o título mudou. Quem compartilhava o link mostrava uma
 * frase que a loja já não usa · e ninguém veria isso navegando, porque a
 * miniatura só aparece do lado de quem recebe.
 *
 * As três ofertas entram porque a miniatura é lida de relance, dentro de uma
 * conversa: o que decide o toque é frete grátis, desconto e garantia, não a
 * descrição do produto.
 */
export default function OG() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "0 88px",
          background: "linear-gradient(135deg,#0a1b4d 0%,#14307a 55%,#1f6591 100%)",
          color: "#fff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 26 }}>
          <div style={{ width: 46, height: 6, background: "#F5B921" }} />
          <div style={{ fontSize: 21, letterSpacing: 6, color: "#F5B921", fontWeight: 800 }}>
            LOJA OFICIAL DA FÁBRICA
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            fontSize: 72,
            fontWeight: 800,
            lineHeight: 1.03,
            letterSpacing: -2.5,
          }}
        >
          <span>Bomba sapo direto</span>
          <span>da fábrica</span>
        </div>

        <div style={{ display: "flex", fontSize: 27, marginTop: 24, color: "rgba(255,255,255,.74)" }}>
          Vibra Vert e Rymer · para poço de 6&quot; e 8&quot; · fabricação brasileira desde 1974
        </div>

        {/* As ofertas em caixa, e não em lista de marcadores: numa miniatura de
            conversa, bloco com fundo lê antes de texto solto. */}
        <div style={{ display: "flex", gap: 14, marginTop: 44 }}>
          {[
            { t: "Frete grátis", d: "em todas as bombas", ouro: true },
            { t: "10% no PIX", d: "ou 10× sem juros", ouro: false },
            { t: "2 anos", d: "de garantia de fábrica", ouro: false },
          ].map((c) => (
            <div
              key={c.t}
              style={{
                display: "flex",
                flexDirection: "column",
                padding: "16px 22px",
                borderRadius: 14,
                background: c.ouro ? "#F5B921" : "rgba(255,255,255,.1)",
                border: c.ouro ? "none" : "1px solid rgba(255,255,255,.2)",
              }}
            >
              <span
                style={{
                  fontSize: 30,
                  fontWeight: 800,
                  letterSpacing: -0.6,
                  color: c.ouro ? "#3d2c00" : "#fff",
                }}
              >
                {c.t}
              </span>
              <span
                style={{
                  fontSize: 18,
                  marginTop: 4,
                  color: c.ouro ? "rgba(61,44,0,.75)" : "rgba(255,255,255,.7)",
                }}
              >
                {c.d}
              </span>
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
