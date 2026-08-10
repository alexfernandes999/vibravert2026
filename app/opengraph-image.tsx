import { ImageResponse } from "next/og";

export const alt = "Loja Oficial Vibra Vert · Bombas Submersas Vibratórias";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Imagem de compartilhamento, gerada pelo próprio site.
 *
 * Sem ela, o WhatsApp e o Facebook mostram um retângulo cinza com a URL —
 * e nesta categoria o link circula justamente por WhatsApp, entre instalador
 * e cliente. Gerada em tempo de build, sem serviço externo e sem custo.
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
          padding: "0 90px",
          background: "linear-gradient(135deg,#0a1b4d 0%,#14307a 55%,#1f6591 100%)",
          color: "#fff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 28 }}>
          <div style={{ width: 46, height: 6, background: "#F5B921" }} />
          <div style={{ fontSize: 22, letterSpacing: 6, color: "#F5B921", fontWeight: 800 }}>
            LOJA OFICIAL
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", fontSize: 74, fontWeight: 800, lineHeight: 1.04, letterSpacing: -2 }}>
          <span>Potência e qualidade</span>
          <span>para sua necessidade</span>
        </div>

        <div style={{ display: "flex", fontSize: 27, marginTop: 26, color: "rgba(255,255,255,.72)" }}>
          Bombas submersas vibratórias · Vibra Vert e Rymer
        </div>

        <div style={{ display: "flex", gap: 44, marginTop: 46, fontSize: 21 }}>
          {["Fábrica desde 1974", "Assistência própria", "Entrega nos 27 estados"].map((t) => (
            <div key={t} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 9, height: 9, background: "#F5B921", borderRadius: 9 }} />
              <span style={{ color: "rgba(255,255,255,.9)" }}>{t}</span>
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
