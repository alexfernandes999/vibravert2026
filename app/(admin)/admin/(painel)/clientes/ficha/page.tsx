import { redirect } from "next/navigation";

/** Endereço antigo da ficha: agora ela abre dentro da tela de Clientes. */
export default async function Ficha({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const p = new URLSearchParams(await searchParams);
  redirect(`/admin/clientes?${p}`);
}
