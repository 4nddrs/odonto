# Odonto — visor 3D de dientes

App web para estudiar anatomía dental: arcada navegable, diente en 3D con capas, ficha clínica y micro-quiz.
Feature: `dental-3d-viewer` · Entrega: prototipo local (`npm run dev`).
Stack: Vite + React 19 + TypeScript + three.js (sin react-three-fiber) · sin backend.

## Specs

- **S1.** "un modelo de la boca en 3d" — la boca completa en 3D (dientes, encía y hueso) es la pantalla de entrada y el índice: se toca un diente y se abre su ficha.
- **S2.** "tocas un diente y se enfoca en el" — al tocar un diente, la arcada se desvanece y entra el modelo 3D del diente con transición de cámara.
- **S3.** "te da info" — panel contextual con FDI, Universal, nombre, arcada, raíces, conductos, erupción y dato frecuente.
- **S4.** "puedes ver sus distintas capas" — riel que enciende y apaga esmalte, dentina y pulpa sobre el modelo 3D.
- **S5.** "algo super intuitivo" — un solo gesto primario (tocar), cero tutoriales, la UI aparece solo cuando hace falta.
- **S6.** "que la persona se enamore de la web, no que le de flojera mirarla" — paleta marfil/tinta/coral, tipografía editorial, luz cálida, sombra de contacto, movimiento con muelle.
- **S7.** El diente se puede rotar (arrastre) y acercar (rueda / pinch).
- **S9.** Confort visual: tema oscuro cálido por defecto (fondo ~8% de luminancia), interruptor claro/oscuro persistente.
- **S8.** Repaso espaciado: banco generado desde el dataset, sesiones de 10 tarjetas nuevas, programación FSRS y progreso que sobrevive al cierre.

## Tasks

| ID | Qué | Specs | Ruta | Estado |
|----|-----|-------|------|--------|
| T1 | Scaffold Vite + React + TS + tokens de diseño | S6 | inline | ✅ `package.json`, `src/styles.css` |
| T2 | Escena three.js: luz, entorno, cámara, órbita, sombra | S2, S6, S7 | inline | ✅ `src/scene/ToothScene.ts` |
| T3 | Geometría del diente por extrusión de capas | S2, S4 | inline | ✅ `src/scene/toothGeometry.ts` |
| T4 | Arcada SVG navegable con numeración FDI | S1, S5 | inline | ✅ `src/ui/Arch.tsx` |
| T5 | Riel de capas + vista explosionada | S4 | inline | ✅ `src/ui/LayerRail.tsx` |
| T6 | Panel de ficha con dataset + micro-quiz | S3 | inline | ✅ `src/data/teeth.ts`, `src/ui/ToothPanel.tsx` |
| T7 | Pulido, responsive y verificación | S5, S6 | inline | ✅ build + smoke sin errores de consola |
| T8 | Sustituir la malla esquemática por los GLB anatómicos | S2, S4 | inline | ✅ `toothLoader.ts` + `public/models/teeth` |
| T9 | Banco de preguntas + FSRS + pantalla Repasar | S8 | inline | ✅ `data/deck.ts`, `study/srs.ts`, `ui/ReviewPanel.tsx` |
| T10 | Arcada 3D con picking (sustituye al SVG) | S1, S5 | inline | ✅ `scene/MouthScene.ts` + `public/models/core.glb` |
| T11 | Tokens de color + tema oscuro + interruptor | S9 | inline | ✅ `styles.css`, `theme.ts`, `setTheme()` en ambas escenas |

## Verificación

- `npx tsc --noEmit` → sin errores.
- `npm run build` → OK (857 kB, 233 kB gzip).
- Smoke en navegador: 32 chips con FDI correcto, navegación 38 → arcada → 16, capas conmutan, sin `pageerror` ni `console.error`.
- Revisión visual en 1440×900 y 390×844.
- Modelos reales: 32 GLB cargados y clasificados; 16 (3 raíces, 4 conductos) y 36 (2 raíces, 3 conductos) verificados visualmente.
- Sin errores de consola en carga, navegación y cambio de capas.

## Límites conocidos

- La arcada 3D usa `core.glb` (6,4 MB) con 32 dientes, encía y hueso; el detalle por diente carga su propio GLB.
- El picking 3D no tiene equivalente de teclado: sin navegación accesible todavía.
- El encuadre se calcula al cargar; si se gira a pantalla horizontal no se recalcula.
- La superficie radicular del asset trae un patrón de relieve del pipeline de origen; se suavizó el material, no la malla. Un re-mallado lo resolvería.
- El ligamento periodontal viene apagado por defecto porque cubre todo el root y tapa las demás capas.
- El repaso guarda en `localStorage` (sin backend): no sincroniza entre dispositivos.
- La nota se deriva del acierto (bien = Good, mal = Again); no hay botones Hard/Easy.
- Cada sesión mete 10 tarjetas nuevas como máximo; no hay límite diario real.
- Los modelos pesan ~45 MB en total (0,5–3,4 MB por diente, carga diferida).

## Log

**L1.** (28 oct 2026) "estaba pensando en hacer una web para ayudar a estudiar a una dentista... algo super intuitivo, un modelo de la boca en 3d, tocas un diente y se enfoca en el, te da info, puedes ver sus distintas capas, y otras cosas, investiga que seria util poner ahi y como podemos hacerlo"

**L2.** (28 oct 2026) "tiene un diseño muy plano y poco amigable, queremos que la persona se enamore de la web, no que le de flojera mirarla, ademas tiene que ser mas amigable con el usuario, intuitiva... no se exactamente lo que esta estudiando, pero esta en la universidad con odontologia"

**L3.** (29 oct 2026) "si, me parece bien, comencemos" — aprueba la dirección visual del concepto `design/concept-01.html`.

**Decisión.** v1 usa una malla esquemática por extrusión de las siluetas SVG del concepto (esmalte/dentina/pulpa). La malla anatómica real (GLB con capas) es un reemplazo de asset, no de arquitectura.

**L4.** (30 oct 2026) Implementado el visor. Hallazgos:
- `className={`stage ${view}`}` colisionaba con la clase `.arch` del SVG y le aplicaba su `max-width: 680px`; se separó a `view-*` y `arch-map`.
- `SVGLoader` no invierte el eje Y: hay que espejar la geometría y reordenar el winding antes de recalcular normales.
- La extrusión plana se veía como una galleta; se resolvió con un "pillow" (escala XY según `z²`) que redondea el sólido.
- La explosión en Z era ilegible en cámara frontal: se pasó a un abanico en X/Y con la cámara retrocediendo.

**L5.** (30 oct 2026) El usuario decide usar los GLB de Dental Scope. Integrados los 32 dientes:
- Cada GLB trae `enamel`, `dentin-coronal`, `dentin-radicular`, `cementum`, `pdl`, `pulp-chamber` y los `canal-*` por separado. Requiere `MeshoptDecoder` + `KHR_mesh_quantization`.
- El modelo viene en cm y en coordenadas de arcada; se centra y escala a 420 unidades por diente.
- El giro de 180° para dejar la corona arriba debe ir en un grupo *fuera* del anclaje de normalización (si comparte grupo con la traslación, el contenido se desplaza 2·centro). De ahí el `flipper`.
- Los offsets de explosión van en un pivote **fuera** del grupo escalado; dentro se multiplicaban por la escala (~171×) y las capas se iban de pantalla.
- El patrón ondulado de la raíz es geometría del origen, no z-fighting (se comprobó ocultando capas). Un suavizado laplaciano de 2 pasadas dejaba el screenshot de Playwright colgado en SwiftShader; se descartó y se subió la rugosidad del material.

**L6.** (30 oct 2026) Implementado el repaso espaciado (S8). Decisiones:
- El banco se **genera** desde `teeth.ts` (5 tarjetas por diente + 10 conceptuales ≈ 170), no es un JSON mantenido a mano. Está sembrado con un shuffle determinista para que el orden sea estable.
- Las tarjetas de "identificar" muestran el diente en 3D y las opciones comparten arco y lado para que la respuesta salga de la morfología, no de descartar el único nombre distinto.
- Las de raíces/conductos no muestran el modelo: revelaría la respuesta.
- `ts-fsrs` 5.4 con `enable_fuzz`; acierto → Good, fallo → Again; `localStorage` con versión.
- Verificado: 3 respuestas persisten y sobreviven al recargar, la sesión termina en resumen, 0 errores de consola.

**L7.** (30 oct 2026) El usuario pide una boca 3D en lugar del índice SVG. Se integra `core.glb` (44 nodos: 32 `tooth-XX`, encía, maxilar, mandíbula, senos, cóndilos), sin materiales en el archivo, así que se asignan por tipo de nodo.
- El encuadre se calcula sobre el **bbox de los dientes**, no del hueso: si se encuadra el hueso entero aparece el cráneo con la fosa nasal y la boca pequeña.
- Un máscara radial en CSS funde los bordes del hueso con el fondo y evita el corte seco.
- El picking va por raycast sobre los meshes de diente (no sobre encía/hueso) y se resuelve en el bucle de render, no en cada `pointermove`.
- El encuadre debe considerar el **aspecto**: en vertical, encuadrar solo por altura dejaba la arcada fuera de cuadro.
- Quitar el hueso y dejar solo dientes+encía NO funciona: las raíces quedan al aire y parece una dentadura.

**L8.** (30 oct 2026) "la web es muy blanca, me quema los ojos". El fondo estaba en 93% de luminancia y las tarjetas eran casi blancas (`rgba(255,252,247,.72)`).
- Se rehízo la capa de color con tokens (`--surface`, `--line`, `--stage-a`, `--shadow`, `--scene-filter`…) y dos paletas: oscuro cálido (por defecto) y claro atenuado.
- El tema se aplica en `documentElement.dataset.theme` antes del primer render para evitar el flash, y se persiste en `localStorage`.
- **Trampa:** al cambiar el tema, los materiales 3D creados después de `setTheme()` conservaban los colores viejos. Las escenas guardan el tema y lo reaplican al terminar la carga (`applyTheme` al final de `load`).
- **Trampa 2:** el esmalte translúcido (opacidad 0.38) sobre fondo oscuro se ve gris, porque mezcla el color con el negro. En oscuro sube a 0.92 con `depthWrite` y el color se aclara; en claro se mantiene translúcido.
