import { useEffect, useMemo, useRef, useState } from 'react'
import { buildDeck, type Question } from './data/deck'
import { getTooth } from './data/teeth'
import { MouthScene } from './scene/MouthScene'
import { getTheme, type Theme } from './theme'
import { ToothScene, type LayerVisibility } from './scene/ToothScene'
import {
  loadStore,
  nextDue,
  pendingCount,
  pickSession,
  reviewCard,
  saveStore,
  type Store,
} from './study/srs'
import { LayerRail } from './ui/LayerRail'
import { ReviewPanel } from './ui/ReviewPanel'
import { ToothPanel } from './ui/ToothPanel'

const ALL_LAYERS: LayerVisibility = {
  enamel: true,
  dentin: true,
  pulp: true,
  cement: true,
  pdl: false,
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const mouthCanvasRef = useRef<HTMLCanvasElement>(null)
  const sceneRef = useRef<ToothScene | null>(null)
  const mouthRef = useRef<MouthScene | null>(null)
  const deck = useMemo(buildDeck, [])

  const [mode, setMode] = useState<'explore' | 'review'>('explore')
  const [store, setStore] = useState<Store>(loadStore)
  const [view, setView] = useState<'arch' | 'tooth'>('arch')
  const [fdi, setFdi] = useState(16)
  const [layers, setLayers] = useState<LayerVisibility>(ALL_LAYERS)
  const [exploded, setExploded] = useState(false)
  const [loading, setLoading] = useState(true)
  const [mouthLoading, setMouthLoading] = useState(true)
  const [theme, setTheme] = useState<Theme>(getTheme)

  const [queue, setQueue] = useState<Question[]>([])
  const [cursor, setCursor] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [score, setScore] = useState({ correct: 0, wrong: 0 })
  const [finished, setFinished] = useState(false)

  const current = queue[cursor]
  const pending = pendingCount(store, deck)
  const showTooth = mode === 'review' && !finished && current?.kind === 'name'

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('odonto.theme', theme)
    sceneRef.current?.setTheme(theme)
    mouthRef.current?.setTheme(theme)
  }, [theme])

  useEffect(() => {
    if (!canvasRef.current) return
    const scene = new ToothScene(canvasRef.current, { onLoading: setLoading })
    scene.setTheme(document.documentElement.dataset.theme === 'light' ? 'light' : 'dark')
    sceneRef.current = scene
    return () => {
      scene.dispose()
      sceneRef.current = null
    }
  }, [])

  useEffect(() => {
    void sceneRef.current?.setTooth(fdi)
  }, [fdi])

  useEffect(() => {
    if (!mouthCanvasRef.current) return
    const mouth = new MouthScene(mouthCanvasRef.current, {
      onPick: (id) => openTooth(id),
      onLoading: setMouthLoading,
    })
    mouth.setTheme(document.documentElement.dataset.theme === 'light' ? 'light' : 'dark')
    mouthRef.current = mouth
    return () => {
      mouth.dispose()
      mouthRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    mouthRef.current?.setActive(mode === 'explore' && view === 'arch')
  }, [mode, view])

  useEffect(() => {
    sceneRef.current?.setAllLayers(layers)
  }, [layers])

  useEffect(() => {
    sceneRef.current?.setExploded(exploded)
  }, [exploded])

  useEffect(() => {
    if (!showTooth || !current?.subject) return
    setFdi(current.subject)
    requestAnimationFrame(() => sceneRef.current?.reset())
  }, [showTooth, current])

  const openTooth = (id: number) => {
    setFdi(id)
    setView('tooth')
    setExploded(false)
    setLayers(ALL_LAYERS)
    requestAnimationFrame(() => sceneRef.current?.reset())
  }

  const startReview = () => {
    const session = pickSession(store, deck)
    setQueue(session)
    setCursor(0)
    setSelected(null)
    setScore({ correct: 0, wrong: 0 })
    setFinished(session.length === 0)
    setMode('review')
    setView('arch')
    setExploded(false)
    if (session[0]?.subject) setFdi(session[0].subject)
  }

  const answer = (index: number) => {
    if (selected !== null || !current) return
    const isRight = index === current.answer
    setSelected(index)
    setScore((s) => ({
      correct: s.correct + (isRight ? 1 : 0),
      wrong: s.wrong + (isRight ? 0 : 1),
    }))
    setStore((prev) => {
      const next = reviewCard(prev, current.id, isRight)
      saveStore(next)
      return next
    })
  }

  const advance = () => {
    if (cursor + 1 >= queue.length) {
      setFinished(true)
      return
    }
    setCursor((c) => c + 1)
    setSelected(null)
  }

  const closeReview = () => {
    setMode('explore')
    setView('arch')
    setFinished(false)
  }

  const stageView =
    mode === 'review' ? (showTooth ? 'tooth' : 'review') : view

  return (
    <div className="app">
      <header>
        <div className="mark">
          odonto<i>.</i>
        </div>
        <nav>
          <button aria-current={mode === 'explore' ? 'page' : undefined} onClick={() => setMode('explore')}>
            Explorar
          </button>
          <button aria-current={mode === 'review' ? 'page' : undefined} onClick={startReview}>
            Repasar
            {pending > 0 && <span className="nav-badge">{pending}</span>}
          </button>
        </nav>
        <div className="header-right">
          <span className="pill">32 dientes · FDI</span>
          <button
            className="theme-toggle"
            onClick={() => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))}
            aria-label={theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
            title={theme === 'dark' ? 'Tema claro' : 'Tema oscuro'}
          >
            {theme === 'dark' ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
                <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" />
              </svg>
            )}
          </button>
        </div>
      </header>

      <main className="main">
        <section className={`stage view-${stageView}`}>
          <div className="stage-glow" aria-hidden />

          <div className="scene" aria-hidden={stageView !== 'tooth'}>
            <div className="scene-floor" aria-hidden />
            <canvas ref={canvasRef} />
          </div>

          <div className="arch-wrap" aria-hidden={stageView !== 'arch'}>
            <canvas className="mouth-canvas" ref={mouthCanvasRef} />
            <p className="hint">
              Toca un diente <kbd>↗</kbd>
            </p>
          </div>

          {stageView === 'review' && (
            <div className="review-face" aria-hidden>
              {finished ? '' : (current?.subject ?? '?')}
            </div>
          )}

          {mode === 'explore' && view === 'tooth' && (
            <>
              <LayerRail
                layers={layers}
                onReset={() => {
                  setLayers(ALL_LAYERS)
                  setExploded(false)
                }}
                onToggle={(id) => setLayers((current) => ({ ...current, [id]: !current[id] }))}
              />
              <div className="modes" role="group" aria-label="Vista del diente">
                <button aria-pressed={!exploded} onClick={() => setExploded(false)}>
                  Entero
                </button>
                <button aria-pressed={exploded} onClick={() => setExploded(true)}>
                  Explosión
                </button>
              </div>
            </>
          )}

          {stageView === 'tooth' && (
            <div className={`loader ${loading ? 'on' : ''}`} role="status">
              Cargando diente
            </div>
          )}
          {stageView === 'arch' && (
            <div className={`loader ${mouthLoading ? 'on' : ''}`} role="status">
              Cargando la boca
            </div>
          )}

          <div className="stage-credit">
            Modelos 3D:{' '}
            <a href="https://dental-scope.com" target="_blank" rel="noreferrer">
              Dental Scope
            </a>{' '}
            · BodyParts3D · CC BY-SA 2.1 JP
          </div>
        </section>

        <aside>
          {mode === 'review' ? (
            <ReviewPanel
              question={current}
              index={cursor + 1}
              total={queue.length}
              selected={selected}
              correct={score.correct}
              wrong={score.wrong}
              onSelect={answer}
              onNext={advance}
              finished={finished}
              onRestart={startReview}
              onClose={closeReview}
              nextReview={nextDue(store, deck)}
            />
          ) : view === 'arch' ? (
            <div className="panel panel-intro">
              <div className="eyebrow">Empieza por cualquier diente</div>
              <h1>
                La boca <em>completa</em>
              </h1>
              <p className="sub">
                Toca un diente de la arcada para verlo en 3D, girarlo y separar sus capas.
              </p>
              <div className="facts">
                <div className="fact">
                  <b>32</b>
                  <span>dientes</span>
                </div>
                <div className="fact">
                  <b>5</b>
                  <span>capas</span>
                </div>
                <div className="fact">
                  <b>8</b>
                  <span>tipos</span>
                </div>
                <div className="fact">
                  <b>{pending}</b>
                  <span>por repasar</span>
                </div>
              </div>
              <p className="pearl">
                <span className="pearl-dot" />
                Arrastra para girar el diente. La rueda o dos dedos acercan.
              </p>
              <button className="btn" onClick={startReview} disabled={pending === 0}>
                {pending === 0 ? 'Nada pendiente' : `Repasar ${pending} tarjetas`}
              </button>
            </div>
          ) : (
            <ToothPanel tooth={getTooth(fdi)} onBack={() => setView('arch')} />
          )}
        </aside>
      </main>
    </div>
  )
}
