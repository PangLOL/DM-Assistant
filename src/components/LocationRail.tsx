import { useStore } from '../hooks/useStore'

type Props = {
  open: boolean
  onClose: () => void
}

export function LocationRail({ open, onClose }: Props) {
  const { data, toggleLocation } = useStore()

  return (
    <>
      <div
        className={`rail-backdrop${open ? ' is-open' : ''}`}
        onClick={onClose}
        aria-hidden={!open}
      />
      <aside className={`location-rail${open ? ' is-open' : ''}`} aria-label="Locations">
        <div className="location-rail__head">
          <h2>Locations</h2>
          <p>Toggle one place to run</p>
          <button type="button" className="btn btn--ghost btn--sm rail-close" onClick={onClose}>
            Close
          </button>
        </div>
        <ul className="location-rail__list">
          {data.locations.length === 0 ? (
            <li className="empty-inline">Add locations in World.</li>
          ) : (
            data.locations.map((loc) => {
              const active = loc.id === data.activeLocationId
              const count = data.scenes.filter((s) => s.locationId === loc.id).length
              return (
                <li key={loc.id}>
                  <button
                    type="button"
                    className={`location-toggle${active ? ' is-active' : ''}`}
                    aria-pressed={active}
                    onClick={() => {
                      toggleLocation(loc.id)
                      onClose()
                    }}
                  >
                    <span className="location-toggle__dot" aria-hidden />
                    <span className="location-toggle__body">
                      <strong>{loc.name}</strong>
                      <span>
                        {loc.biome || 'No biome'} · {count} scene{count === 1 ? '' : 's'}
                      </span>
                    </span>
                  </button>
                </li>
              )
            })
          )}
        </ul>
      </aside>
    </>
  )
}
