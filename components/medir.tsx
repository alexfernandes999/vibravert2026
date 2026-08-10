"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Avisa o servidor que a página foi vista, depois de ela já estar na tela.
 *
 * `keepalive` garante o envio mesmo se a pessoa sair no mesmo instante — sem
 * ele, quem abre e fecha rápido some da medição, justamente o comportamento
 * que mais interessa entender.
 */
export function Medir({ etapa }: { etapa: "VISITA" | "PRODUTO" }) {
  const caminho = usePathname();

  useEffect(() => {
    const t = setTimeout(() => {
      fetch("/api/evento", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ etapa }),
        keepalive: true,
      }).catch(() => {});
    }, 400);
    return () => clearTimeout(t);
  }, [caminho, etapa]);

  return null;
}
