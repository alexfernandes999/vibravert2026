"use client";

import { useState, useTransition } from "react";
import { salvarMarketing } from "@/lib/acoes-marketing";

/**
 * A tela que a agência de tráfego usa.
 *
 * Cada campo diz onde encontrar o valor, porque quem preenche vem do Business
 * Manager e não daqui · e um campo chamado "Token da API de Conversões" sem
 * mais nada é um campo que fica vazio para sempre.
 */
function Copiar({ url }: { url: string }) {
  const [feito, setFeito] = useState(false);
  return (
    <div className="flex items-stretch gap-2">
      <code className="num min-w-0 flex-1 truncate rounded-lg border border-linha bg-fundo px-3 py-2.5 text-[12.5px] text-tinta-2">
        {url}
      </code>
      <button
        type="button"
        onClick={async () => {
          try { await navigator.clipboard.writeText(url); } catch {}
          setFeito(true);
          setTimeout(() => setFeito(false), 2000);
        }}
        className="shrink-0 rounded-lg border border-marca px-3 text-[12.5px] font-bold text-marca"
      >
        {feito ? "copiado ✓" : "copiar"}
      </button>
    </div>
  );
}

function Campo({
  nome, rotulo, dica, valor, tipo = "text", placeholder,
}: {
  nome: string; rotulo: string; dica: string; valor?: string; tipo?: string; placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[13px] font-bold">{rotulo}</span>
      <span className="mb-1.5 block text-[12px] leading-snug text-mudo">{dica}</span>
      <input
        name={nome}
        type={tipo}
        defaultValue={valor}
        placeholder={placeholder}
        autoComplete="off"
        className="num w-full rounded-lg border border-linha-2 bg-superficie px-3 py-2.5 text-[14px]"
      />
    </label>
  );
}

export function FormMarketing({
  pixelMeta, gtmId, googleAds, rotuloCompra, testeCapi, temToken, ativo, base, ofertas, atualizadoEm,
}: {
  pixelMeta: string; gtmId: string; googleAds: string; rotuloCompra: string;
  testeCapi: string; temToken: boolean;
  ativo: boolean; base: string; ofertas: number; atualizadoEm: string | null;
}) {
  const [estado, setEstado] = useState<{ erro?: string; ok?: boolean }>({});
  const [salvando, salvar] = useTransition();

  return (
    <form
      action={(d) => salvar(async () => setEstado((await salvarMarketing(d)) ?? {}))}
      className="mt-6 grid gap-5"
    >
      <fieldset className="rounded-caixa border border-linha bg-superficie p-5">
        <legend className="px-1.5 text-[11.5px] font-extrabold uppercase tracking-wide text-mudo">
          Meta · Facebook e Instagram
        </legend>

        <div className="grid gap-4">
          <Campo
            nome="pixelMeta"
            rotulo="ID do pixel"
            dica="Gerenciador de Eventos → Fontes de dados → o número ao lado do nome. 15 ou 16 dígitos."
            valor={pixelMeta}
            placeholder="123456789012345"
          />

          <label className="block">
            <span className="mb-1 block text-[13px] font-bold">
              Token da API de Conversões
              {temToken && (
                <span className="ml-2 rounded bg-bom/15 px-1.5 py-0.5 text-[10.5px] font-extrabold uppercase text-bom">
                  configurado
                </span>
              )}
            </span>
            <span className="mb-1.5 block text-[12px] leading-snug text-mudo">
              Gerenciador de Eventos → o pixel → Configurações → API de Conversões → Gerar token.
              {temToken && " Deixe em branco para manter o que já está salvo."}
            </span>
            <input
              name="tokenCapi"
              type="password"
              autoComplete="new-password"
              placeholder={temToken ? "••••••••••  já salvo" : "EAAG..."}
              className="w-full rounded-lg border border-linha-2 bg-superficie px-3 py-2.5 text-[14px]"
            />
          </label>

          <Campo
            nome="testeCapi"
            rotulo="Código de teste"
            dica="Só enquanto estiver conferindo no Gerenciador de Eventos. Deixe vazio na operação normal, senão as vendas entram como teste e não contam."
            valor={testeCapi}
            placeholder="TEST12345"
          />
        </div>

        <p className="mt-4 rounded-lg border-l-[3px] border-marca bg-marca-suave px-3.5 py-2.5 text-[12.5px] leading-relaxed text-tinta-2">
          A venda é enviada <b>duas vezes de propósito</b> · uma pelo navegador e outra pelo nosso
          servidor, com o mesmo identificador. O Meta junta as duas e conta uma só. O envio pelo
          servidor existe porque o do navegador se perde: iPhone, bloqueador de anúncios, aba
          fechada antes da hora.
        </p>
      </fieldset>

      <fieldset className="rounded-caixa border border-linha bg-superficie p-5">
        <legend className="px-1.5 text-[11.5px] font-extrabold uppercase tracking-wide text-mudo">
          Google Ads · conversão de compra
        </legend>

        <div className="grid gap-4">
          <Campo
            nome="googleAds"
            rotulo="ID da conta"
            dica="Google Ads → Ferramentas → Conversões → a conversão de compra → Configurar a tag. É o número que aparece como AW-…"
            valor={googleAds}
            placeholder="AW-123456789"
          />
          <Campo
            nome="rotuloCompra"
            rotulo="Rótulo da conversão"
            dica="Na mesma tela, logo abaixo do ID · é a segunda parte, depois da barra. Costuma ser uma sequência de letras e números."
            valor={rotuloCompra}
            placeholder="AbC-D_efGh12ijkLMn"
          />
        </div>

        <p className="mt-4 rounded-lg border-l-[3px] border-atencao bg-atencao/[0.07] px-3.5 py-2.5 text-[12.5px] leading-relaxed text-tinta-2">
          <b className="text-atencao">Isto tem de existir antes de a campanha começar.</b> Sem a
          conversão registrada, o Google não sabe quais cliques viraram venda · a campanha gasta
          às cegas por semanas otimizando para nada, e depois desiste.
          <br />
          <span className="mt-1.5 block text-[12px] text-mudo">
            Depois de salvar, faça um pedido de teste. A conversão aparece no Google Ads em até
            algumas horas · até lá o painel mostra &quot;sem dados&quot;, e isso é normal.
          </span>
        </p>
      </fieldset>

      <fieldset className="rounded-caixa border border-linha bg-superficie p-5">
        <legend className="px-1.5 text-[11.5px] font-extrabold uppercase tracking-wide text-mudo">
          Google Tag Manager
        </legend>
        <Campo
          nome="gtmId"
          rotulo="ID do contêiner"
          dica="tagmanager.google.com → o contêiner do site. É onde a agência coloca as próprias etiquetas sem depender de nós."
          valor={gtmId}
          placeholder="GTM-XXXXXXX"
        />
      </fieldset>

      <label className="flex cursor-pointer items-start gap-2.5 rounded-caixa border border-linha bg-superficie p-4">
        <input type="checkbox" name="ativo" defaultChecked={ativo} className="mt-0.5 h-4 w-4 accent-marca" />
        <span>
          <span className="block text-[13.5px] font-bold">Rastreamento ligado</span>
          <span className="block text-[12px] leading-snug text-mudo">
            Desmarcar desliga tudo sem apagar as chaves · serve para diagnosticar se alguma
            medição está atrapalhando a loja.
          </span>
        </span>
      </label>

      {estado.erro && (
        <p className="rounded-lg border-l-[3px] border-critico bg-critico/[0.06] px-4 py-3 text-[13px] text-critico">
          {estado.erro}
        </p>
      )}
      {estado.ok && (
        <p className="rounded-lg border-l-[3px] border-bom bg-bom/[0.06] px-4 py-3 text-[13px] text-tinta-2">
          <b className="text-bom">Salvo.</b> Já vale na loja · pode conferir no Gerenciador de Eventos.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          disabled={salvando}
          className="rounded-lg bg-marca px-5 py-3 text-[14.5px] font-extrabold text-white disabled:opacity-60"
        >
          {salvando ? "Salvando…" : "Salvar"}
        </button>
        {atualizadoEm && (
          <span className="num text-[12px] text-mudo">última alteração: {atualizadoEm}</span>
        )}
      </div>

      <section className="mt-2 rounded-caixa border border-linha bg-superficie p-5">
        <h2 className="text-[15px] font-extrabold">Catálogo para as campanhas</h2>
        <p className="mt-1 text-[13px] leading-relaxed text-tinta-2">
          <b className="num">{ofertas}</b> produtos, atualizado sozinho a cada hora. O mesmo
          conteúdo em dois endereços de propósito · assim cada plataforma tem o próprio
          agendamento, e quando uma falha dá para saber qual.
        </p>
        <div className="mt-3 grid gap-3">
          <div>
            <p className="mb-1 text-[12px] font-bold">Google Merchant Center</p>
            <Copiar url={`${base}/feed-google`} />
          </div>
          <div>
            <p className="mb-1 text-[12px] font-bold">Catálogo da Meta</p>
            <Copiar url={`${base}/feed-meta`} />
          </div>
        </div>
        <p className="mt-3 text-[12px] leading-relaxed text-mudo">
          O feed anuncia o preço cheio, nunca o do PIX · o desconto vale só num meio de pagamento,
          e anunciar um valor que o checkout não cobra faz a plataforma reprovar o produto.
        </p>

        <a
          href="/admin/marketing/diagnostico"
          target="_blank"
          rel="noopener"
          className="mt-3 inline-block text-[12.5px] font-bold text-marca underline underline-offset-2"
        >
          Ver o diagnóstico completo ↗
        </a>
      </section>

      <section className="rounded-caixa border border-linha bg-superficie p-5">
        <h2 className="text-[15px] font-extrabold">Como conferir se está medindo</h2>
        <ol className="mt-2 grid gap-1.5 pl-5 text-[13px] leading-relaxed text-tinta-2" style={{ listStyle: "decimal" }}>
          <li>No Gerenciador de Eventos da Meta, abra o pixel e veja a atividade em tempo real.</li>
          <li>Abra a loja numa aba normal e navegue por um produto · devem aparecer <b>PageView</b> e <b>ViewContent</b>.</li>
          <li>Uma compra de teste gera <b>um</b> Purchase, não dois · se aparecerem dois, o identificador não bateu e me avise.</li>
        </ol>
        <p className="mt-3 rounded-lg border-l-[3px] border-atencao bg-atencao/[0.07] px-3.5 py-2.5 text-[12.5px] leading-relaxed text-tinta-2">
          <b className="text-atencao">Confira com um navegador de verdade.</b> A Meta ignora
          eventos vindos de navegador automatizado · um teste automático mostra &quot;não envia
          nada&quot; mesmo com tudo certo.
        </p>
      </section>
    </form>
  );
}
