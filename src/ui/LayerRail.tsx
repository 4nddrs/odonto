import type { LayerId, LayerVisibility } from '../scene/toothLoader'

const ITEMS: { id: LayerId; label: string; color: string }[] = [
  { id: 'enamel', label: 'Esmalte', color: '#F2E4CB' },
  { id: 'dentin', label: 'Dentina', color: '#DCB888' },
  { id: 'pulp', label: 'Pulpa', color: '#C25C3B' },
  { id: 'cement', label: 'Cemento', color: '#CBB08A' },
  { id: 'pdl', label: 'Ligamento', color: '#8FA790' },
]

interface Props {
  layers: LayerVisibility
  onToggle: (id: LayerId) => void
  onReset: () => void
}

export function LayerRail({ layers, onToggle, onReset }: Props) {
  return (
    <div className="rail" role="group" aria-label="Capas del diente">
      {ITEMS.map((item) => (
        <button
          key={item.id}
          className="chip"
          aria-pressed={layers[item.id]}
          onClick={() => onToggle(item.id)}
        >
          <span className="chip-dot" style={{ background: item.color }} />
          {item.label}
        </button>
      ))}
      <div className="rail-sep" />
      <button className="chip chip-reset" onClick={onReset}>
        <span className="chip-dot chip-dot-empty" />
        Restablecer
      </button>
    </div>
  )
}
