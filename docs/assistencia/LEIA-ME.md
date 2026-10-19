# Portal de Assistência Técnica — Vibra Vert
**Briefing para desenvolvimento · v2.0 · 08/10/2026**

Olá! Este arquivo explica o projeto inteiro em texto. A mesma informação está, com mais visual e uma calculadora de custos, em `00-Briefing-Portal-Assistencia.html`. Os protótipos são clicáveis: abra no Chrome ou no Edge. Nenhum deles envia nada de verdade.

---

## 1. Conteúdo do pacote

| Arquivo | O que é |
|---|---|
| `LEIA-ME.md` | Este arquivo |
| `00-Briefing-Portal-Assistencia.html` | O mesmo briefing, com diagramas e calculadora de custo |
| `prototipos/prototipo-assistencia-cliente.html` | O lado do cliente, na aba Assistência técnica do site |
| `prototipos/prototipo-portal-interno.html` | O lado da equipe: painel, fila, chamados, bancada, conversas, e-mail, área da Claude |
| `regras/Guia_de_Laudos_v2.md` | **Fonte de verdade das regras** (faixas, triagem, lista fechada, laudos) |
| `regras/Garantia_Prazos_e_Faixas.md` | Política de prazos e regras de escalonamento do atendimento |
| `referencias/logo-vibravert.jpeg` | Logo oficial |
| `referencias/Paginas_anexas_do_laudo_(frete_e_termo).pdf` | As duas páginas anexas do laudo, a redesenhar no layout novo |

**Como usar os protótipos**
- No protótipo do cliente, o painel **"Demonstração"** (canto inferior esquerdo) escolhe um dos 9 resultados possíveis. Clique em "Preencher exemplo" e depois em "Enviar chamado".
- Caixas tracejadas com **"Nota para desenvolvimento"** não aparecem para o cliente. Elas explicam o que o sistema real precisa fazer naquele ponto. Estão todas reunidas na seção 10.

---

## 2. A ideia

Hoje a garantia passa por WhatsApp, Google Forms, uma planilha e laudos montados à mão com apoio da Claude. O objetivo é levar tudo para dentro do site e deixar o trabalho de mesa com a Claude:

- O cliente abre o chamado no site, envia 6 fotos e recebe o **protocolo na hora**. Na maioria dos casos, o laudo sai em segundos.
- A Claude faz a triagem, identifica os itens da lista fechada nas fotos, escreve laudos e mensagens, responde e-mail e WhatsApp e redige o laudo de bancada.
- O operador fica com a **bancada** e uma revisão curta por dia: confirmar negativas e recusas (estimativa de 15 a 20 minutos).

> **Regra que não muda com a automação:** nenhuma negativa ou recusa sai sem uma pessoa confirmar. Isso deve ser garantido **no sistema (permissão)**, não só na instrução da IA.

### Quem faz o quê

| Tarefa | Quem |
|---|---|
| Faixa de prazo, consulta da NF e do Bling, roteamento | Código |
| Triagem das respostas (sinais verde, amarelo, vermelho) | Código |
| Identificação da lista fechada nas fotos | Claude |
| Redação de laudos, mensagens, respostas de e-mail e WhatsApp | Claude |
| Liberar aprovações, autorizações, pedidos de foto, orientações | Automático |
| Confirmar negativas e recusas; atender clientes que contestam | Operador |
| Bancada: abrir, medir, confirmar e assinar | Técnico |

---

## 3. Jornada do cliente (site público)

Na aba Assistência técnica (`/assistencia`), o botão **"Abrir chamado de garantia"** leva ao formulário. O botão atual "Abrir chamado técnico" hoje aponta para o Fale Conosco e deve passar a apontar para cá.

**Fluxo:** formulário → desvio cedo (marketplace e arrependimento) → análise → protocolo → bancada.

### Formulário em 7 etapas
1. **Seus dados:** nome, CPF/CNPJ (validar dígito), WhatsApp, e-mail.
2. **Compra:** onde comprou, NF (número até 9 dígitos ou chave de 44; não aceita o CPF), data de recebimento, se já usou.
3. **Produto:** modelo (lista fechada), tensão, número de série.
4. **Instalação:** 8 perguntas em cartões, com "Não sei" como opção. O tempo ligada é escolhido em faixas, e só "mais de 1 hora" pede os minutos. **As perguntas não mostram os limites do manual** (45 min, 40 cm), para não induzir a resposta.
5. **O que aconteceu:** texto livre, mínimo de 20 caracteres.
6. **Fotos:** 6 obrigatórias em espaços guiados (frente, verso, cabo e emenda, etiqueta, local de longe, local de perto).
7. **Revisão:** resumo, aceite de LGPD e envio.

**Desvio cedo (depois da etapa 2):**
- **Marketplace há até 30 dias:** tela orientando a abrir a devolução no próprio marketplace. Não entra no fluxo.
- **Até 7 dias e sem uso:** arrependimento. Gera protocolo e não pede fotos.

### Página do protocolo
- Protocolo `AT-AAAA-NNNNNN` em destaque, com alerta "anote o número" e botão de copiar.
- Botão **Baixar laudo (PDF)** no topo e embaixo da prévia, sempre que houver laudo.
- Andamento em linha do tempo, com instruções de envio conforme a faixa.
- **O cliente não precisa imprimir nada.** Ele escreve o protocolo na caixa; na Troca Expressa, a etiqueta da logística reversa já identifica o chamado.
- Campo **"Já enviou? Informe o rastreio"** nas aprovações, com validação de formato (2 letras, 9 números, 2 letras).
- Acompanhamento posterior em `/assistencia/protocolo`, com protocolo + CPF.

### Resultados possíveis (todos no protótipo)

| Resultado | O cliente vê |
|---|---|
| Troca Expressa autorizada | Código de postagem em até 1 dia útil, laudo |
| Aprovado para envio (31–90 dias) | Endereço, checklist, rastreio, laudo |
| Aprovado para envio (91+ dias) | Idem, com frete de volta por conta dele |
| Em análise | "Resultado em até 1 dia útil" (o caso está na fila humana) |
| Negativa confirmada | Motivo, laudo, saída de análise física, conserto pelo custo |
| Pendente de foto | Qual foto falta e botão para reenviar |
| Marketplace até 30 dias | Orientação para devolver no marketplace |
| Arrependimento | Estorno integral e código de postagem |

---

## 4. Portal interno (área logada)

| Aba | Função |
|---|---|
| **Painel do dia** | Indicadores, lista "precisa de você agora" ordenada por prazo, última atividade da Claude |
| **Fila de decisão** | Só negativas, recusas e revisões. SLA de 24 h úteis |
| **Ficha do chamado** | Sugestão da Claude e força do fundamento, 6 fotos com destaque, resultado da lista fechada, sinais da triagem, NF decomposta e consulta no Bling, rascunho da mensagem, histórico imutável. Para confirmar, o operador marca **"Conferi as 6 fotos"** |
| **Chamados** | Todos, com filtros e busca por protocolo, nome, CPF ou NF |
| **Bancada** | Receber bomba, contagem de 48 h, registro de bancada, laudo redigido ao vivo, assinatura |
| **Conversas** | WhatsApp e chat do site, com escalonamento para humano |
| **E-mail** | Caixa do sac@: classificação, resposta automática, encaminhamento para pedido@, rascunho nos casos sensíveis |
| **Claude** | O que ela fez hoje, o que sai sem humano (negativas travadas), rotinas agendadas, regras em uso |

### Bancada em detalhe
1. **Receber bomba:** um campo único que aceita a leitura da etiqueta ou texto digitado. A identificação segue esta ordem:
   1. código da etiqueta da logística reversa;
   2. protocolo escrito na caixa;
   3. rastreio informado pelo cliente;
   4. busca por nome, CPF, NF ou **número de série**.

   Sem chamado encontrado, o caso entra como **"recebimento sem identificação"**, e a Claude tenta localizar o cliente.
2. **Registro de bancada com toques:** cabo, carcaça, sinais de abertura, partida, recalque, borrachas, bobina, vedação, interior da caneca. Mais medições (resistência em Ω, isolação em MΩ, corrente em A), peças trocadas e fotos.
3. **Observações digitadas (sem áudio):** vão para o laudo exatamente como o técnico escreveu.
4. **Laudo redigido ao vivo:** a Claude escreve o laudo e sugere a conclusão enquanto o técnico marca. Quando não há causa clara, ela não chuta e pede que o técnico defina.
5. **Assinatura:** exige observação preenchida, conclusão definida e a confirmação "Sou o responsável técnico". O laudo de bancada **não leva páginas anexas**, e a mensagem ao cliente **não descreve o defeito**.

> A tabela "achado na bancada → conclusão" do protótipo é um ponto de partida e **ainda precisa ser validada com o técnico**.

### E-mail (sac@)

| Classificação | Ação |
|---|---|
| Status de chamado | A Claude responde |
| Quer acionar garantia | A Claude responde com o link do formulário |
| Dúvida técnica | A Claude responde |
| Pedido e nota fiscal | Encaminha para pedido@ |
| Reclamação, Procon, Reclame Aqui, advogado | **Nunca responde sozinha**: deixa rascunho para o operador |

---

## 5. Regras de negócio

Versão completa em `regras/Guia_de_Laudos_v2.md`. **Recomendação:** as regras de faixa, roteamento e triagem ficam **em código**, porque são determinísticas. A IA entra só onde é preciso ler imagem e escrever texto.

### Faixas de prazo

| Faixa | Fluxo | Frete de ida | Volta com defeito | Documento | Anexos do laudo |
|---|---|---|---|---|---|
| 1–7 dias, sem uso | Arrependimento | Vibra Vert | Vibra Vert + estorno | Sem laudo | — |
| 1–30 dias, marketplace | Devolução no marketplace | Regra do marketplace | — | Sem laudo | — |
| 1–30 dias, site | Troca Expressa | Vibra Vert (logística reversa) | Vibra Vert | Autorização ou recusa | Termo |
| 31–90 dias | Normal | Cliente | Vibra Vert | Aprovação ou negativa | Frete + Termo |
| 91+ dias | Normal | Cliente | Cliente | Aprovação ou negativa | Frete + Termo |

- Os dias contam da **emissão da NF** até o **envio do formulário**. O arrependimento conta a partir do recebimento.
- A data e o canal vêm da chave da NF e do **Bling**, quando a nota é da Vibra Vert ou da ARF (CNPJs 21.276.576/0001-56 e 20.550.456/0001-32). NF de revenda: o operador informa a data.
- A garantia longa é **parcial**, só para motor e carcaça: Rymer 1500 6 meses, Rymer 2000/2500 1 ano, Vibrinha/800/900 2 anos. Borrachas têm 90 dias em todos os modelos.

### Triagem das respostas

| Sinal | Exemplos | Efeito (31+ dias) | Efeito (Troca Expressa) |
|---|---|---|---|
| Vermelho | A seco; tensão errada; pendurada pelo fio; "menos de 20 cm"; tempo muito acima | Negativa, após confirmação humana | Ponto a verificar na bancada |
| Amarelo | "Não sei"; 20–40 cm; água com areia; fita comum; tempo um pouco acima | Aprova; ponto a verificar | Ponto a verificar |
| Verde | Tudo dentro do manual | Aprova | Autoriza |

### Lista fechada (identificada pela Claude nas fotos)
Outra marca · cabo cortado · produto violado · carcaça quebrada.

Cada item recebe um resultado: `encontrado`, `nao_encontrado` ou `inconclusivo`. **Inconclusivo nunca vira recusa.** Item encontrado vira recusa ou negativa **só depois da confirmação humana**.

### Liberação

| Situação | Liberação |
|---|---|
| Sem sinal vermelho e lista fechada sem achado | Automática |
| Foto ou dado faltando | Automática (pedido ao cliente) |
| Marketplace até 30 dias, arrependimento | Automática (orientação) |
| Sinal vermelho, item encontrado, inconclusivo, data ou canal não confirmados | Fila humana |

---

## 6. Arquitetura: API ou app do Claude

Há dois jeitos de colocar a Claude para trabalhar. **Os dois exigem o mesmo conector do portal (seção 8).** A diferença é quando a Claude roda e como isso é cobrado.

### Opção A · Pela API da Claude (recomendada)
O servidor chama a API a cada chamado novo, em tempo real.
- Resultado ao cliente em segundos.
- Escala com o volume, sem depender do limite de um plano.
- Cobrado por uso, à parte da assinatura (ver seção 7).
- Dá para fixar um limite mensal de gasto no painel da Anthropic.

**Fluxo:** formulário → código (NF, Bling, faixa, roteamento, triagem) → API com Sonnet (lista fechada nas fotos) → API com Haiku (texto do laudo e mensagem) → código (libera ou envia à fila, gera o PDF) → operador (só a fila).

### Opção B · Pelo app do Claude
Tarefas agendadas do Claude (o que chamamos internamente de Cowork, que hoje faz parte do próprio Claude) acessam o portal pelo conector e processam a fila.
- Não há conta de tokens: usa o limite da assinatura.
- O intervalo mínimo entre rodadas é de 1 hora, então o cliente vê "em análise" e espera até cerca de 1 hora.
- Em dias de pico, o limite do plano pode estourar.
- Se uma rodada falha, a fila espera a próxima.

**Variante econômica da A:** processar em lote de hora em hora pela **Batch API**, com 50% de desconto. Perde-se o tempo real, como na B, mas sem depender do limite do plano.

**Nas duas opções**, o app do Claude continua útil para as rotinas que não precisam ser em tempo real: relatório diário às 07:45, lembrete de SLA às 16:45, resumo semanal e revisão das sugestões que o operador alterou.

---

## 7. Custos estimados da opção A — **para revisar**

Preços oficiais consultados em 08/10/2026, por milhão de tokens:

| Modelo | Entrada | Saída | Leitura de cache |
|---|---|---|---|
| Sonnet 5.5 | US$ 2,00 | US$ 10,00 | US$ 0,10 |
| Haiku 5.5 (até 100 mil tokens por chamada) | US$ 0,10 | US$ 0,50 | US$ 0,01 |

### Premissas por chamado

| Item | Tokens | Observação |
|---|---|---|
| Regras (guia v2) | ~8.000 | Iguais em todo chamado: usar cache de prompt |
| Respostas, NF e instruções | ~1.000 | |
| 6 fotos a ~1000 px | ~7.800 | ~1.300 por foto. Sem redução, até 4.784 por foto (3,5 vezes mais) |
| Saída (JSON da lista, laudo, mensagem) | ~1.500 | |

### Estimativa (300 chamados por mês + 100 laudos de bancada e e-mails, dólar a R$ 5,50)

| Configuração | Por chamado | Por mês |
|---|---|---|
| Sonnet nas fotos + Haiku no texto (**sugerida**) | ~US$ 0,022 | **~R$ 40** |
| Tudo no Sonnet | ~US$ 0,033 | ~R$ 60 |
| Tudo no Haiku | ~US$ 0,002 | ~R$ 3 (menor precisão nas fotos) |

A calculadora no briefing em HTML permite mudar volume, modelo e dólar.

### Como manter o custo baixo
- Reduzir as fotos para cerca de 1000 px no servidor antes de enviar.
- Usar cache de prompt nas regras.
- Usar o Sonnet só na identificação por foto e o Haiku em texto, e-mail e conversas.
- Não chamar a IA quando o código já resolve (marketplace, arrependimento, foto faltando).
- Fixar um limite mensal de gasto na conta da API.

Fontes: [preços da API](https://platform.claude.com/docs/en/about-claude/pricing) · [tokens de imagem](https://platform.claude.com/docs/en/build-with-claude/vision)

---

## 8. Acesso da Claude ao portal (essencial)

Para a Claude trabalhar dentro do portal, ele precisa de um **conector**: uma API própria, de preferência publicada como **servidor MCP**, com um usuário "Claude" de permissões limitadas. Sem isso, a Claude não consegue ler a fila nem registrar o trabalho.

| Ação | Claude | Observação |
|---|---|---|
| `listar_chamados` (filtros de status, faixa, data) | Permitido | |
| `ler_chamado` (respostas, NF, histórico) | Permitido | CPF mascarado |
| `ler_fotos` | Permitido | URL assinada, curta duração, versão reduzida |
| `registrar_sugestao` / `registrar_nota` | Permitido | Autor "Claude" no histórico |
| `criar_rascunho` (laudo, mensagem, e-mail) | Permitido | |
| `liberar_aprovacao`, `pedir_informacao`, `orientar_marketplace` | Permitido | Só se as regras em código permitirem |
| `responder_conversa` / `responder_email` | Permitido | Bloqueado quando há gatilho de escalonamento |
| `escalar_para_humano` | Permitido | |
| `confirmar_negativa` / `confirmar_recusa` | **Bloqueado** | Só usuário humano. A ação não existe no conector |
| `assinar_laudo_bancada` | **Bloqueado** | Só o técnico responsável |
| Apagar chamado ou histórico | **Bloqueado** | Histórico imutável para todos |

**Regras numa fonte só:** o guia v2 deve ficar versionado no portal e ser lido tanto pelo motor (opção A) quanto pelas rotinas do app. Quando o operador alterar uma sugestão da Claude, o portal grava o motivo. É isso que permite revisar e melhorar as regras toda semana.

---

## 9. Integrações e dados

### Integrações

| Serviço | Uso | Fase |
|---|---|---|
| Supabase (já usado no site) | Banco, autenticação, storage privado de fotos e PDFs | 1 |
| API da Claude | Fotos (Sonnet), textos (Haiku) | 1 |
| Bling API v3 | Data de emissão e canal do pedido (só leitura) | 1 |
| Logística reversa | Código de postagem ligado ao protocolo | 1 · provedor a definir |
| PDF no servidor | Laudos a partir de modelos HTML, com anexos | 1 |
| Rastreio de envio | Status do código informado pelo cliente | 1 |
| E-mail sac@ | Entrada e resposta pela API do provedor | 2 |
| WhatsApp Business Platform | Conversas e avisos (**API oficial da Meta**; soluções não oficiais podem bloquear o número) | 3 |

### Tabelas principais

| Tabela | Conteúdo |
|---|---|
| `chamados` | Protocolo, controle legado, cliente, status, faixa, canal, datas, modelo, série, NF, código de reversa, rastreio |
| `respostas` | Uma linha por pergunta, com o texto original |
| `fotos` | Espaço (frente, verso, cabo, etiqueta, local longe, local perto), caminho, versão reduzida |
| `avaliacoes` | Sinais da triagem e lista fechada item a item |
| `decisoes` | Autor (código, Claude, pessoa), sugestão, decisão final, motivo da alteração. **Imutável** |
| `bancada` | Checklist, medições, peças, observação digitada, fotos, conclusão sugerida e final, assinatura |
| `laudos` | Tipo, versão, PDF, liberação, quem liberou |
| `conversas` / `emails` | Canal, mensagens com autor, classificação, vínculo com o chamado |

### Saída da identificação por foto
```json
{ "item": "cabo_cortado",
  "resultado": "encontrado | nao_encontrado | inconclusivo",
  "foto_ref": "cabo_emenda",
  "motivo_inconclusivo": "foto escura | parte fora do quadro | null" }
```

### Modelos de laudo
Cinco modelos: autorização da Troca Expressa, aprovação 31–90, aprovação 91+, negativa/recusa e bancada.
- **Layout:** logo no topo e rodapé com contatos em **todas** as páginas; azul-marinho #13357F e cinza #545452; subtítulo "Análise Preliminar"; negativa com faixa vermelha #9b2c2c.
- **Texto fixo:** "caso o proprietário discorde, pode enviar a bomba para análise física definitiva".
- **Contatos:** Rua Charles Darwin, 707 · Vila Santa Catarina · São Paulo/SP · CEP 04379-074 · WhatsApp 11 5033-2828 · sac@vibravert.com.br.

### LGPD e segurança
- Aceite com finalidade descrita no formulário, e política de retenção (sugestão: 5 anos após a conclusão).
- CPF e fotos só no portal logado; a página pública pede protocolo + CPF.
- Usuário da Claude com escopo mínimo e registro de todas as chamadas.

---

## 10. Notas de desenvolvimento (o que é simulado nos protótipos)

| Onde | O que implementar |
|---|---|
| Protocolo | Enviar protocolo e link por e-mail e WhatsApp. Só mostrar "Também enviamos..." depois que o envio for confirmado |
| Laudo | PDF oficial gerado no servidor com todas as páginas (laudo, instruções de envio, anexos por faixa), sempre disponível na página do protocolo. O protótipo gera só as páginas 1 e 2, no navegador |
| Troca Expressa e arrependimento | Gerar o código de logística reversa ligado ao protocolo e enviar ao cliente em até 1 dia útil |
| Fila | Avisar o cliente por WhatsApp quando o caso sair de "em análise" |
| Pendência de foto | Reenvio pela página do protocolo; encerrar o chamado após 15 dias sem resposta |
| Negativa | Os botões "Quero a análise física" e "Quero o conserto pelo custo" devem abrir os fluxos reais |
| Rastreio | Salvar o código e acompanhar a entrega para marcar "a caminho" e "entregue" |
| Bancada | Leitura do código de barras da etiqueta; laudo de bancada sem anexos; mensagem ao cliente sem descrever o defeito |
| Recebimento sem identificação | Fila própria; a Claude cruza nº de série e dados com chamados e vendas |
| E-mail | Seguir a tabela da seção 4 |
| Conversas | WhatsApp pela API oficial, com os gatilhos de escalonamento de `Garantia_Prazos_e_Faixas.md` |

---

## 11. Correções no site atual (antes de lançar)

| Prioridade | Onde | Correção |
|---|---|---|
| **Alta** | /assistencia | Remover a promessa de "sem frete de ida e volta" para todos; restringir à Troca Expressa de 30 dias |
| **Alta** | /politica-de-troca | Incluir Troca Expressa, faixas e borrachas de 90 dias; definir ou remover a "cobertura estendida" |
| Média | Selo "2 anos" | "2 anos no motor e na carcaça · borrachas 90 dias" |
| Média | Bloco Troca Expressa | Incluir "sujeito a conferência por foto e avaliação técnica" |
| Média | Contatos de garantia | Unificar: WhatsApp 11 5033-2828 e sac@vibravert.com.br |
| Baixa | "Abrir chamado técnico" | Apontar para o novo formulário |

---

## 12. Fases

| Fase | Entrega |
|---|---|
| **1** | Correções de alta prioridade · formulário e protocolo · regras em código · Bling · API da Claude (fotos e textos) · PDF · fila, ficha, chamados, bancada · conector da Claude · migração dos chamados abertos da planilha |
| **2** | E-mail sac@ no portal · rotinas agendadas da Claude (relatórios, SLA, revisão semanal) |
| **3** | WhatsApp pela API oficial · chat do site · avisos de status |

**Recomendação:** na fase 1, rodar algumas semanas com o operador conferindo também as aprovações automáticas, antes de liberar a automação total.

---

## 13. Decisões em aberto

| Decisão | Responsável |
|---|---|
| **Opção A (API) ou B (app do Claude)**, após a revisão de custos | Diretoria + desenvolvimento |
| Provedor da logística reversa | Diretoria |
| Ler a data na NF anexada quando for de revenda | Diretoria |
| Tabela "achado na bancada → conclusão" | Técnico |
| Validação jurídica: página da sentença (anonimizar as partes), faixa 31–90, arrependimento, Termo | Advogado |
| Cobertura estendida para compras no site | Diretoria |
| Provedor do e-mail sac@ e conta na WhatsApp Business Platform | TI |
| Nome do responsável técnico que assina os laudos | Diretoria |

---

*Dúvidas sobre regras ou fluxos: os dois protótipos mostram o comportamento esperado de cada tela. Em caso de conflito entre arquivos, vale o `Guia_de_Laudos_v2.md`.*
