import type { Metadata } from "next";
import { ConsultaProtocolo } from "@/components/assistencia/protocolo-cliente";

export const metadata: Metadata = {
  title: "Acompanhar chamado",
  robots: { index: false, follow: true },
};

export default function Acompanhar() {
  return (
    <div className="mx-auto max-w-md px-4 py-12 sm:px-5">
      <p className="text-[10.5px] font-extrabold uppercase tracking-[0.16em] text-marca">Assistência técnica</p>
      <h1 className="mt-2 text-3xl font-extrabold tracking-tight">Acompanhar chamado</h1>
      <p className="mt-2 mb-6 text-[15px] text-tinta-2">Informe o protocolo e o CPF ou CNPJ usado na abertura.</p>
      <ConsultaProtocolo />
    </div>
  );
}
