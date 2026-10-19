# Loja Vibra Vert · regras do projeto

Código, comentários e nomes em português, como o resto do repositório. Textos de produto em pt-BR.

## Portal de Assistência Técnica (garantia)

Fonte de verdade das regras: `docs/assistencia/regras/Guia_de_Laudos_v2.md`.
Em conflito entre documentos, vale o Guia.

### O contrato que não se negocia

```
código determinístico  →  faixa, roteamento, triagem por sinais, liberação
Claude (API)           →  ler fotos (lista fechada) e redigir textos
pessoa                 →  confirmar toda negativa e toda recusa
```

1. **Nenhuma negativa ou recusa sai sem uma pessoa confirmar.** Garantido na base
   (trigger em `decisoes` e papel restrito do conector), não em instrução de prompt.
   A ação `confirmar_negativa` não existe no conector da Claude. Se parecer mais
   simples dar isso à IA: parar e perguntar.
2. **`decisoes` é append-only.** Sem UPDATE, sem DELETE, para ninguém. Trigger no Postgres.
3. **O motor em `lib/regras/` é puro**: sem I/O, sem data do relógio dentro da função
   (a data entra por parâmetro), testado no Vitest. Mudou regra, mudou teste.
4. **Regra não definida nos documentos não se inventa.** O caso vai para a fila humana
   com o código da pendência (`PENDENCIAS` em `lib/regras/pendencias.ts`).
5. **Inconclusivo nunca é recusa.** Na Troca Expressa, sinal vermelho vira ponto a
   verificar na bancada; só a lista fechada gera recusa.
6. **Escalonamento bloqueia a resposta automática** (lei, CDC, Procon, Reclame Aqui,
   advogado, Juizado, recusa de frete, reclamação repetida, tom alterado). Detector em código.
7. Não chamar a IA quando o código já resolveu (marketplace, arrependimento, foto faltando).
   Fotos reduzidas a ~1000 px no servidor antes de ir para a API. Toda chamada é registrada
   com custo. Falhou ou não validou no Zod: fila humana, sem retry em loop.
8. Formulário: nunca mostrar os limites do manual (45 min, 40 cm) no texto das perguntas;
   "Não sei" sempre disponível.
9. Nunca escrever "2 anos de garantia" sem "no motor e na carcaça · borrachas 90 dias".
10. Fotos e PDFs em storage privado, só por URL assinada de curta duração. CPF mascarado
    para a Claude.

### Comandos

- `npm test` · testes do motor de regras (Vitest)
- `npx tsc --noEmit -p .` · tipos
