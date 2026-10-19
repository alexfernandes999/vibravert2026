# PROMPT PARA CLAUDE CODE — Portal de Assistência Técnica Vibra Vert (Fase 1)

> **Cómo usarlo:** creá la carpeta del proyecto, poné dentro `/docs` con los 6 archivos del paquete
> (briefing HTML, los 2 prototipos, los 2 MD de reglas, el PDF de anexos y el logo), abrí la carpeta
> en VS Code, abrí Claude Code y pegá todo lo que está debajo de la línea.
>
> **No pegues esto en trozos.** Es un solo mensaje. Claude Code va a arrancar leyendo los docs y
> parando en el Checkpoint 0 para que vos confirmes antes de escribir código.

---

## CONTEXTO

Sos el tech lead de este proyecto. Construís el **Portal de Assistência Técnica da Vibra Vert**
(fabricante de bombas submersas vibratórias, São Paulo). Hoy el flujo de garantía vive en WhatsApp,
Google Forms, una planilla y laudos armados a mano. Lo llevamos todo adentro del sitio.

**Entregable de esta fase (Fase 1):**

1. Formulario público de apertura de reclamo de garantía en 7 pasos, con protocolo inmediato.
2. Motor de reglas **determinístico en código** (franja de plazo, ruteo, triaje por señales).
3. Integración con la API de Claude **solo** para: identificación de la lista cerrada en fotos
   (Sonnet) y redacción de laudos/mensajes (Haiku).
4. Generación de PDF del laudo en el servidor, con las páginas anexas por franja.
5. Portal interno (operador/técnico): panel del día, fila de decisión, ficha del reclamo, reclamos,
   banco de pruebas ("bancada").
6. Conector MCP para que Claude trabaje dentro del portal con permisos acotados.

Quedan **fuera** de esta fase: bandeja de e-mail `sac@` (Fase 2), WhatsApp API oficial y chat del
sitio (Fase 3). No los implementes. Sí dejá las interfaces preparadas donde el briefing lo indica.

---

## PASO 0 — LEER ANTES DE ESCRIBIR UNA SOLA LÍNEA

Leé, en este orden, y **no asumas nada que no esté ahí**:

| Archivo | Para qué |
|---|---|
| `docs/LEIA-ME.md` | Visión general del proyecto en texto |
| `docs/00-Briefing-Portal-Assistencia.html` | Briefing completo: jornada, portal interno, arquitectura, costos, conector, tablas, notas de desarrollo, correcciones del sitio, fases |
| `docs/Guia_de_Laudos_v2.md` | **Fuente de verdad de las reglas.** Franjas, triaje, lista cerrada, estructura de laudos |
| `docs/Garantia_Prazos_e_Faixas.md` | Política de plazos y reglas de escalonamiento |
| `docs/prototipo-assistencia-cliente.html` | Referencia visual y de interacción del lado cliente |
| `docs/prototipo-portal-interno.html` | Referencia visual y de interacción del portal interno |
| `docs/Paginas_anexas_do_laudo_(frete_e_termo).pdf` | Las 2 páginas anexas del laudo, a rediseñar en el layout nuevo |

Los prototipos son HTML estático y **no envían nada**. Sirven como spec de UI, no como código a
copiar. Las cajas punteadas "Nota para desenvolvimento" marcan exactamente lo que está simulado y
tiene que existir de verdad: están todas juntas en la sección 10 del briefing.

**CHECKPOINT 0 — parás acá.** Antes de crear archivos, devolveme en el chat:

- Un resumen de las 5 franjas de garantía y quién paga el flete en cada una.
- La lista cerrada completa (son 4 ítems) y en qué franja genera rechazo.
- Qué acciones del conector están **bloqueadas** para Claude y por qué.
- Las contradicciones o huecos que hayas encontrado entre los documentos, si los hay.
- El plan de archivos que vas a crear, en forma de árbol.

No escribas código hasta que yo apruebe.

---

## STACK (no lo cambies sin pedirme permiso)

- **Next.js 15**, App Router, TypeScript estricto (`strict: true`, sin `any` implícito).
- **Supabase**: Postgres + Auth + Storage privado (fotos y PDFs). RLS activo desde el día uno.
- **Tailwind CSS** con los tokens de marca mapeados en `tailwind.config.ts`. Sin librerías de
  componentes pesadas; shadcn/ui solo si realmente ahorra trabajo.
- **Zod** para validación de entrada, compartida entre cliente y servidor.
- **@anthropic-ai/sdk** para las llamadas a la API.
- **React Hook Form** para el formulario de 7 pasos.
- PDF: renderizado en servidor desde plantillas HTML (Playwright o `@react-pdf/renderer`;
  elegí vos y justificá en una línea).
- **Vitest** para el motor de reglas. No negociable: las reglas se testean.
- Deploy: Vercel.

---

## IDENTIDAD VISUAL (sacada de los prototipos, respetala)

```css
--night:  #0A1B4D;   --navy:   #14307A;   --brand:  #13357F;   --steel:  #545452;
--ink:    #12172A;   --muted:  #5d6579;   --line:   #dfe4ee;   --ground: #F2F5FA;
--paper:  #ffffff;   --soft:   #f6f8fc;   --tint:   #E3EAF8;
--sun:    #F5B921;   --sun-ink:#5C4100;   --sun-bg: #fff6dc;
--ok:     #1f7a4d;   --ok-bg:  #e2f4ea;
--warn:   #8a5d00;   --warn-bg:#fdf1d2;
--bad:    #9b2c2c;   --bad-bg: #f9e3e3;
--info:   #13357F;   --info-bg:#e6edfb;
```

Tipografía: **Red Hat Display** (UI) y **Red Hat Mono** (protocolos, CPF, NF, series, códigos).
Banner del laudo: azul marino en aprobaciones/autorizaciones, `#9b2c2c` en negativas y rechazos.

El sistema es para operadores que van a vivir adentro ocho horas por día. Densidad informativa alta,
jerarquía clara, cero decoración gratuita. Mobile-first **solo** en el lado cliente; el portal
interno está optimizado para escritorio.

---

## ARQUITECTURA DE DECISIÓN — LA REGLA QUE ORDENA TODO

```
código determinístico  →  franja, ruteo, triaje por señales, liberación
Claude (API)           →  leer fotos (lista cerrada) y redactar textos
persona                →  confirmar toda negativa y todo rechazo
```

**Esto no es una sugerencia de estilo: es el contrato del sistema.**

- La franja de plazo, la consulta de NF/Bling, el ruteo y el triaje verde/amarillo/rojo se calculan
  **en código**, son puros, determinísticos y testeados. La IA no los decide ni los puede torcer.
- La IA entra solo donde hace falta leer una imagen o escribir un texto.
- **Ninguna negativa ni rechazo sale sin que una persona lo confirme, y eso se garantiza con
  permisos en la base de datos, no con una instrucción en el prompt.** La acción
  `confirmar_negativa` simplemente **no existe** en el conector de Claude. Si en algún momento te
  parece más simple dárselo a la IA, pará y preguntame.
- Historial inmutable: la tabla `decisoes` es append-only. Sin updates, sin deletes, para nadie.

---

## MOTOR DE REGLAS — `lib/regras/`

Implementalo como funciones puras, sin I/O, exportadas desde un módulo versionado
(`REGRAS_VERSION = "guia-laudos-v2"`), con los tests al lado.

### Franjas (la contada va de la emisión de la NF al envío del formulario; el arrepentimiento cuenta desde la recepción)

| Franja | Flujo | Ida | Vuelta c/ defecto | Documento | Anexos |
|---|---|---|---|---|---|
| 1–7 días, sin uso | Arrependimento | Vibra Vert | VV + reembolso integral | sin laudo | — |
| 1–30, marketplace | Devolución en el marketplace | regla del marketplace | — | sin laudo, orientar | — |
| 1–30, venta directa | Troca Expressa | Vibra Vert (logística reversa) | Vibra Vert | autorización o rechazo | Termo |
| 31–90 días | Normal | Cliente | Vibra Vert | aprobación o negativa | Frete + Termo |
| 91+ días | Normal | Cliente | Cliente | aprobación o negativa | Frete + Termo |

Garantía larga **parcial**: motor (caneca) y agujero en la carcasa. Rymer 1500 → 6 meses;
Rymer 2000/2500 → 1 año; Vibrinha/800/900 → 2 años. **Gomas (canopla, ventosa, amortecedor,
válvula): 90 días en todos los modelos, sin excepción.**

### Liberación

| Situación | Resultado |
|---|---|
| Sin señal roja y lista cerrada sin hallazgos | automática |
| Falta foto o dato | automática: pedido al cliente |
| Marketplace ≤30 días, arrepentimiento | automática: orientación |
| Señal roja, ítem de la lista encontrado, inconclusivo, fecha o canal no confirmados | **fila humana** |

### Lista cerrada (los únicos 4 ítems que generan rechazo)

`bomba_outra_marca` · `cabo_cortado` · `produto_violado` · `carcaca_quebrada_impacto`

Cada uno se registra como `encontrado | nao_encontrado | inconclusivo`.
**Inconclusivo nunca es rechazo.** En Troca Expressa, una señal roja **no** genera negativa: se
convierte en punto a verificar en la bancada. Solo la lista cerrada genera rechazo en esa franja.

### Escalonamiento obligatorio (de `Garantia_Prazos_e_Faixas.md`)

Si el cliente contesta, insiste, cita ley/CDC, Procon, Reclame Aqui, abogado o Juizado, se niega a
pagar el flete, ya reclamó antes por el mismo producto, o el tono es alterado o amenazante:
**la IA no argumenta, no repite la regla y transfiere a un humano.** Implementá esto como un
detector de disparadores en código que **bloquea** la respuesta automática, no como una instrucción
suave en el prompt.

---

## MODELO DE DATOS (Supabase)

Tablas mínimas, con RLS. Nombres en portugués, igual que el briefing:

- `chamados` — protocolo `AT-AAAA-NNNNNN`, control legado (línea de la planilla), cliente, status,
  franja, canal, fechas, modelo, serie, NF, código de reversa, rastreo.
- `respostas` — una fila por pregunta, con el texto original intacto.
- `fotos` — espacio (`frente`, `verso`, `cabo_emenda`, `etiqueta`, `local_longe`, `local_perto`),
  ruta, versión reducida.
- `avaliacoes` — señales del triaje y lista cerrada ítem por ítem.
- `decisoes` — autor (`codigo` | `claude` | `pessoa`), sugerencia, decisión final, motivo del cambio.
  **Append-only.**
- `bancada` — checklist, mediciones (corriente A, aislación MΩ), piezas, observación tipeada, fotos,
  conclusión sugerida y final, firma.
- `laudos` — tipo, versión, PDF, liberación, quién liberó.
- `conversas` / `emails` — dejá las tablas creadas, sin implementación de canal (Fases 2 y 3).

Índices por protocolo, CPF, NF y status. Storage de fotos **privado**, acceso solo por URL firmada
de corta duración.

---

## INTEGRACIÓN CON LA API DE CLAUDE

- **Sonnet** solo para identificar la lista cerrada en las fotos. Salida estrictamente en JSON,
  una entrada por ítem, validada con Zod antes de tocar la base:

```json
{ "item": "cabo_cortado",
  "resultado": "encontrado" | "nao_encontrado" | "inconclusivo",
  "foto_ref": "cabo_emenda",
  "motivo_inconclusivo": "foto escura" | "parte fora do quadro" | null }
```

- **Haiku** para el texto del laudo, los mensajes al cliente y las respuestas.
- **Reducí las fotos a ~1000 px en el servidor antes de mandarlas.** Sin esto el costo por foto se
  multiplica por 3,5. Es la optimización más importante del proyecto.
- **Cache de prompt** sobre las reglas (~8.000 tokens que se repiten en todos los reclamos).
- **No llames a la IA cuando el código ya resolvió**: marketplace, arrepentimiento, foto faltante.
- Límite mensual de gasto configurado en la cuenta, y registro de todas las llamadas con su costo.
- Si la API falla o devuelve algo que no valida: el reclamo va a la **fila humana**. Nunca se
  inventa un resultado ni se reintenta en loop.

---

## CONECTOR MCP — permisos

| Acción | Claude |
|---|---|
| `listar_chamados`, `ler_chamado` (CPF enmascarado), `ler_fotos` (URL firmada) | permitido |
| `registrar_sugestao`, `registrar_nota` (autor "Claude" en el historial) | permitido |
| `criar_rascunho` (laudo, mensaje, e-mail) | permitido |
| `liberar_aprovacao`, `pedir_informacao`, `orientar_marketplace` | permitido, solo si las reglas en código lo habilitan |
| `responder_conversa`, `responder_email` | permitido, **bloqueado si hay disparador de escalonamiento** |
| `escalar_para_humano` | permitido |
| `confirmar_negativa`, `confirmar_recusa` | **la acción no existe en el conector** |
| `assinar_laudo_bancada` | **bloqueado** — solo el técnico responsable |
| Borrar reclamo o historial | **bloqueado para todos** |

---

## DETALLES DEL FORMULARIO QUE SE SUELEN ARRUINAR

- CPF/CNPJ validado por dígito verificador. El campo de NF **rechaza** un CPF. La chave de 44
  dígitos se descompone en año/mes de emisión, número, serie y CNPJ del emisor.
- Las preguntas de instalación **no muestran los límites del manual** (45 min, 40 cm). Mostrarlos
  induce la respuesta y arruina el triaje. `"Não sei"` siempre disponible.
- Tiempo encendida elegido por franjas; solo "más de 1 hora" pide los minutos exactos.
- 6 fotos obligatorias en espacios guiados. Sin las 6, no hay análisis: el reclamo queda pendiente y
  el cliente recibe el detalle de lo que falta.
- Desvío temprano después del paso 2: marketplace ≤30 días sale orientado, arrepentimiento ≤7 días
  genera protocolo **sin pedir fotos**.
- Aceptación LGPD con finalidad explícita en la revisión.

## PÁGINA DEL PROTOCOLO

Protocolo destacado con botón de copiar y el aviso "anote o número". Botón **Baixar laudo (PDF)**
arriba y abajo de la vista previa, siempre disponible cuando hay laudo. Instrucciones de envío por
franja. **El cliente no imprime nada**: escribe el protocolo en la caja. Campo de rastreo con
validación de formato (2 letras, 9 números, 2 letras). Seguimiento posterior en
`/assistencia/protocolo` con protocolo + CPF.

---

## ORDEN DE EJECUCIÓN — pará en cada checkpoint

1. **Checkpoint 0** — lectura y plan (arriba). Esperá mi OK.
2. Scaffold: Next.js + TS + Tailwind con tokens + Supabase client + estructura de carpetas +
   `CLAUDE.md` en la raíz con las reglas invariantes de este proyecto. **Checkpoint 1.**
3. `lib/regras/` completo con tests de Vitest: franjas, triaje, liberación, lista cerrada,
   escalonamiento. Casos borde: día 7, día 8, día 30, día 31, día 90, día 91; goma vs motor en
   cada modelo; fecha no confirmada. **Checkpoint 2: mostrame la salida de los tests antes de seguir.**
4. Migraciones de Supabase + RLS + storage privado. **Checkpoint 3.**
5. Formulario público de 7 pasos + desvío temprano + generación de protocolo.
6. Pipeline de análisis: reducción de fotos → Sonnet → validación Zod → reglas → liberación o fila.
7. Generación del PDF del laudo con las páginas anexas por franja.
8. Portal interno: panel del día, fila de decisión, ficha, reclamos, bancada.
9. Conector MCP con la matriz de permisos.
10. Migración de los reclamos abiertos de la planilla.

Después de cada punto: commit atómico con mensaje descriptivo y una línea en el chat de qué quedó
hecho y qué falta.

---

## CÓMO QUIERO QUE TRABAJES

- **Preguntá antes de asumir.** Si un documento no cubre un caso, preguntame; no inventes la regla.
- Nada de datos mock que puedan pasar a producción. Si necesitás seed, va en `supabase/seed.sql`
  claramente marcado.
- Cada decisión de arquitectura que tomes por tu cuenta: una línea de justificación en el chat.
- No reescribas archivos enteros para cambiar tres líneas.
- Secretos solo en `.env.local`, con `.env.example` versionado. Nunca una API key en el código.
- Textos de producto y UI en **pt-BR**. Código, comentarios y nombres de variables en inglés,
  salvo los nombres de tablas y campos del dominio, que van en portugués como arriba.
- Accesibilidad real en el formulario público: labels asociados, foco visible, errores anunciados.
  Lo van a usar personas en el campo, desde el celular, con conexión mala.

---

## LO QUE NO TENÉS QUE HACER

- No implementes e-mail `sac@` ni WhatsApp ni chat del sitio. Son Fases 2 y 3.
- No le des a la IA la capacidad de confirmar negativas, rechazos o firmar laudos de bancada.
- No muestres los límites del manual dentro del formulario.
- No prometas "2 años de garantía" en ningún texto sin la aclaración
  "no motor e na carcaça · borrachas 90 dias".
- No copies el HTML de los prototipos: son spec, no código fuente.
- No instales dependencias que no hagan falta.

---

Arrancá por el **Paso 0** y pará en el **Checkpoint 0**.
