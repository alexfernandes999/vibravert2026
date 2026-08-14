import Image from "next/image";

/**
 * O bom-dia de quem abre o painel.
 *
 * "Visão comercial" é o nome de uma tela, não uma recepção. Quem entra aqui
 * abre o mesmo endereço várias vezes por dia, e reconhecer a pessoa e a hora
 * custa nada e muda o tom da ferramenta inteira.
 *
 * A hora é calculada no servidor, em Brasília: o painel é operado em São Paulo,
 * e usar o relógio do navegador daria "boa noite" para quem abrisse de outro
 * fuso.
 */
function periodo() {
  const h = Number(
    new Intl.DateTimeFormat("pt-BR", {
      hour: "numeric",
      hour12: false,
      timeZone: "America/Sao_Paulo",
    }).format(new Date()),
  );
  if (h < 12) return { saudacao: "Bom dia", fala: "Café na mão? Vamos ver como a loja acordou." };
  if (h < 18) return { saudacao: "Boa tarde", fala: "Vim te mostrar como está o dia até agora." };
  return { saudacao: "Boa noite", fala: "Fechando o dia. Olha só o que rolou." };
}

/** Só o primeiro nome, e com a inicial maiúscula mesmo se o cadastro veio torto. */
const primeiroNome = (nome: string) => {
  const n = nome.trim().split(/\s+/)[0] ?? "";
  return n.charAt(0).toLocaleUpperCase("pt-BR") + n.slice(1).toLocaleLowerCase("pt-BR");
};

export function Saudacao({ nome }: { nome: string }) {
  const { saudacao, fala } = periodo();
  return (
    <div className="flex items-center gap-3">
      <Image
        src="/vibrinha.png"
        alt=""
        width={46}
        height={46}
        className="h-[46px] w-[46px] shrink-0 rounded-full bg-marca-suave"
        priority
      />
      <div className="min-w-0">
        <h1 className="text-xl font-extrabold tracking-tight">
          {saudacao}, {primeiroNome(nome)}
        </h1>
        <p className="text-[12.5px] text-mudo">{fala}</p>
      </div>
    </div>
  );
}
