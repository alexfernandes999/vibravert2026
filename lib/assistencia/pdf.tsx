import { readFileSync } from "node:fs";
import path from "node:path";
import { Document, Image, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import type { ConteudoLaudo } from "./laudo";

/**
 * PDF oficial do laudo, gerado no servidor a partir do conteúdo gravado.
 *
 * Layout do Guia (seção 9): logo no topo e contatos no rodapé de TODAS as
 * páginas, paleta #13357F e #545452, subtítulo "Análise Preliminar", faixa
 * vermelha #9b2c2c na negativa e na recusa. Anexos por faixa; laudo de bancada
 * não leva anexo.
 */
const AZUL = "#13357F";
const CINZA = "#545452";
const VERMELHO = "#9b2c2c";
const CONTATOS =
  "Rua Charles Darwin, 707 · Vila Santa Catarina · São Paulo/SP · CEP 04379-074 · WhatsApp 11 5033-2828 · sac@vibravert.com.br";

const s = StyleSheet.create({
  pagina: { paddingTop: 34, paddingBottom: 60, paddingHorizontal: 42, fontSize: 10, color: "#12172a", fontFamily: "Helvetica", lineHeight: 1.45 },
  topo: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderBottomWidth: 1.5, borderBottomColor: AZUL, paddingBottom: 10, marginBottom: 16 },
  logo: { width: 150 },
  subtitulo: { fontSize: 9, color: CINZA, textAlign: "right" },
  faixa: { paddingVertical: 8, paddingHorizontal: 12, color: "#ffffff", fontFamily: "Helvetica-Bold", fontSize: 13, marginBottom: 12 },
  bloco: { marginBottom: 10 },
  rotulo: { fontFamily: "Helvetica-Bold", fontSize: 9, color: CINZA, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 2 },
  grade: { flexDirection: "row", flexWrap: "wrap", borderWidth: 0.75, borderColor: "#dfe4ee", marginBottom: 12 },
  celula: { width: "50%", padding: 6, borderBottomWidth: 0.75, borderColor: "#dfe4ee" },
  mono: { fontFamily: "Courier-Bold" },
  destaque: { borderLeftWidth: 3, borderLeftColor: AZUL, backgroundColor: "#eef2f9", padding: 8, marginTop: 6 },
  linhaRodape: { position: "absolute", bottom: 42, left: 42, right: 42, borderTopWidth: 0.75, borderTopColor: "#c7d0e0" },
  rodape: { position: "absolute", bottom: 26, left: 42, right: 42, fontSize: 7.5, color: CINZA },
  h2: { fontFamily: "Helvetica-Bold", fontSize: 13, color: AZUL, marginBottom: 8 },
  tabelaLinha: { flexDirection: "row", borderBottomWidth: 0.75, borderColor: "#dfe4ee" },
});

let logo: Buffer | null = null;
const logoVV = () => (logo ??= readFileSync(path.join(process.cwd(), "public/logo-vibravert.png")));

function Moldura({ children, subtitulo }: { children: React.ReactNode; subtitulo: string }) {
  return (
    <Page size="A4" style={s.pagina}>
      <View style={s.topo} fixed>
        {/* eslint-disable-next-line jsx-a11y/alt-text */}
        <Image src={logoVV()} style={s.logo} />
        <Text style={s.subtitulo}>{subtitulo}</Text>
      </View>
      {children}
      <View style={s.linhaRodape} fixed />
      <Text style={s.rodape} fixed>{CONTATOS}</Text>
    </Page>
  );
}

const Campo = ({ r, v, mono }: { r: string; v: string | null; mono?: boolean }) => (
  <View style={s.celula}>
    <Text style={s.rotulo}>{r}</Text>
    <Text style={mono ? s.mono : undefined}>{v || "não informado"}</Text>
  </View>
);

function PaginaLaudo({ l }: { l: ConteudoLaudo }) {
  return (
    <Moldura subtitulo={`Assistência Técnica · ${l.tipo === "bancada" ? "Laudo de Bancada" : "Análise Preliminar"}`}>
      <Text style={[s.faixa, { backgroundColor: l.banner === "vermelho" ? VERMELHO : AZUL }]}>{l.titulo}</Text>
      <View style={s.grade}>
        <Campo r="Protocolo" v={l.protocolo} mono />
        <Campo r="Data da análise" v={l.dataAnalise} />
        <Campo r="Proprietário" v={l.proprietario.nome} />
        <Campo r="CPF/CNPJ" v={l.proprietario.documento} mono />
        <Campo r="Telefone" v={l.proprietario.telefone} mono />
        <Campo r="Nota fiscal" v={l.compra.nf} mono />
        <Campo r="Data da compra" v={l.compra.data ?? "a confirmar"} />
        <Campo r="Faixa" v={l.compra.faixa} />
        <Campo r="Modelo" v={[l.produto.modelo, l.produto.tensao].filter(Boolean).join(" · ")} />
        <Campo r="Nº de série" v={l.produto.serie} mono />
      </View>
      {l.resultado ? (
        <View style={s.bloco}>
          <Text style={s.rotulo}>Resultado</Text>
          <Text style={{ fontFamily: "Helvetica-Bold" }}>{l.resultado}</Text>
        </View>
      ) : null}
      <View style={s.bloco}>
        <Text style={s.rotulo}>Fundamentação</Text>
        <Text>{l.fundamentacao}</Text>
      </View>
      <View style={s.bloco}>
        <Text style={s.rotulo}>Conclusão</Text>
        <Text>{l.conclusao}</Text>
      </View>
      {l.pontosAVerificar.length > 0 && (
        <View style={s.bloco}>
          <Text style={s.rotulo}>Pontos a verificar na bancada</Text>
          {l.pontosAVerificar.map((p) => (
            <Text key={p}>• {p}</Text>
          ))}
        </View>
      )}
      {l.produto.garantia && (
        <View style={s.bloco}>
          <Text style={s.rotulo}>Garantia do modelo</Text>
          <Text>{l.produto.garantia}</Text>
        </View>
      )}
      {l.frete ? (
        <View style={s.bloco}>
          <Text style={s.rotulo}>Frete</Text>
          <Text>{l.frete}</Text>
        </View>
      ) : null}
      <Text style={s.destaque}>{l.frase}</Text>
      <View style={{ marginTop: 26 }}>
        <Text style={{ fontFamily: "Helvetica-Bold" }}>Responsável técnico — Assistência Técnica</Text>
        <Text style={{ color: CINZA }}>Vibra Vert Bombas Submersas Vibratórias</Text>
      </View>
    </Moldura>
  );
}

function PaginaEnvio({ l }: { l: ConteudoLaudo }) {
  if (l.tipo === "bancada") return null;
  const favoravel = l.banner === "azul";
  return (
    <Moldura subtitulo="Assistência Técnica · Instruções de envio">
      <Text style={s.h2}>{favoravel ? "Como enviar a bomba" : "Se quiser a análise física"}</Text>
      {l.tipo === "autorizacao_troca" ? (
        <Text>
          Você recebe o código de postagem da logística reversa em até 1 dia útil, por WhatsApp e e-mail. O frete de ida é
          por conta da Vibra Vert. Não é preciso imprimir nada: a etiqueta já identifica o chamado {l.protocolo}.
        </Text>
      ) : (
        <>
          <Text>Endereço: Vibra Vert · Assistência Técnica · Rua Charles Darwin, 707 · Vila Santa Catarina · São Paulo/SP · CEP 04379-074</Text>
          <Text style={{ marginTop: 8 }}>• Escreva o protocolo {l.protocolo} na caixa. Imprimir este laudo é opcional.</Text>
          <Text>• Envie a bomba seca, com o cabo enrolado e protegida.</Text>
          <Text>• Informe o código de rastreio na página do protocolo, em vibravert.com.br/assistencia/protocolo.</Text>
          <Text style={{ marginTop: 8 }}>{l.frete}</Text>
        </>
      )}
      <Text style={[s.destaque, { marginTop: 14 }]}>Na chegada, o técnico avalia em até 48 horas e o laudo definitivo sai na página do protocolo.</Text>
    </Moldura>
  );
}

/**
 * Anexo de frete. O original trazia a página da sentença com o nome das
 * partes; aqui vai só o trecho da fundamentação, sem identificação.
 * PENDENTE: validação jurídica (Guia, Pendências).
 */
function AnexoFrete() {
  return (
    <Moldura subtitulo="Anexo · Frete de envio e retorno">
      <Text style={s.h2}>Por que o envio para análise é por conta do proprietário</Text>
      <Text>
        Como consta no Termo de Garantia, as despesas de envio do produto para análise são do comprador. A Justiça já
        reconheceu esse procedimento como válido. Trecho da fundamentação de sentença de improcedência (partes omitidas):
      </Text>
      <View style={[s.destaque, { marginTop: 10 }]}>
        <Text>
          “A responsabilidade do fornecedor pelo vício do produto não implica necessariamente que todos os custos envolvidos
          no processo de análise e reparo devam ser suportados pelo fornecedor antes da constatação efetiva do vício e sua
          natureza.”
        </Text>
        <Text style={{ marginTop: 6 }}>
          “No caso em apreço, observo que a empresa ré não se recusou a prestar o serviço de garantia, mas apenas estabeleceu
          um procedimento para o exercício desse direito pelo consumidor, qual seja, o envio do produto para análise técnica
          preliminar, com custos de envio por conta do consumidor, e, caso constatado o defeito de fabricação, o retorno seria
          custeado pela empresa.”
        </Text>
        <Text style={{ marginTop: 6 }}>
          “Tal procedimento não se mostra abusivo ou ilegal, uma vez que, antes da constatação do vício e sua natureza (se
          decorrente de defeito de fabricação ou mau uso), não há como presumir a responsabilidade da empresa pelo custeio
          integral do processo de análise.”
        </Text>
      </View>
    </Moldura>
  );
}

/**
 * Termo de Garantia, fiel ao documento oficial · texto legal não se reescreve
 * aqui. PENDENTE (jurídico): o Termo diz que envio e retirada são sempre do
 * proprietário, o que contradiz a Troca Expressa e a volta na faixa 31–90.
 */
function AnexoTermo() {
  const linha = (m: string, p: string) => (
    <View style={s.tabelaLinha}>
      <Text style={{ width: "45%", padding: 5 }}>{m}</Text>
      <Text style={{ width: "55%", padding: 5 }}>{p}</Text>
    </View>
  );
  return (
    <Moldura subtitulo="Anexo · Termo de Garantia">
      <Text style={s.h2}>Termo de Garantia · prazo por marca e modelo</Text>
      <View style={{ borderWidth: 0.75, borderColor: "#dfe4ee", marginBottom: 10 }}>
        {linha("Rymer 1500", "6 meses na bomba, exceto borrachas, que têm 3 meses")}
        {linha("Rymer 2000 ou 2500", "12 meses na bomba, exceto borrachas, que têm 3 meses")}
        {linha("Vibrinha · Vibra Vert 800 · Vibra Vert 900", "24 meses na bomba, exceto borrachas, que têm 3 meses")}
      </View>
      <Text>
        O prazo de garantia é contado a partir da emissão da nota fiscal, desde que a instalação e a utilização tenham
        ocorrido conforme as orientações do manual de instruções.
      </Text>
      <Text style={{ marginTop: 6, fontFamily: "Helvetica-Bold" }}>
        A garantia abrange somente defeito do processo de fabricação. Se for constatado mau uso, o produto perde a garantia.
      </Text>
      <Text style={{ marginTop: 6, fontFamily: "Helvetica-Bold" }}>
        Peças e componentes de borracha e acessórios em geral, sujeitos a desgaste natural, têm garantia pelo prazo legal de 90 dias.
      </Text>
      <Text style={{ marginTop: 6 }}>
        Reconhecida a garantia, as peças defeituosas são substituídas sem custo, ficando a cargo do proprietário os gastos
        com o envio e a retirada nos locais indicados pela Vibra Vert. A garantia é cancelada se o produto for
        violado ou utilizado fora das especificações: bombear líquido que não seja água limpa, pressão acima do
        especificado, voltagem indevida ou incorreta, ou instalação fora dos procedimentos do manual.
      </Text>
      <Text style={{ marginTop: 6 }}>A garantia exclui:</Text>
      <Text>A) defeitos por instalação incorreta, uso inadequado ou por não observar as instruções do manual;</Text>
      <Text>B) mão de obra, transporte e custos relacionados para que o proprietário ponha o produto à disposição da Vibra Vert para verificação da garantia;</Text>
      <Text>C) custos com a reinstalação do produto;</Text>
      <Text>D) danos de qualquer natureza ou reembolso por perdas ocasionadas pela interrupção do funcionamento.</Text>
    </Moldura>
  );
}

export async function gerarPdfLaudo(l: ConteudoLaudo): Promise<Buffer> {
  const doc = (
    <Document title={`${l.titulo} · ${l.protocolo}`} author="Vibra Vert · Assistência Técnica" language="pt-BR">
      <PaginaLaudo l={l} />
      <PaginaEnvio l={l} />
      {l.tipo !== "bancada" && l.anexos.includes("frete") && <AnexoFrete />}
      {l.tipo !== "bancada" && l.anexos.includes("termo") && <AnexoTermo />}
    </Document>
  );
  return renderToBuffer(doc);
}
