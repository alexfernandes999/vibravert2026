"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Avisa o servidor que a página foi vista, depois de ela já estar na tela.
 *
 * `keepalive` garante o envio mesmo se a pessoa sair no mesmo instante — sem
 * ele, quem abre e fecha rápido some da medição, justamente o comportamento
 * que mais interessa entender.
 *
 * O referenciador e as UTMs vão no corpo. O cabeçalho referer desta chamada é
 * a própria loja, e por isso toda visita era gravada como "direto": o painel
 * dizia que 100% do tráfego chegava digitando o endereço.
 */
export function Medir({ etapa }: { etapa: "VISITA" | "PRODUTO" }) {
  const caminho = usePathname();

  useEffect(() => {
    const t = setTimeout(() => {
      fetch("/api/evento", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          etapa,
          ref: document.referrer,
          utm: Object.fromEntries(
            [...new URLSearchParams(location.search)].filter(([k]) => k.startsWith("utm_") || k === "gclid" || k === "fbclid"),
          ),
        }),
        keepalive: true,
      }).catch(() => {});
    }, 400);
    return () => clearTimeout(t);
  }, [caminho, etapa]);

  return null;
}
