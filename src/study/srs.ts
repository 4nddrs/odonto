import { createEmptyCard, fsrs, Rating, State, type Card } from 'ts-fsrs'
import type { Question } from '../data/deck'

const STORAGE_KEY = 'odonto.srs.v1'
const SESSION_LIMIT = 20
const NEW_PER_SESSION = 10

const scheduler = fsrs({ enable_fuzz: true })

interface StoredCard {
  due: string
  stability: number
  difficulty: number
  elapsed_days: number
  scheduled_days: number
  learning_steps: number
  reps: number
  lapses: number
  state: State
  last_review?: string
}

export interface Store {
  version: 1
  cards: Record<string, StoredCard>
  reviews: number
}

export function emptyStore(): Store {
  return { version: 1, cards: {}, reviews: 0 }
}

export function loadStore(): Store {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return emptyStore()
    const parsed = JSON.parse(raw) as Store
    if (parsed.version !== 1 || typeof parsed.cards !== 'object') return emptyStore()
    return { ...emptyStore(), ...parsed }
  } catch {
    return emptyStore()
  }
}

export function saveStore(store: Store): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  } catch {
    // Storage can be disabled; the session still works in memory.
  }
}

function toStored(card: Card): StoredCard {
  return {
    due: card.due.toISOString(),
    stability: card.stability,
    difficulty: card.difficulty,
    elapsed_days: card.elapsed_days,
    scheduled_days: card.scheduled_days,
    learning_steps: card.learning_steps,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state,
    last_review: card.last_review?.toISOString(),
  }
}

function fromStored(stored: StoredCard): Card {
  return {
    due: new Date(stored.due),
    stability: stored.stability,
    difficulty: stored.difficulty,
    elapsed_days: stored.elapsed_days,
    scheduled_days: stored.scheduled_days,
    learning_steps: stored.learning_steps,
    reps: stored.reps,
    lapses: stored.lapses,
    state: stored.state,
    last_review: stored.last_review ? new Date(stored.last_review) : undefined,
  }
}

/** Correct answers grade as Good, misses as Again. */
export function reviewCard(store: Store, questionId: string, correct: boolean): Store {
  const existing = store.cards[questionId]
  const card = existing ? fromStored(existing) : createEmptyCard()
  const preview = scheduler.repeat(card, new Date())
  const next = preview[correct ? Rating.Good : Rating.Again].card

  return {
    version: 1,
    reviews: store.reviews + 1,
    cards: { ...store.cards, [questionId]: toStored(next) },
  }
}

function dueAt(store: Store, id: string): number {
  const stored = store.cards[id]
  return stored ? new Date(stored.due).getTime() : Number.POSITIVE_INFINITY
}

export function isNew(store: Store, id: string): boolean {
  return !store.cards[id]
}

export function pendingCount(store: Store, deck: Question[]): number {
  const now = Date.now()
  let due = 0
  let fresh = 0
  for (const question of deck) {
    const stored = store.cards[question.id]
    if (!stored) fresh++
    else if (new Date(stored.due).getTime() <= now) due++
  }
  return due + Math.min(fresh, NEW_PER_SESSION)
}

export function pickSession(store: Store, deck: Question[]): Question[] {
  const now = Date.now()
  const due: Question[] = []
  const fresh: Question[] = []

  for (const question of deck) {
    const stored = store.cards[question.id]
    if (!stored) fresh.push(question)
    else if (new Date(stored.due).getTime() <= now) due.push(question)
  }

  due.sort((a, b) => dueAt(store, a.id) - dueAt(store, b.id))
  return [...due, ...fresh.slice(0, NEW_PER_SESSION)].slice(0, SESSION_LIMIT)
}

export function nextDue(store: Store, deck: Question[]): string | null {
  const now = Date.now()
  let soonest: number | null = null
  for (const question of deck) {
    const stored = store.cards[question.id]
    if (!stored) continue
    const time = new Date(stored.due).getTime()
    if (time > now && (soonest === null || time < soonest)) soonest = time
  }
  if (soonest === null) return null

  const minutes = Math.round((soonest - now) / 60000)
  if (minutes < 60) return `en ${minutes} min`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `en ${hours} h`
  return `en ${Math.round(hours / 24)} d`
}
