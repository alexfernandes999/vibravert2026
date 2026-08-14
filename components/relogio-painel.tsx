"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

/**
 * Relógio e botão de atualizar, no alto do painel.
 *
 * O relógio não é enfeite: a tela inteira fala em tempo relativo · "parado há
 * 3 h", "chega em 5 dias úteis", "últimos 30 dias". Sem a hora à vista, não se
 * sabe contra o quê esses números estão contando. E é a hora de Brasília, não
 * a do computador: quem opera de outro fuso via prazos errados.
 *
 * O botão recarrega os dados sem recarregar a página inteira · a rolagem fica
 * onde estava, o que importa para quem passa o dia numa lista de pedidos.
 *
 * A hora só é desenhada depois de montar no navegador. Renderizar no servidor
 * daria um horário e o navegador outro no mesmo segundo, e o React acusaria a
 * diferença.
 */
const FUSO = "America/Sao_Paulo";

export function RelogioPainel() {
  const [agora, setAgora] = useState<Date | null>(null);
  const [atualizando, iniciar] = useTransition();
  const router = useRouter();

  useEffect(() => {
    setAgora(new Date());
    const t = setInterval(() => setAgora(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const hora = agora
    ? new Intl.DateTimeFormat("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        timeZone: FUSO,
      }).format(agora)
    : "--:--:--";

  const dia = agora
    ? new Intl.DateTimeFormat("pt-BR", {
        weekday: "short",
        day: "2-digit",
        month: "short",
        timeZone: FUSO,
      })
        .format(agora)
        .replace(".", "")
    : "";

  return (
    <div className="flex items-center gap-2">
      <div className="rounded-caixa border border-linha bg-superficie px-3 py-1.5 text-right leading-tight">
        <p className="num text-[15px] font-extrabold tracking-tight tabular-nums">{hora}</p>
        <p className="text-[10.5px] font-semibold capitalize text-mudo">{dia || "carregando"}</p>
      </div>

      <button
        onClick={() => iniciar(() => router.refresh())}
        disabled={atualizando}
        title="Buscar os números de novo"
        aria-label="Atualizar os dados"
        className="grid h-[46px] w-[46px] place-items-center rounded-caixa border border-linha bg-superficie text-marca transition hover:border-marca hover:bg-marca-suave active:scale-95 disabled:opacity-60"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`h-5 w-5 ${atualizando ? "animate-spin" : ""}`}
        >
          <path d="M20.5 12a8.5 8.5 0 11-2.5-6" />
          <path d="M20.5 4.5V10H15" />
        </svg>
      </button>
    </div>
  );
}
