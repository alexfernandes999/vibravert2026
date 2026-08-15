import { ImageResponse } from "next/og";
import { prisma } from "@/lib/prisma";
import { precoPix, parcela, PARCELAS_MAX, DESCONTO_PIX } from "@/lib/formato";

export const alt = "Bomba submersa vibratória Vibra Vert";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Miniatura de cada produto, para quando o link é compartilhado.
 *
 * Antes ia a própria foto do produto, que é a bomba de pé · quase o dobro de
 * altura que de largura. O WhatsApp e o Facebook recortam a miniatura em
 * formato deitado, então o que chegava do outro lado era uma tira horizontal
 * do meio da bomba sobre fundo branco. Ilegível, e ninguém veria isso
 * navegando: a miniatura só existe do lado de quem recebe.
 *
 * Aqui a foto fica inteira à esquerda, e o que decide a compra vai à direita:
 * nome, preço no PIX e a parcela. Numa conversa, a pessoa lê o preço antes de
 * clicar.
 */
const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default async function OG({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const p = await prisma.produto.findUnique({
    where: { slug },
    select: {
      nome: true, marca: true, preco: true, vazaoMaxima: true, pocoPolegadas: true,
      voltagem: true, tipo: true,
      imagens: { where: { principal: true }, select: { url: true }, take: 1 },
    },
  });

  if (!p) {
    return new ImageResponse(
      (
        <div style={{
          width: "100%", height: "100%", display: "flex", alignItems: "center",
          justifyContent: "center", background: "#14307a", color: "#fff",
          fontSize: 54, fontWeight: 800, fontFamily: "sans-serif",
        }}>
          Loja Oficial Vibra Vert
        </div>
      ),
      size,
    );
  }

  const base = process.env.NEXT_PUBLIC_URL || "https://vibravert-loja.vercel.app";
  const foto = p.imagens[0]?.url;
  const src = foto?.startsWith("http") ? foto : foto ? `${base}${foto}` : null;
  const preco = Number(p.preco);
  const bomba = p.tipo === "BOMBA";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%", height: "100%", display: "flex",
          background: "linear-gradient(120deg,#0a1b4d 0%,#14307a 60%,#1f6591 100%)",
          color: "#fff", fontFamily: "sans-serif",
        }}
      >
        {/* A foto num painel claro: a bomba é prateada, e sobre azul escuro
            ela some. */}
        <div style={{
          width: 440, display: "flex", alignItems: "center", justifyContent: "center",
          background: "#fff", padding: 34,
        }}>
          {src && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={src} alt="" width={372} height={562} style={{ objectFit: "contain" }} />
          )}
        </div>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 56px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 34, height: 5, background: "#F5B921" }} />
            <div style={{ fontSize: 18, letterSpacing: 5, color: "#F5B921", fontWeight: 800 }}>
              {p.marca.toUpperCase()}
            </div>
          </div>

          <div style={{
            display: "flex", fontSize: p.nome.length > 62 ? 40 : 48, fontWeight: 800,
            lineHeight: 1.1, letterSpacing: -1.4, marginTop: 16,
          }}>
            {p.nome.length > 90 ? `${p.nome.slice(0, 90)}…` : p.nome}
          </div>

          <div style={{ display: "flex", gap: 26, marginTop: 20, fontSize: 19, color: "rgba(255,255,255,.72)" }}>
            {p.vazaoMaxima ? <span>{p.vazaoMaxima.toLocaleString("pt-BR")} L/h</span> : null}
            {p.pocoPolegadas ? <span>poço {p.pocoPolegadas}&quot;</span> : null}
            {p.voltagem ? <span>{p.voltagem}</span> : null}
          </div>

          <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginTop: 26 }}>
            <span style={{ fontSize: 56, fontWeight: 800, letterSpacing: -2, color: "#F5B921" }}>
              {brl(precoPix(preco))}
            </span>
            <span style={{ fontSize: 21, color: "rgba(255,255,255,.75)" }}>
              no PIX · {DESCONTO_PIX * 100}% off
            </span>
          </div>

          <div style={{ display: "flex", fontSize: 20, marginTop: 8, color: "rgba(255,255,255,.7)" }}>
            ou {PARCELAS_MAX}× de {brl(parcela(preco))} sem juros
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 30 }}>
            {[bomba ? "Frete grátis" : "Direto da fábrica", "Assistência própria"].map((c) => (
              <div key={c} style={{
                display: "flex", padding: "9px 16px", borderRadius: 10,
                background: "rgba(255,255,255,.12)", border: "1px solid rgba(255,255,255,.2)",
                fontSize: 17, fontWeight: 700,
              }}>
                {c}
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    size,
  );
}
