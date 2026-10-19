import type { StatusChamado } from "@prisma/client";
import { ROTULO_STATUS } from "@/lib/assistencia/portal";

export function SeloStatus({ s }: { s: StatusChamado }) {
  const r = ROTULO_STATUS[s];
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-extrabold ${r.cor}`}>{r.r}</span>;
}
