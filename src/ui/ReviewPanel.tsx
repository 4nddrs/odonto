import { kindLabel, type Question } from '../data/deck'

interface Props {
  question?: Question
  index: number
  total: number
  selected: number | null
  correct: number
  wrong: number
  onSelect: (index: number) => void
  onNext: () => void
  finished: boolean
  onRestart: () => void
  onClose: () => void
  nextReview: string | null
}

const LETTERS = ['A', 'B', 'C', 'D']

export function ReviewPanel({
  question,
  index,
  total,
  selected,
  correct,
  wrong,
  onSelect,
  onNext,
  finished,
  onRestart,
  onClose,
  nextReview,
}: Props) {
  if (finished || !question) {
    if (total === 0) {
      return (
        <div className="panel review">
          <div className="eyebrow">Repaso</div>
          <h1>Nada pendiente</h1>
          <p className="sub">
            Ya repasaste todo lo que tocaba. Vuelve más tarde o explora un diente.
          </p>
          {nextReview && (
            <p className="pearl">
              <span className="pearl-dot" />
              Próximo repaso {nextReview}.
            </p>
          )}
          <button className="btn" onClick={onClose}>
            Volver a explorar
          </button>
        </div>
      )
    }

    const totalAnswered = correct + wrong
    return (
      <div className="panel review">
        <div className="eyebrow">Sesión completada</div>
        <h1>
          {correct} de {totalAnswered}
        </h1>
        <p className="sub">
          {wrong === 0
            ? 'Sin fallos. Las tarjetas vuelven más tarde, no mañana.'
            : `${wrong} ${wrong === 1 ? 'fallo' : 'fallos'} vuelven en la próxima sesión.`}
        </p>
        {nextReview && (
          <p className="pearl">
            <span className="pearl-dot" />
            Próximo repaso {nextReview}.
          </p>
        )}
        <button className="btn" onClick={onRestart}>
          Otra sesión
        </button>
        <button className="btn ghost" onClick={onClose}>
          Volver a explorar
        </button>
      </div>
    )
  }

  const answered = selected !== null
  const isRight = selected === question.answer

  return (
    <div className="panel review">
      <div className="review-head">
        <span className="eyebrow">{kindLabel(question.kind)}</span>
        <span className="review-count">
          {index} / {total}
        </span>
      </div>

      <div className="review-bar">
        <i style={{ width: `${Math.round(((index - 1) / total) * 100)}%` }} />
      </div>

      <h1 className="review-q">{question.prompt}</h1>

      <div className="review-options">
        {question.options.map((option, i) => {
          const state = !answered
            ? ''
            : i === question.answer
              ? 'ok'
              : i === selected
                ? 'bad'
                : 'dim'
          return (
            <button
              key={option}
              className={`review-option ${state}`}
              onClick={() => onSelect(i)}
              disabled={answered}
            >
              <span className="review-letter">{LETTERS[i]}</span>
              {option}
            </button>
          )
        })}
      </div>

      <div className={`review-explain ${answered ? 'show' : ''}`}>
        <strong>{isRight ? 'Correcto. ' : 'No. '}</strong>
        {question.explain}
      </div>

      {answered && (
        <button className="btn" onClick={onNext}>
          {index === total ? 'Terminar' : 'Siguiente'}
        </button>
      )}
    </div>
  )
}
