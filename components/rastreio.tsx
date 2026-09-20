"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * Pixel da Meta, Google Analytics 4, Google Ads e Tag Manager.
 *
 * Carregam desde a primeira visita, sem esperar aceite de cookies. Não é
 * descuido · é a diferença entre medir e não medir. Quando o rastreio só sobe
 * depois do aceite, NENHUMA ferramenta de verificação o encontra: o teste do
 * Google, o Pixel Helper e o configurador de eventos entram sem aceitar nada e
 * veem um site morto. É o comportamento de Tray, Nuvemshop e da maioria das
 * lojas brasileiras.
 *
 * Os scripts entram com `afterInteractive`: a loja pinta primeiro, a medição
 * depois. Medir mais rápido não vende nada; carregar mais rápido, sim.
 */
declare global {
  interface Window {
    fbq?: ((...a: unknown[]) => void) & { queue?: unknown[]; loaded?: boolean; version?: string; callMethod?: (...a: unknown[]) => void };
    _fbq?: unknown;
    dataLayer?: unknown[];
    gtag?: (...a: unknown[]) => void;
  }
}

export function Rastreio({
  pixel,
  gtm,
  ga4,
  ads,
}: {
  pixel: string | null;
  gtm: string | null;
  /** Medição do Google · G-… Uma só na loja inteira. */
  ga4: string | null;
  /** Conta do Google Ads · AW-… É o que liga o clique pago à venda. */
  ads: string | null;
}) {
  const caminho = usePathname();
  const primeira = useRef(true);

  /**
   * PageView a cada troca de página.
   *
   * Numa loja em React a página não recarrega · sem isto o Meta enxergaria uma
   * visita só, por mais que a pessoa navegue por vinte produtos.
   */
  useEffect(() => {
    if (!pixel && !ga4) return;
    if (primeira.current) {
      primeira.current = false; // o init já dispara o primeiro
      return;
    }
    if (pixel) window.fbq?.("track", "PageView");
    // O gtag também só conta a primeira tela sozinho.
    if (ga4) window.gtag?.("event", "page_view", { page_path: caminho, send_to: ga4 });
  }, [caminho, pixel, ga4]);

  return (
    <>
      {pixel && (
        <Script id="meta-pixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init','${pixel}');fbq('track','PageView');`}
        </Script>
      )}

      {/* Uma biblioteca gtag só, com uma configuração por conta. Carregar o
          script duas vezes · uma para o Analytics e outra para o Ads · é o que
          faz a mesma sessão e a mesma compra contarem em dobro. */}
      {(ga4 || ads) && (
        <>
          <Script
            id="gtag-src"
            strategy="afterInteractive"
            src={`https://www.googletagmanager.com/gtag/js?id=${ga4 || ads}`}
          />
          <Script id="gtag" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}
gtag('js',new Date());
${ga4 ? `gtag('config','${ga4}');` : ""}${ads ? `gtag('config','${ads}');` : ""}`}
          </Script>
        </>
      )}

      {gtm && (
        <Script id="gtm" strategy="afterInteractive">
          {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),
event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),
dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;
f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${gtm}');`}
        </Script>
      )}
    </>
  );
}

/* ── os quatro momentos que a campanha usa para aprender ──────────── */

/**
 * Um item do pedido nos dois formatos.
 *
 * `sku` é o mesmo id que vai no feed do Google Shopping (`g:id`) e, por isso,
 * o "ID do produto" no Merchant Center. O Google exige que o item_id da compra
 * seja exatamente esse · id diferente e a venda não encosta no produto que a
 * pessoa clicou, e o relatório de campanha fica sem receita.
 */
type Item = {
  sku: string;
  quantidade: number;
  precoUnitario: number;
  nome?: string;
  marca?: string;
  categoria?: string;
  variacao?: string;
};

const conteudo = (itens: Item[]) => ({
  content_type: "product",
  content_ids: itens.map((i) => i.sku),
  contents: itens.map((i) => ({ id: i.sku, quantity: i.quantidade, item_price: i.precoUnitario })),
});

const itensGa = (itens: Item[]) =>
  itens.map((i) => ({
    item_id: i.sku,
    ...(i.nome ? { item_name: i.nome } : {}),
    ...(i.marca ? { item_brand: i.marca } : {}),
    ...(i.categoria ? { item_category: i.categoria } : {}),
    ...(i.variacao ? { item_variant: i.variacao } : {}),
    price: Number(i.precoUnitario.toFixed(2)),
    quantity: i.quantidade,
  }));

/** Evento no padrão do Google Analytics 4. */
function ga(evento: string, dados: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  window.gtag?.("event", evento, { currency: "BRL", ...dados });
}

function disparar(evento: string, dados: Record<string, unknown>, id?: string) {
  if (typeof window === "undefined" || !window.fbq) return;
  window.fbq("track", evento, { currency: "BRL", ...dados }, id ? { eventID: id } : undefined);
  window.dataLayer?.push({ event: evento.toLowerCase(), ...dados });
}

/** Abriu a ficha de um produto. */
export function VerProduto({
  sku,
  nome,
  valor,
  marca,
  categoria,
  variacao,
}: {
  sku: string;
  nome: string;
  valor: number;
  marca?: string;
  categoria?: string;
  variacao?: string;
}) {
  useEffect(() => {
    const item = { sku, quantidade: 1, precoUnitario: valor, nome, marca, categoria, variacao };
    disparar("ViewContent", { value: valor, content_name: nome, ...conteudo([item]) });
    ga("view_item", { value: valor, items: itensGa([item]) });
  }, [sku, nome, valor, marca, categoria, variacao]);
  return null;
}

/** Colocou no carrinho · chamado do botão, não de uma página. */
export function noCarrinho(
  sku: string,
  nome: string,
  valor: number,
  qtd = 1,
  ficha?: { marca?: string; categoria?: string; variacao?: string },
) {
  const item = { sku, quantidade: qtd, precoUnitario: valor, nome, ...ficha };
  disparar("AddToCart", { value: valor * qtd, content_name: nome, ...conteudo([item]) });
  ga("add_to_cart", { value: valor * qtd, items: itensGa([item]) });
}

/** Começou a finalizar. */
export function comecouCheckout(itens: Item[], total: number) {
  disparar("InitiateCheckout", { value: total, num_items: itens.reduce((s, i) => s + i.quantidade, 0), ...conteudo(itens) });
  ga("begin_checkout", { value: total, items: itensGa(itens) });
}

/**
 * A conversão de compra no Google Ads.
 *
 * Sem ela o Google não sabe quais cliques viraram venda · a campanha gasta às
 * cegas por semanas otimizando para nada, e depois desiste. É o passo que
 * precisa existir ANTES de a campanha começar a rodar, não depois.
 *
 * `transaction_id` é o número do pedido: se a pessoa recarregar a página de
 * acompanhamento, o Google entende que é a mesma venda e não conta de novo.
 */
export function ConversaoGoogle({
  ads,
  rotulo,
  pedido,
  total,
}: {
  ads: string;
  rotulo: string;
  pedido: number;
  total: number;
}) {
  const feito = useRef(false);
  useEffect(() => {
    if (feito.current || !window.gtag) return;
    feito.current = true;
    window.gtag("event", "conversion", {
      send_to: `${ads}/${rotulo}`,
      value: total,
      currency: "BRL",
      transaction_id: String(pedido),
    });
  }, [ads, rotulo, pedido, total]);
  return null;
}

/**
 * Comprou.
 *
 * O `eventID` é o número do pedido, o MESMO que o servidor manda pela API de
 * Conversões. É o que faz o Meta entender que os dois avisos são a mesma venda
 * · sem ele cada compra conta em dobro e a campanha otimiza com um número
 * inventado, gastando mais achando que vende mais.
 */
export function Comprou({
  pedido,
  itens,
  total,
  frete = 0,
}: {
  pedido: number;
  itens: Item[];
  total: number;
  frete?: number;
}) {
  const feito = useRef(false);
  useEffect(() => {
    if (feito.current) return;
    feito.current = true;
    disparar("Purchase", { value: total, ...conteudo(itens) }, String(pedido));

    // O Analytics conta por transaction_id, mas quem recarrega a página de
    // acompanhamento em outro dia reabre o evento numa sessão nova. A marca no
    // navegador fecha essa porta.
    const marca = `ga4_compra_${pedido}`;
    try {
      if (localStorage.getItem(marca)) return;
      localStorage.setItem(marca, "1");
    } catch {
      // Navegador sem armazenamento · o transaction_id ainda protege.
    }
    ga("purchase", {
      transaction_id: String(pedido),
      affiliation: "Vibra Vert",
      value: total,
      tax: 0,
      shipping: frete,
      items: itensGa(itens),
    });
  }, [pedido, itens, total, frete]);
  return null;
}
