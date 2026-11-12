import { redirect } from "next/navigation";

/** O chat do site agora fica em Atendimento, junto com o formulário e o WhatsApp. */
export default function Conversas() {
  redirect(`/admin/atendimento?canal=${encodeURIComponent("Chat do site")}`);
}
