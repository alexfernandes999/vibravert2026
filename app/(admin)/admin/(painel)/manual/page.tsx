import Link from "next/link";
import { Tela, Legenda, Marca, Botao, Campo, Foto } from "@/components/manual-tela";

export const metadata = { title: "Manual de uso" };

/**
 * O manual, dentro do painel.
 *
 * Manual em PDF é manual que ninguém acha. Este mora no mesmo lugar onde a
 * dúvida aparece, e é organizado por tarefa · "preciso trocar uma foto", não
 * "tela de produtos". Ninguém abre um manual para ler: abre para destravar.
 *
 * O que dá errado tem espaço próprio em cada seção. A parte mais útil de um
 * manual é a que explica o que fazer quando o caminho feliz não aconteceu.
 */

function Secao({
  n,
  titulo,
  resumo,
  children,
}: {
  n: string;
  titulo: string;
  resumo: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-linha pt-7">
      <span className="num text-[11px] font-extrabold tracking-[0.14em] text-marca">{n}</span>
      <h2 className="mt-1.5 text-[21px] font-extrabold tracking-tight">{titulo}</h2>
      <p className="mt-1.5 max-w-2xl text-[14.5px] leading-relaxed text-tinta-2">{resumo}</p>
      <div className="mt-4 grid gap-3">{children}</div>
    </section>
  );
}

function Passo({ href, o, children }: { href?: string; o: string; children: React.ReactNode }) {
  return (
    <div className="rounded-caixa border border-linha bg-superficie p-4">
      <h3 className="text-[14.5px] font-extrabold">
        {href ? (
          <Link href={href} className="text-marca hover:underline">
            {o} ↗
          </Link>
        ) : (
          o
        )}
      </h3>
      <div className="mt-1.5 text-[13.8px] leading-relaxed text-tinta-2">{children}</div>
    </div>
  );
}

function Cuidado({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-2.5 rounded-lg border-l-[3px] border-atencao bg-atencao/[0.07] px-3.5 py-2.5 text-[13px] leading-relaxed">
      {children}
    </p>
  );
}

export default function Manual() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-9">
      <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-marca">
        Loja Oficial Vibra Vert
      </p>
      <h1 className="mt-2 text-[30px] font-extrabold leading-tight tracking-tight">
        Como usar o painel
      </h1>
      <p className="mt-3 max-w-2xl text-[15.5px] leading-relaxed text-tinta-2">
        Organizado por tarefa, não por tela. Procure o que você precisa fazer · cada parte diz
        onde clicar, o que a loja faz sozinha e o que costuma dar errado.
      </p>

      <nav className="mt-6 flex flex-wrap gap-2">
        {[
          ["Uma venda, do início ao fim", "#venda"],
          ["Catálogo", "#catalogo"],
          ["Página inicial", "#home"],
          ["Vendas paradas", "#paradas"],
          ["Revenda", "#revenda"],
          ["Acessos", "#acessos"],
          ["Quando algo para", "#quebrou"],
        ].map(([r, h]) => (
          <a
            key={h}
            href={h}
            className="rounded-lg border border-linha bg-superficie px-3 py-1.5 text-[12.5px] font-bold text-marca"
          >
            {r}
          </a>
        ))}
      </nav>

      <Tela titulo="vibravert-loja.vercel.app/admin">
        <div className="grid grid-cols-[128px_1fr] gap-3">
          <div className="rounded-md border border-linha bg-superficie-2 p-2">
            <div className="mb-2 h-4 w-16 rounded bg-marca/25" />
            {[
              ["Painel", 0], ["Pedidos", 1], ["Produtos", 2], ["Estoque", 0],
              ["Recuperar vendas", 0], ["Revenda", 0],
            ].map(([r, n]) => (
              <div key={String(r)} className="relative flex items-center gap-1 py-[3px] text-[10.5px] font-semibold text-tinta-2">
                {n ? <Marca n={n as number} /> : <span className="w-[19px]" />}
                {r}
              </div>
            ))}
            <div className="mt-2 text-[8px] font-extrabold uppercase tracking-wider text-tenue">Loja</div>
            {["Vitrine da home", "Banners", "Vídeos"].map((r) => (
              <div key={r} className="py-[3px] pl-[19px] text-[10.5px] font-semibold text-tinta-2">{r}</div>
            ))}
            <div className="mt-2 text-[8px] font-extrabold uppercase tracking-wider text-tenue">Conta</div>
            {[["Segurança", 0], ["Equipe e acessos", 3], ["Integrações", 4], ["Manual de uso", 0]].map(([r, n]) => (
              <div key={String(r)} className="relative flex items-center gap-1 py-[3px] text-[10.5px] font-semibold text-tinta-2">
                {n ? <Marca n={n as number} /> : <span className="w-[19px]" />}
                {r}
              </div>
            ))}
          </div>
          <div className="grid content-start gap-2">
            <div className="h-4 w-40 rounded bg-linha-2/60" />
            <div className="grid grid-cols-3 gap-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-12 rounded-md border border-linha bg-superficie" />
              ))}
            </div>
            <div className="h-24 rounded-md border border-linha bg-superficie" />
          </div>
        </div>
      </Tela>

      <Legenda
        itens={[
          [1, "Pedidos", "leva um número vermelho enquanto houver pedido esperando separação. É o único lugar do menu que cobra atenção sozinho"],
          [2, "Produtos", "catálogo, fotos, preço e o botão de cadastrar produto novo"],
          [3, "Equipe e acessos", "só o Dono e o Desenvolvedor enxergam. O Operador nem vê o item no menu"],
          [4, "Integrações", "se o Bling está de pé e até quando a autorização vale"],
        ]}
      />

      <div className="mt-9 grid gap-9">
        <section id="venda" className="scroll-mt-6">
          <Secao
            n="01"
            titulo="Uma venda, do início ao fim"
            resumo="O caminho que todo pedido percorre. A loja faz sozinha as três primeiras etapas · você entra a partir da separação."
          >
            <Passo o="O cliente paga">
              O pagamento é confirmado pelo Mercado Pago, não pelo navegador do cliente. Se ele
              fechar a aba depois de pagar, o pedido é marcado como pago do mesmo jeito. O
              estoque só baixa quando o dinheiro entra · reservar no clique deixaria peça presa
              em carrinho abandonado.
            </Passo>

            <Passo href="/admin/pedidos" o="O pedido aparece em Pedidos">
              Com selo vermelho no menu enquanto houver pedido esperando separação. O cliente
              recebe e-mail automático em <b>pedido@vibravert.com.br</b>.
            </Passo>

            <Passo o="Você separa e compra a etiqueta">
              Dentro do pedido há o botão de comprar a etiqueta no SuperFrete. Ela sai no
              formato configurado e pode ser reimpressa · o link fica guardado no pedido, então
              etiqueta perdida não é etiqueta paga duas vezes.
              <Cuidado>
                A compra de etiqueta usa saldo do SuperFrete. Sem saldo, o botão falha · quem
                carrega é o Alex, pela conta deles.
              </Cuidado>
            </Passo>

            <Passo o="O pedido sobe para o Bling">
              A loja cria o <b>pedido de venda</b> no Bling, com cliente, endereço, itens e
              frete. Ele chega identificado com o número do pedido da loja, no campo Nº da loja.
            </Passo>

            <Passo o="A nota fiscal é emitida no Bling">
              De propósito: a loja <b>não</b> emite nota sozinha. Endereço de outro estado muda o
              CFOP, cliente com inscrição estadual muda a tributação, e nota autorizada errada
              não se apaga · cancela-se, com prazo e explicação. Quem responde pelo fiscal
              aperta o botão lá, olhando.
            </Passo>
          </Secao>
        </section>

        <section id="catalogo" className="scroll-mt-6">
          <Secao
            n="02"
            titulo="Catálogo"
            resumo="Produtos, fotos, preço e estoque. É a parte que você mais vai usar."
          >
            <Passo href="/admin/produtos" o="Trocar uma foto">
              Abra o produto pela lista. As fotos ficam à esquerda.

              <Tela titulo="Produtos › Bomba Submersa Rymer 1500">
                <div className="grid grid-cols-[142px_1fr] gap-4">
                  <div>
                    <div className="relative">
                      <span className="absolute -left-2 -top-2"><Marca n={1} flutua /></span>
                      <Foto capa />
                    </div>
                    <div className="mt-1.5 grid grid-cols-4 gap-1.5">
                      <div className="relative">
                        <span className="absolute -left-2 -top-2"><Marca n={2} flutua /></span>
                        <Foto />
                      </div>
                      <Foto /><Foto /><Foto />
                    </div>
                    <div className="relative mt-2">
                      <span className="absolute -left-2 -top-2"><Marca n={3} flutua /></span>
                      <Botao cor="linha">Adicionar foto</Botao>
                    </div>
                    <div className="relative mt-2.5 rounded-md border-l-2 border-bom bg-bom/[0.07] px-2 py-1.5 text-[9.5px] leading-snug text-tinta-2">
                      <span className="absolute -left-2 -top-2"><Marca n={4} flutua /></span>
                      <b className="text-bom">Confere com o Bling.</b> RY-15A
                    </div>
                  </div>
                  <div className="grid content-start gap-2">
                    <Campo r="Nome do produto" v="Bomba Submersa Rymer 1500…" />
                    <div className="grid grid-cols-2 gap-2">
                      <Campo r="Preço" v="296,91" />
                      <Campo r="Preço de" v="" />
                    </div>
                    <Campo r="SKU" v="RY-15A" />
                  </div>
                </div>
              </Tela>

              <Legenda
                itens={[
                  [1, "A capa", "marcada em azul e sempre primeira. É a foto que aparece na busca da loja, no Google e no link compartilhado no WhatsApp"],
                  [2, "As outras", "passe o mouse por cima e aparecem os botões: virar capa, mover para os lados, ou apagar"],
                  [3, "Adicionar foto", "sobe na hora. Não precisa salvar o formulário depois"],
                  [4, "O selo do Bling", "verde quando o SKU existe lá, vermelho quando não. Consulta de verdade, toda vez que a tela abre"],
                ]}
              />
            </Passo>

            <Passo href="/admin/produtos/novo" o="Cadastrar um produto novo">
              Botão <b>+ Novo produto</b>, no alto da lista de produtos.

              <Tela titulo="Produtos › Novo produto">
                <div className="grid gap-2">
                  <Campo r="Nome do produto *" v="" />
                  <div className="grid grid-cols-2 gap-2">
                    <div className="relative">
                      <span className="absolute -left-2 -top-2"><Marca n={1} flutua /></span>
                      <Campo r="SKU *" v="" />
                    </div>
                    <Campo r="Marca" v="Vibra Vert" />
                  </div>
                  <div className="relative rounded-md border-l-2 border-atencao bg-atencao/[0.09] px-2 py-1.5 text-[9.5px] leading-snug text-tinta-2">
                    <span className="absolute -left-2 -top-2"><Marca n={2} flutua /></span>
                    <b className="text-atencao">O SKU precisa ser o mesmo código do Bling.</b> Se não bater, a nota não sai.
                  </div>
                  <div className="relative">
                    <span className="absolute -left-2 -top-2"><Marca n={3} flutua /></span>
                    <Campo r="Tipo" v="Peça · paga frete" />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <Campo r="Preço *" v="" /><Campo r="Preço de" v="" /><Campo r="Estoque" v="" />
                  </div>
                  <div className="relative">
                    <span className="absolute -left-2 -top-2"><Marca n={4} flutua /></span>
                    <span className="mb-1 block text-[10px] font-bold text-tinta-2">Fotos</span>
                    <div className="grid w-1/2 grid-cols-4 gap-1.5">
                      <Foto capa /><Foto /><Foto />
                      <span className="grid place-items-center rounded-md border border-dashed border-linha-2 text-[13px] text-tenue">+</span>
                    </div>
                  </div>
                  <div className="relative mt-1">
                    <span className="absolute -left-2 -top-2"><Marca n={5} flutua /></span>
                    <Botao>Cadastrar e continuar</Botao>
                  </div>
                </div>
              </Tela>

              <Legenda
                itens={[
                  [1, "SKU", "o código do produto. Vai marcado com asterisco porque sem ele não dá para cadastrar"],
                  [2, "O aviso amarelo", "leia antes de digitar o SKU. É o erro que mais custa caro depois"],
                  [3, "Tipo", "decide o frete grátis. Bomba nunca paga frete; peça, kit e acessório pagam"],
                  [4, "Fotos", "dá para escolher várias de uma vez. A primeira vira a capa"],
                  [5, "Cadastrar e continuar", "leva direto para a ficha completa. O produto nasce desativado · você publica quando terminar"],
                ]}
              />
              <Cuidado>
                <b>O SKU tem de ser o mesmo código do Bling.</b> É por ele que o pedido acha o
                produto lá e é de lá que vêm o NCM e o CFOP da nota. A ficha do produto confere
                isso sozinha e avisa em vermelho quando não bate. Repare na pontuação: para o
                Bling, <span className="num">3.001</span> e <span className="num">3001</span> são
                códigos diferentes.
              </Cuidado>
            </Passo>

            <Passo o="O tipo decide o frete">
              Bomba tem frete grátis sempre. Peça, kit avulso e acessório pagam frete calculado.
              Marcar uma peça como bomba faz a loja pagar o envio de um item de trinta reais.
            </Passo>

            <Passo href="/admin/estoque" o="Estoque">
              Selo vermelho no menu quando algo chega a cinco unidades ou menos. O estoque baixa
              sozinho a cada pagamento confirmado.
            </Passo>
          </Secao>
        </section>

        <section id="home" className="scroll-mt-6">
          <Secao
            n="03"
            titulo="A página inicial"
            resumo="O que o visitante vê antes de procurar qualquer coisa."
          >
            <Passo href="/admin/vitrine" o="Vitrine da loja">
              As duas prateleiras da home, com as vagas que a loja realmente mostra. A vaga
              vazia aparece como vaga · é assim que se entende que existe espaço sobrando.
            </Passo>
            <Passo href="/admin/banners" o="Banners">
              A arte por posição. Sobe a imagem, escolhe o link e liga.
            </Passo>
            <Passo href="/admin/videos" o="Vídeos">
              Cole o endereço do YouTube como estiver · a loja extrai o código sozinha.
            </Passo>
          </Secao>
        </section>

        <section id="paradas" className="scroll-mt-6">
          <Secao
            n="04"
            titulo="Vendas paradas"
            resumo="A venda mais barata que existe: a pessoa escolheu a bomba, digitou o endereço e parou na hora de pagar."
          >
            <Passo href="/admin/recuperar-vendas" o="Recuperar vendas">
              Já se sabe o nome, o telefone e o que ela queria. Falta chamar. O botão de WhatsApp
              abre a conversa com a mensagem pronta.
              <Cuidado>
                A espera muda conforme o pagamento. PIX e cartão são imediatos · meia hora sem
                confirmação já é abandono. Boleto compensa em até três dias úteis: cobrar em meia
                hora é cobrar alguém que já pagou e o banco ainda não repassou.
              </Cuidado>
            </Passo>
          </Secao>
        </section>

        <section id="revenda" className="scroll-mt-6">
          <Secao
            n="05"
            titulo="Revenda"
            resumo="Cadastros B2B esperando liberação."
          >
            <Passo href="/admin/revenda" o="Aprovar um revendedor">
              O CNPJ já chega validado e conferido na Receita. O que sobra para decidir é se
              libera a tabela · e qual faixa de desconto. A aprovação não é automática de
              propósito.
            </Passo>
          </Secao>
        </section>

        <section id="acessos" className="scroll-mt-6">
          <Secao
            n="06"
            titulo="Acessos"
            resumo="Uma conta por pessoa. Senha compartilhada não diz quem mexeu no preço."
          >
            <Passo href="/admin/equipe" o="Criar e tirar acesso">
              Só o Dono e o Desenvolvedor veem esta tela. Cada pessoa tem seu próprio segundo
              fator, no próprio celular. Tirar o acesso de alguém não obriga a trocar a senha de
              todo mundo, e o registro mostra quem fez o quê.
            </Passo>
            <Passo href="/admin/seguranca" o="Seu autenticador">
              O QR só aparece depois da senha, mesmo com você já logado · a sessão prova que
              você entrou, não que ainda é você na frente do computador.
              <Cuidado>
                Se o código nunca bate, quase sempre é o relógio do celular fora do automático.
              </Cuidado>
            </Passo>
          </Secao>
        </section>

        <section id="quebrou" className="scroll-mt-6">
          <Secao
            n="07"
            titulo="Quando algo para"
            resumo="O que checar antes de ligar para alguém."
          >
            <Passo href="/admin/integracoes" o="Integrações">
              Mostra se o Bling está de pé e até quando a autorização vale.
              <Cuidado>
                A autorização do Bling vence em <b>30 dias</b>. Ela se renova sozinha a cada uso,
                então em operação normal nunca cai · mas 30 dias sem nenhuma venda derrubam a
                conexão. A tela avisa em amarelo uma semana antes. Para religar: abrir o link de
                convite e autorizar de novo.
              </Cuidado>
            </Passo>
            <Passo o="O pedido não subiu para o Bling">
              Quase sempre é SKU que não existe lá. Abra o produto e veja o selo do Bling na
              ficha · ele diz o código exato que falta cadastrar.
            </Passo>
            <Passo o="O frete não calcula">
              O produto precisa ter peso da caixa. Sem peso, o cálculo não sai · o campo está na
              ficha do produto.
            </Passo>
            <Passo o="Um pedido pago não apareceu">
              O Mercado Pago avisa a loja por conta própria e reenvia se falhar. Antes de
              qualquer coisa, atualize a tela de pedidos: o aviso pode levar alguns minutos.
            </Passo>
          </Secao>
        </section>
      </div>

      <p className="mt-10 border-t border-linha pt-5 text-[13px] leading-relaxed text-mudo">
        Esta página acompanha o painel · quando algo muda, muda aqui junto. Se você procurou uma
        coisa e não achou, isso é uma falha do manual, não sua.
      </p>
    </div>
  );
}
