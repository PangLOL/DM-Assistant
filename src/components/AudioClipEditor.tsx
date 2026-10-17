import type { AudioClip } from '../types'
import { emptyAudioClip } from '../types'
import { extractYouTubeId, formatTime, parseTimeInput } from '../lib/youtube'

type Props = {
  value: AudioClip | null
  onChange: (clip: AudioClip | null) => void
  title?: string
}

export function AudioClipEditor({ value, onChange, title = 'Audio clip' }: Props) {
  const clip = value ?? emptyAudioClip()
  const videoId = extractYouTubeId(clip.youtubeUrl)

  const patch = (partial: Partial<AudioClip>) => {
    const next = { ...clip, ...partial }
    if (!next.youtubeUrl.trim() && !next.label.trim()) {
      onChange(null)
      return
    }
    onChange(next)
  }

  return (
    <div className="audio-clip-editor">
      <div className="audio-clip-editor__head">
        <h4>{title}</h4>
        {value ? (
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => onChange(null)}>
            Clear
          </button>
        ) : null}
      </div>
      <label className="field">
        <span>YouTube URL</span>
        <input
          type="url"
          placeholder="https://www.youtube.com/watch?v=…"
          value={clip.youtubeUrl}
          onChange={(e) => patch({ youtubeUrl: e.target.value })}
        />
      </label>
      <label className="field">
        <span>Label</span>
        <input
          type="text"
          placeholder="e.g. Tavern lute loop"
          value={clip.label}
          onChange={(e) => patch({ label: e.target.value })}
        />
      </label>
      <div className="field-row">
        <label className="field">
          <span>In-point (sec or m:ss)</span>
          <input
            type="text"
            value={String(clip.inPoint)}
            onChange={(e) => patch({ inPoint: parseTimeInput(e.target.value) })}
            onBlur={(e) => patch({ inPoint: parseTimeInput(e.target.value) })}
          />
        </label>
        <label className="field">
          <span>Out-point (blank = end)</span>
          <input
            type="text"
            placeholder="end"
            value={clip.outPoint == null ? '' : String(clip.outPoint)}
            onChange={(e) => {
              const v = e.target.value.trim()
              patch({ outPoint: v === '' ? null : parseTimeInput(v) })
            }}
          />
        </label>
      </div>
      <p className="hint">
        Trim intros or pick a segment from a compilation. Playback loops between{' '}
        <strong>{formatTime(clip.inPoint)}</strong> and{' '}
        <strong>{clip.outPoint == null ? 'video end' : formatTime(clip.outPoint)}</strong>.
        {videoId ? (
          <>
            {' '}
            ID: <code>{videoId}</code>
          </>
        ) : clip.youtubeUrl ? (
          <span className="hint--warn"> — URL not recognized</span>
        ) : null}
      </p>
    </div>
  )
}
