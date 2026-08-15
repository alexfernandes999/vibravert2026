/**
 * Fundo de água para a seção de matérias.
 *
 * O corte técnico do poço, com camadas e cotas, ficava pesado atrás do texto:
 * era um diagrama de manual competindo com a leitura. Aqui a água é
 * atmosfera · camadas de onda que se sobrepõem, luz vindo da superfície e
 * bolhas subindo devagar.
 *
 * O movimento é só deslocamento horizontal das ondas e uma subida lenta das
 * bolhas. Nada muda de tamanho nem de forma, então o navegador anima tudo na
 * placa de vídeo, sem recalcular layout a cada quadro.
 *
 * Some inteiro para quem pediu menos animação no sistema.
 */
export function FundoAgua({ className = "" }: { className?: string }) {
  return (
    <div className={`pointer-events-none overflow-hidden ${className}`} aria-hidden>
      {/* A luz que entra pela superfície, mais forte no alto. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, color-mix(in srgb, var(--color-marca) 12%, transparent) 0%, color-mix(in srgb, var(--color-marca) 4%, transparent) 45%, transparent 100%)",
        }}
      />

      {/* Três camadas de onda em velocidades diferentes. A diferença de ritmo
          é o que dá sensação de profundidade · com todas no mesmo passo, o
          conjunto parece um adesivo deslizando. */}
      {[
        { d: 22, o: 0.1, y: "12%", a: 34 },
        { d: 31, o: 0.075, y: "34%", a: 46 },
        { d: 44, o: 0.05, y: "58%", a: 58 },
      ].map((c, i) => (
        <svg
          key={i}
          className="onda absolute left-0 h-[42%] w-[200%]"
          style={{ top: c.y, opacity: c.o, animationDuration: `${c.d}s` }}
          viewBox="0 0 1200 120"
          preserveAspectRatio="none"
        >
          <path
            fill="var(--color-marca)"
            d={`M0 ${c.a} q75 -${c.a * 0.7} 150 0 t150 0 t150 0 t150 0 t150 0 t150 0 t150 0 t150 0 V120 H0Z`}
          />
        </svg>
      ))}

      {/* Bolhas subindo. Poucas e de tamanhos diferentes: uma chuva delas
          viraria protetor de tela. */}
      {[
        { x: "14%", t: 9, d: 0, r: 7 },
        { x: "27%", t: 13, d: 2.5, r: 4 },
        { x: "48%", t: 11, d: 5, r: 9 },
        { x: "63%", t: 15, d: 1.2, r: 5 },
        { x: "79%", t: 10, d: 6.5, r: 6 },
        { x: "91%", t: 14, d: 3.4, r: 3.5 },
      ].map((b, i) => (
        <span
          key={i}
          className="bolha absolute rounded-full border"
          style={{
            left: b.x,
            width: b.r * 2,
            height: b.r * 2,
            borderColor: "color-mix(in srgb, var(--color-marca) 28%, transparent)",
            background: "color-mix(in srgb, var(--color-marca) 8%, transparent)",
            animationDuration: `${b.t}s`,
            animationDelay: `${b.d}s`,
          }}
        />
      ))}
    </div>
  );
}
