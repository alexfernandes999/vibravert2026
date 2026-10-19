import type { Metadata } from "next";
import Link from "next/link";
import { FormularioGarantia } from "@/components/assistencia/formulario-garantia";
import { WHATSAPP_BONITO, SAC_EMAIL } from "@/lib/contato";

export const metadata: Metadata = {
  title: "Abrir chamado de garantia",
  description: "Abra o chamado de garantia da sua bomba Vibra Vert ou Rymer e receba o protocolo na hora.",
  // Formulário com dados pessoais: não é página para o buscador.
  robots: { index: false, follow: true },
};

export default function AbrirChamado() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-5">
      <p className="text-[10.5px] font-extrabold uppercase tracking-[0.16em] text-marca">Assistência técnica</p>
      <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-balance">Abrir chamado de garantia</h1>
      <p className="mt-2 text-[15px] text-tinta-2">
        Leva uns 5 minutos. Tenha à mão a nota fiscal e a bomba fora do poço para as fotos. O protocolo sai na hora.
      </p>
      <p className="mt-1 text-[13px] text-mudo">
        Já abriu?{" "}
        <Link href="/assistencia/protocolo" className="font-bold text-marca underline">
          Acompanhe pelo protocolo
        </Link>
        .
      </p>

      <div className="mt-6">
        <FormularioGarantia />
      </div>

      <p className="mt-6 text-center text-[12.5px] text-mudo">
        Dúvidas sobre garantia: WhatsApp {WHATSAPP_BONITO} · {SAC_EMAIL}
      </p>
    </div>
  );
}
