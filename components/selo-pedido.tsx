/** Situação do pedido com cor — o mesmo selo no painel e na lista. */
export function Selo({ s }: { s: string }) {
  const cor =
    s === "PAGO" || s === "ENTREGUE" ? "bg-bom-suave text-bom"
    : s === "AGUARDANDO_PAGAMENTO" ? "bg-atencao/10 text-atencao"
    : s === "CANCELADO" || s === "REEMBOLSADO" ? "bg-critico/10 text-critico"
    : "bg-marca-suave text-marca";
  return (
    <span className={`rounded px-2 py-0.5 text-[10px] font-extrabold tracking-wide ${cor}`}>
      {s.replace(/_/g, " ")}
    </span>
  );
}
