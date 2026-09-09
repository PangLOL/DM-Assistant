import { useRef, useState, type DragEvent } from 'react'
import { MODULE_LABELS, type ModuleId } from '../types'
import { useStore } from '../hooks/useStore'

export function CustomizeView() {
  const {
    data,
    updateTheme,
    resetTheme,
    setModuleVisible,
    reorderModules,
    resetModules,
  } = useStore()
  const dragFrom = useRef<number | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const onDragStart = (index: number) => (e: DragEvent) => {
    dragFrom.current = index
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(index))
  }

  const onDrop = (toIndex: number) => (e: DragEvent) => {
    e.preventDefault()
    const from = Number(e.dataTransfer.getData('text/plain'))
    if (!Number.isNaN(from)) {
      reorderModules(from, toIndex)
      setMessage('Module order updated.')
    }
  }

  return (
    <div className="view customize-view">
      <header className="view-header">
        <div>
          <p className="eyebrow">Phase 1 customization</p>
          <h2>Theme & dashboard modules</h2>
          <p className="lede">
            Set base, accent, and text colors. Show, hide, and drag-reorder the modules that appear
            on your live dashboard.
          </p>
        </div>
      </header>

      <div className="session-grid">
        <section className="panel">
          <h3>Theme colors</h3>
          <div className="theme-fields">
            <label className="field color-field">
              <span>Base color</span>
              <div className="color-row">
                <input
                  type="color"
                  value={data.theme.base}
                  onChange={(e) => updateTheme({ base: e.target.value })}
                />
                <input
                  type="text"
                  value={data.theme.base}
                  onChange={(e) => updateTheme({ base: e.target.value })}
                />
              </div>
            </label>
            <label className="field color-field">
              <span>Accent color</span>
              <div className="color-row">
                <input
                  type="color"
                  value={data.theme.accent}
                  onChange={(e) => updateTheme({ accent: e.target.value })}
                />
                <input
                  type="text"
                  value={data.theme.accent}
                  onChange={(e) => updateTheme({ accent: e.target.value })}
                />
              </div>
            </label>
            <label className="field color-field">
              <span>Text color</span>
              <div className="color-row">
                <input
                  type="color"
                  value={data.theme.text}
                  onChange={(e) => updateTheme({ text: e.target.value })}
                />
                <input
                  type="text"
                  value={data.theme.text}
                  onChange={(e) => updateTheme({ text: e.target.value })}
                />
              </div>
            </label>
          </div>
          <div className="theme-preview" aria-hidden>
            <div className="theme-preview__swatch theme-preview__swatch--base" />
            <div className="theme-preview__swatch theme-preview__swatch--accent" />
            <div className="theme-preview__swatch theme-preview__swatch--text" />
          </div>
          <div className="btn-row">
            <button
              type="button"
              className="btn"
              onClick={() => {
                resetTheme()
                setMessage('Theme reset to defaults.')
              }}
            >
              Reset theme
            </button>
          </div>
        </section>

        <section className="panel">
          <h3>Dashboard modules</h3>
          <p className="hint">Drag handles to reorder. Uncheck to hide from the dashboard.</p>
          <ul className="module-editor">
            {data.modules.map((mod, index) => (
              <li
                key={mod.id}
                onDragOver={(e) => e.preventDefault()}
                onDrop={onDrop(index)}
              >
                <button
                  type="button"
                  className="drag-handle"
                  draggable
                  onDragStart={onDragStart(index)}
                  aria-label={`Reorder ${MODULE_LABELS[mod.id as ModuleId]}`}
                >
                  ⋮⋮
                </button>
                <label className="check">
                  <input
                    type="checkbox"
                    checked={mod.visible}
                    onChange={(e) => setModuleVisible(mod.id, e.target.checked)}
                  />
                  <span>{MODULE_LABELS[mod.id]}</span>
                </label>
              </li>
            ))}
          </ul>
          <div className="btn-row">
            <button
              type="button"
              className="btn"
              onClick={() => {
                resetModules()
                setMessage('Module layout reset.')
              }}
            >
              Reset modules
            </button>
          </div>
          {message ? <p className="hint">{message}</p> : null}
        </section>
      </div>
    </div>
  )
}
