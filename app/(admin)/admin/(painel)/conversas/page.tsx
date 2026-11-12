import { redirect } from "next/navigation";

/** O chat do site agora fica em Clientes e conversas, junto com o resto do contato. */
export default function Conversas() {
  redirect(`/admin/clientes?origem=${encodeURIComponent("Chat do site")}`);
}
