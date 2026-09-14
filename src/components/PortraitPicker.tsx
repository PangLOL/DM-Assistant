import { useState } from 'react'
import { resizeImageToDataUrl } from '../lib/portrait'

export function PortraitPicker({
  value,
  onChange,
  label = 'Portrait',
}: {
  value: string
  onChange: (dataUrl: string) => void
  label?: string
}) {
  const [error, setError] = useState<string | null>(null)

  return (
    <div className="portrait-picker">
      {value ? (
        <img className="portrait-picker__img" src={value} alt="" />
      ) : (
        <div className="portrait-picker__placeholder" aria-hidden>
          No photo
        </div>
      )}
      <div className="btn-row">
        <label className="btn btn--sm">
          {value ? 'Replace photo' : 'Add photo'}
          <input
            type="file"
            accept="image/*"
            hidden
            onChange={async (e) => {
              const file = e.target.files?.[0]
              e.target.value = ''
              if (!file) return
              try {
                setError(null)
                onChange(await resizeImageToDataUrl(file))
              } catch {
                setError('Could not read that image.')
              }
            }}
          />
        </label>
        {value ? (
          <button type="button" className="btn btn--sm" onClick={() => onChange('')}>
            Remove
          </button>
        ) : null}
      </div>
      <p className="hint">{label} is resized in this browser (no upload).</p>
      {error ? <p className="hint">{error}</p> : null}
    </div>
  )
}
