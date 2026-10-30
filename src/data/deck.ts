import { TEETH, type Tooth, type ToothKind } from './teeth'

export type QuestionKind = 'name' | 'roots' | 'canals' | 'eruption' | 'universal' | 'concept'

export interface Question {
  id: string
  kind: QuestionKind
  prompt: string
  options: string[]
  answer: number
  explain: string
  /** Tooth shown in the 3D stage while answering, if any. */
  subject?: number
}

function hash(text: string): number {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function seededShuffle<T>(items: T[], seed: number): T[] {
  let state = seed || 1
  const next = () => {
    state ^= state << 13
    state ^= state >>> 17
    state ^= state << 5
    return (state >>> 0) / 4294967296
  }
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

function buildOptions(
  correct: string,
  distractors: string[],
  id: string,
): { options: string[]; answer: number } {
  const palette = [correct, ...distractors.filter((d) => d !== correct)]
  const unique = [...new Set(palette)].slice(0, 4)
  const options = seededShuffle(unique, hash(id))
  return { options, answer: options.indexOf(correct) }
}

function agePool(): string[] {
  const pool = new Set<string>()
  for (const tooth of TEETH) pool.add(tooth.eruption)
  return [...pool]
}

const TOOTH_CLASS: Record<ToothKind, 'anterior' | 'premolar' | 'molar'> = {
  central: 'anterior',
  lateral: 'anterior',
  canine: 'anterior',
  pm1: 'premolar',
  pm2: 'premolar',
  m1: 'molar',
  m2: 'molar',
  m3: 'molar',
}

function nameDistractors(tooth: Tooth, count: number): string[] {
  // Options differ by tooth type, never only by side: the 3D shows morphology,
  // not which quadrant it came from. Near types come first, so the choice is
  // the one that actually matters (central vs lateral vs canine).
  const candidates = TEETH.filter(
    (t) => t.arch === tooth.arch && t.side === tooth.side && t.kind !== tooth.kind,
  )
  const byKind = new Map<ToothKind, Tooth>()
  for (const candidate of candidates) {
    if (!byKind.has(candidate.kind)) byKind.set(candidate.kind, candidate)
  }

  const kinds = [...byKind.keys()]
  const near = kinds.filter((k) => TOOTH_CLASS[k] === TOOTH_CLASS[tooth.kind])
  const far = kinds.filter((k) => TOOTH_CLASS[k] !== TOOTH_CLASS[tooth.kind])
  const ordered = [
    ...seededShuffle(near, hash(`near:${tooth.fdi}`)),
    ...seededShuffle(far, hash(`far:${tooth.fdi}`)),
  ]

  return ordered
    .slice(0, count)
    .map((kind) => byKind.get(kind))
    .filter((t): t is Tooth => Boolean(t))
    .map((t) => t.name)
}

function toothCards(tooth: Tooth): Question[] {
  const id = (kind: string) => `${tooth.fdi}:${kind}`
  const cards: Question[] = []

  {
    const cardId = id('name')
    const { options, answer } = buildOptions(tooth.name, nameDistractors(tooth, 3), cardId)
    cards.push({
      id: cardId,
      kind: 'name',
      subject: tooth.fdi,
      prompt: `¿Qué diente es el ${tooth.fdi}?`,
      options,
      answer,
      explain: `${tooth.name}. ${tooth.pearl}`,
    })
  }

  {
    const cardId = id('roots')
    const { options, answer } = buildOptions(
      String(tooth.roots),
      ['1', '2', '3'],
      cardId,
    )
    cards.push({
      id: cardId,
      kind: 'roots',
      subject: tooth.fdi,
      prompt: `¿Cuántas raíces tiene el ${tooth.fdi}?`,
      options,
      answer,
      explain: `${tooth.name}: ${tooth.roots} ${tooth.roots === 1 ? 'raíz' : 'raíces'} y ${tooth.canals} conductos.`,
    })
  }

  {
    const cardId = id('canals')
    const { options, answer } = buildOptions(
      String(tooth.canals),
      ['1', '2', '3', '4'],
      cardId,
    )
    cards.push({
      id: cardId,
      kind: 'canals',
      subject: tooth.fdi,
      prompt: `¿Cuántos conductos tiene el ${tooth.fdi}?`,
      options,
      answer,
      explain: `${tooth.name}: ${tooth.canals} conductos${tooth.vertucci ? ` · Vertucci ${tooth.vertucci}` : ''}.`,
    })
  }

  {
    const cardId = id('eruption')
    const pool = agePool().filter((age) => age !== tooth.eruption)
    const { options, answer } = buildOptions(tooth.eruption, seededShuffle(pool, hash(cardId)).slice(0, 3), cardId)
    cards.push({
      id: cardId,
      kind: 'eruption',
      subject: tooth.fdi,
      prompt: `¿A qué edad erupciona el ${tooth.fdi}?`,
      options,
      answer,
      explain: `${tooth.name}: ${tooth.eruption}.`,
    })
  }

  {
    const cardId = id('universal')
    const neighbours = [-3, -2, -1, 1, 2, 3]
      .map((delta) => tooth.universal + delta)
      .filter((value) => value >= 1 && value <= 32)
      .map(String)
    const { options, answer } = buildOptions(String(tooth.universal), neighbours, cardId)
    cards.push({
      id: cardId,
      kind: 'universal',
      subject: tooth.fdi,
      prompt: `¿Cuál es el número Universal del ${tooth.fdi}?`,
      options,
      answer,
      explain: `FDI ${tooth.fdi} = Universal ${tooth.universal}.`,
    })
  }

  return cards
}

interface ConceptSeed {
  id: string
  prompt: string
  correct: string
  distractors: string[]
  explain: string
}

const CONCEPTS: ConceptSeed[] = [
  {
    id: 'layer:crown',
    prompt: '¿Qué capa cubre la corona?',
    correct: 'Esmalte',
    distractors: ['Dentina', 'Cemento', 'Pulpa'],
    explain: 'El esmalte cubre la corona; el cemento cubre la raíz.',
  },
  {
    id: 'layer:under-enamel',
    prompt: '¿Qué tejido está justo bajo el esmalte?',
    correct: 'Dentina',
    distractors: ['Cemento', 'Pulpa', 'Ligamento periodontal'],
    explain: 'La dentina forma el cuerpo del diente, entre esmalte y pulpa.',
  },
  {
    id: 'layer:root',
    prompt: '¿Qué tejido cubre la raíz?',
    correct: 'Cemento',
    distractors: ['Esmalte', 'Dentina', 'Pulpa'],
    explain: 'El cemento recubre la dentina radicular y ancla el ligamento.',
  },
  {
    id: 'layer:pdl',
    prompt: '¿Qué estructura une el diente al hueso?',
    correct: 'Ligamento periodontal',
    distractors: ['Cemento', 'Pulpa', 'Esmalte'],
    explain: 'El ligamento periodontal amortigua y fija el diente al alveolo.',
  },
  {
    id: 'numbering:fdi',
    prompt: '¿Cómo se lee el número FDI 36?',
    correct: 'Tercer cuadrante, sexto diente',
    distractors: [
      'Primer cuadrante, sexto diente',
      'Tercer cuadrante, tercer diente',
      'Sexto cuadrante, tercer diente',
    ],
    explain: 'FDI usa dos dígitos: cuadrante (1–4) y posición (1–8).',
  },
  {
    id: 'counting:permanent',
    prompt: '¿Cuántos dientes tiene la dentición permanente?',
    correct: '32',
    distractors: ['28', '20', '24'],
    explain: '32 piezas: 8 por cuadrante, incluidos los terceros molares.',
  },
  {
    id: 'eruption:first',
    prompt: '¿Qué diente permanente erupciona primero?',
    correct: 'Primer molar',
    distractors: ['Incisivo central', 'Canino', 'Segundo premolar'],
    explain: 'El primer molar erupciona alrededor de los 6 años, sin reemplazar ningún diente.',
  },
  {
    id: 'morphology:longest-root',
    prompt: '¿Qué diente tiene la raíz más larga?',
    correct: 'Canino',
    distractors: ['Incisivo central', 'Primer molar', 'Segundo premolar'],
    explain: 'La raíz del canino es la más larga y robusta de la arcada.',
  },
  {
    id: 'numbering:universal',
    prompt: '¿Qué numeración va del 1 al 32?',
    correct: 'Universal (ADA)',
    distractors: ['FDI (ISO 3950)', 'Palmer', 'Decidua'],
    explain: 'Universal numera del 1 (tercer molar superior derecho) al 32.',
  },
  {
    id: 'layer:horn',
    prompt: '¿Qué son los cuernos pulpares?',
    correct: 'Prolongaciones de la cámara hacia las cúspides',
    distractors: [
      'Conductos accesorios en el ápice',
      'Zonas de esmalte sin dentina',
      'Inserciones del ligamento periodontal',
    ],
    explain: 'La cámara pulpar se prolonga hacia cada cúspide; se ven en la sección.',
  },
]

function conceptCards(): Question[] {
  return CONCEPTS.map((seed) => {
    const { options, answer } = buildOptions(seed.correct, seed.distractors, `concept:${seed.id}`)
    return {
      id: `concept:${seed.id}`,
      kind: 'concept' as const,
      prompt: seed.prompt,
      options,
      answer,
      explain: seed.explain,
    }
  })
}

let cached: Question[] | null = null

export function buildDeck(): Question[] {
  if (cached) return cached
  const cards = [...TEETH.flatMap(toothCards), ...conceptCards()]
  cached = seededShuffle(cards, 0x9e3779b9)
  return cached
}

export function kindLabel(kind: QuestionKind): string {
  switch (kind) {
    case 'name':
      return 'Identificar'
    case 'roots':
      return 'Raíces'
    case 'canals':
      return 'Conductos'
    case 'eruption':
      return 'Erupción'
    case 'universal':
      return 'Numeración'
    default:
      return 'Concepto'
  }
}
