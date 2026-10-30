import { useEffect, useState } from 'react'
import { ARCH_LABEL, KIND_NAME, type Tooth } from '../data/teeth'

interface Props {
  tooth: Tooth
  onBack: () => void
}

const ROOT_OPTIONS = [1, 2, 3]

export function ToothPanel({ tooth, onBack }: Props) {
  const [answer, setAnswer] = useState<number | null>(null)

  useEffect(() => setAnswer(null), [tooth.fdi])

  const correct = answer === tooth.roots

  return (
    <div className="panel">
      <button className="back" onClick={onBack}>
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
          <path d="M10 3 5 8l5 5" />
        </svg>
        Arcada
      </button>

      <div className="eyebrow">
        FDI {tooth.fdi} · Universal {tooth.universal}
      </div>
      <h1>
        {KIND_NAME[tooth.kind]} <em>{ARCH_LABEL[tooth.arch]}</em>
      </h1>
      <p className="sub">
        {tooth.side === 'right' ? 'Derecho' : 'Izquierdo'} · erupción {tooth.eruption}
      </p>

      <div className="facts">
        <div className="fact">
          <b>{tooth.roots}</b>
          <span>{tooth.roots === 1 ? 'raíz' : 'raíces'}</span>
        </div>
        <div className="fact">
          <b>{tooth.canals}</b>
          <span>{tooth.canals === 1 ? 'conducto' : 'conductos'}</span>
        </div>
        <div className="fact">
          <b>{tooth.vertucci ?? '—'}</b>
          <span>Vertucci</span>
        </div>
        <div className="fact">
          <b>{tooth.position}º</b>
          <span>posición</span>
        </div>
      </div>

      <p className="pearl">
        <span className="pearl-dot" />
        {tooth.pearl}
      </p>

      <div className="quiz">
        <p className="qtext">¿Cuántas raíces tiene?</p>
        <div className="opts">
          {ROOT_OPTIONS.map((option) => {
            const state = answer === null ? '' : option === tooth.roots ? 'ok' : option === answer ? 'bad' : ''
            return (
              <button key={option} className={`opt ${state}`} onClick={() => setAnswer(option)}>
                {option}
              </button>
            )
          })}
        </div>
        <p className={`fb ${answer !== null ? 'show' : ''}`}>
          {correct
            ? 'Correcto. Si aciertas seguido, esta tarjeta vuelve más tarde.'
            : `Tiene ${tooth.roots} ${tooth.roots === 1 ? 'raíz' : 'raíces'}. Esta vuelve mañana.`}
        </p>
      </div>
    </div>
  )
}
