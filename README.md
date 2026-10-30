# Odonto

Visor de anatomía dental en 3D para estudiar: arcada navegable, diente con capas, ficha clínica
y micro-quiz.

```bash
npm install
npm run dev      # http://127.0.0.1:5173
npm run build
```

## Estructura

- `src/scene/ToothScene.ts` — renderer, luces, entorno, órbita, capas y vista explosionada.
- `src/scene/toothLoader.ts` — carga de los GLB (meshopt) y clasificación por capa.
- `src/theme.ts` + tokens de `styles.css` — tema oscuro cálido (por defecto) y claro.
- `src/data/teeth.ts` — los 32 dientes con FDI, Universal, raíces, conductos, erupción y dato.
- `src/data/deck.ts` — banco de preguntas generado desde el dataset.
- `src/study/srs.ts` — FSRS (ts-fsrs) y persistencia en `localStorage`.
- `src/ui/` — arcada, riel de capas y panel con micro-quiz.
- `public/models/teeth/` — 32 mallas anatómicas con capas separadas (~45 MB).
- `public/models/core.glb` — la boca completa (dientes, encía y hueso) para el índice 3D (6,4 MB).
- `design/concept-01.html` — el concepto visual original (estático).
- `odd/tasks/dental-3d-viewer.md` — specs, tareas y límites conocidos.

## Modelos

Cada `tooth-<FDI>.glb` trae esmalte, dentina coronaria y radicular, cemento, ligamento
periodontal, cámara pulpar y los conductos por separado. Licencia **CC BY-SA 2.1 JP**
(derivados de BodyParts3D vía Dental Scope): ver `CREDITS.md`.

## Estado

Prototipo funcional. La arcada es un modelo 3D navegable y cada diente se carga en 3D bajo demanda.
Incluye repaso espaciado: sesiones de 10 tarjetas nuevas, acierto/fallo programado con FSRS y
resumen al terminar. Pendiente: vista 3D de la arcada, sección transversal con plano de corte,
sincronización y contenido revisado por una dentista.
