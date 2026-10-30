export type Arch = 'upper' | 'lower'
export type Side = 'right' | 'left'

export type ToothKind = 'central' | 'lateral' | 'canine' | 'pm1' | 'pm2' | 'm1' | 'm2' | 'm3'

export interface Tooth {
  fdi: number
  universal: number
  quadrant: 1 | 2 | 3 | 4
  position: number
  kind: ToothKind
  arch: Arch
  side: Side
  name: string
  roots: number
  canals: number
  eruption: string
  vertucci?: string
  pearl: string
}

export const KIND_NAME: Record<ToothKind, string> = {
  central: 'Incisivo central',
  lateral: 'Incisivo lateral',
  canine: 'Canino',
  pm1: 'Primer premolar',
  pm2: 'Segundo premolar',
  m1: 'Primer molar',
  m2: 'Segundo molar',
  m3: 'Tercer molar',
}

type TypeFact = { roots: number; canals: number; eruption: string; vertucci?: string; pearl: string }

export const FACTS: Record<Arch, Record<ToothKind, TypeFact>> = {
  upper: {
    central: {
      roots: 1,
      canals: 1,
      eruption: '7 – 8 años',
      pearl: 'El incisivo más ancho del arco; su corona es casi simétrica.',
    },
    lateral: {
      roots: 1,
      canals: 1,
      eruption: '8 – 9 años',
      pearl: 'Corona más estrecha, con el ángulo incisal distal redondeado.',
    },
    canine: {
      roots: 1,
      canals: 1,
      eruption: '11 – 12 años',
      pearl: 'La raíz más larga de la boca; guía canina en la oclusión.',
    },
    pm1: {
      roots: 2,
      canals: 2,
      eruption: '10 – 11 años',
      pearl: 'Es el premolar que más varía: puede tener 1, 2 o 3 raíces.',
    },
    pm2: {
      roots: 1,
      canals: 1,
      eruption: '10 – 12 años',
      pearl: 'Un solo conducto en la mayoría de los casos, con variantes.',
    },
    m1: {
      roots: 3,
      canals: 4,
      eruption: '6 años',
      vertucci: 'II / IV',
      pearl: 'El primer diente permanente en erupcionar, a los 6 años.',
    },
    m2: {
      roots: 3,
      canals: 3,
      eruption: '12 años',
      vertucci: 'II',
      pearl: 'Casi idéntico al primer molar, algo más pequeño y más distal.',
    },
    m3: {
      roots: 3,
      canals: 3,
      eruption: '17 – 21 años',
      pearl: 'El más variable en forma, número de raíces y cronología.',
    },
  },
  lower: {
    central: {
      roots: 1,
      canals: 1,
      eruption: '6 – 7 años',
      pearl: 'El diente más pequeño de la boca, con corona simétrica.',
    },
    lateral: {
      roots: 1,
      canals: 1,
      eruption: '7 – 8 años',
      pearl: 'Algo más ancho que el central; ángulo incisal distal redondeado.',
    },
    canine: {
      roots: 1,
      canals: 1,
      eruption: '9 – 10 años',
      pearl: 'Corona más estrecha que la del canino superior, con dos cúspides.',
    },
    pm1: {
      roots: 1,
      canals: 1,
      eruption: '10 – 12 años',
      pearl: 'Su corona se inclina hacia lingual; cúspide vestibular dominante.',
    },
    pm2: {
      roots: 1,
      canals: 1,
      eruption: '11 – 12 años',
      pearl: 'Cúspides casi iguales, lo que le da un contorno redondeado.',
    },
    m1: {
      roots: 2,
      canals: 3,
      eruption: '6 años',
      vertucci: 'II / IV',
      pearl: 'Conducto mesial con dos ramas en la mayoría de los casos.',
    },
    m2: {
      roots: 2,
      canals: 3,
      eruption: '12 años',
      vertucci: 'II',
      pearl: 'Raíces más próximas que en el primer molar, a veces fusionadas.',
    },
    m3: {
      roots: 2,
      canals: 3,
      eruption: '17 – 21 años',
      pearl: 'Frecuentemente impactado; su morfología es impredecible.',
    },
  },
}

const QUADRANTS: Record<1 | 2 | 3 | 4, { arch: Arch; side: Side }> = {
  1: { arch: 'upper', side: 'right' },
  2: { arch: 'upper', side: 'left' },
  3: { arch: 'lower', side: 'left' },
  4: { arch: 'lower', side: 'right' },
}

const KIND_BY_POSITION: ToothKind[] = ['central', 'lateral', 'canine', 'pm1', 'pm2', 'm1', 'm2', 'm3']
const SIDE_NAME: Record<Side, string> = { right: 'derecho', left: 'izquierdo' }
export const ARCH_LABEL: Record<Arch, string> = { upper: 'superior', lower: 'inferior' }
export const SIDE_LABEL: Record<Side, string> = { right: 'Derecho', left: 'Izquierdo' }

export function universalOf(fdi: number): number {
  const q = Math.floor(fdi / 10) as 1 | 2 | 3 | 4
  const i = fdi % 10
  if (q === 1) return 9 - i
  if (q === 2) return 8 + i
  if (q === 3) return 16 + i
  return 24 + i
}

function makeTooth(q: 1 | 2 | 3 | 4, i: number): Tooth {
  const kind = KIND_BY_POSITION[i - 1]
  const { arch, side } = QUADRANTS[q]
  const fact = FACTS[arch][kind]
  return {
    fdi: q * 10 + i,
    universal: universalOf(q * 10 + i),
    quadrant: q,
    position: i,
    kind,
    arch,
    side,
    name: `${KIND_NAME[kind]} ${ARCH_LABEL[arch]} ${SIDE_NAME[side]}`,
    ...fact,
  }
}

export const TEETH: Tooth[] = ([1, 2, 3, 4] as const).flatMap((q) =>
  [1, 2, 3, 4, 5, 6, 7, 8].map((i) => makeTooth(q, i)),
)

export function getTooth(fdi: number): Tooth {
  return TEETH.find((t) => t.fdi === fdi) ?? TEETH[0]
}
