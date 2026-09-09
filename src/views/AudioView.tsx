import { useMemo, useRef, useState } from 'react'
import { exportData } from '../data/storage'
import { useStore } from '../hooks/useStore'
import { useAudio } from '../hooks/useAudioContext'
import { AudioClipEditor } from '../components/AudioClipEditor'
import type { AudioClip } from '../types'
import { emptyAudioClip } from '../types'

type LibraryEntry = {
  key: string
  source: string
  kind: 'music' | 'ambience'
  clip: AudioClip
}

export function AudioView() {
  const { data, importJson, resetToSeed } = useStore()
  const audio = useAudio()
  const fileRef = useRef<HTMLInputElement>(null)
  const [scratch, setScratch] = useState<AudioClip>(emptyAudioClip())
  const [message, setMessage] = useState<string | null>(null)

  const library = useMemo(() => {
    const entries: LibraryEntry[] = []
    data.locations.forEach((loc) => {
      if (loc.defaultMusic?.youtubeUrl) {
        entries.push({
          key: `${loc.id}-music`,
          source: `${loc.name} · default music`,
          kind: 'music',
          clip: loc.defaultMusic,
        })
      }
      if (loc.defaultAmbience?.youtubeUrl) {
        entries.push({
          key: `${loc.id}-ambience`,
          source: `${loc.name} · default ambience`,
          kind: 'ambience',
          clip: loc.defaultAmbience,
        })
      }
    })
    data.scenes.forEach((scene) => {
      const locName = data.locations.find((l) => l.id === scene.locationId)?.name ?? 'Scene'
      if (scene.music?.youtubeUrl) {
        entries.push({
          key: `${scene.id}-music`,
          source: `${locName} / ${scene.name} · music`,
          kind: 'music',
          clip: scene.music,
        })
      }
      if (scene.ambience?.youtubeUrl) {
        entries.push({
          key: `${scene.id}-ambience`,
          source: `${locName} / ${scene.name} · ambience`,
          kind: 'ambience',
          clip: scene.ambience,
        })
      }
    })
    return entries
  }, [data.locations, data.scenes])

  return (
    <div className="view audio-view">
      <header className="view-header">
        <div>
          <p className="eyebrow">YouTube audio engine</p>
          <h2>Sound library & tools</h2>
          <p className="lede">
            Everything streams from YouTube URLs with in/out points — no audio files to host. Clips
            loop inside your trim window on dual music + ambience channels.
          </p>
        </div>
      </header>

      <div className="session-grid">
        <section className="panel">
          <h3>Scratch pad / test clip</h3>
          <AudioClipEditor value={scratch} onChange={(c) => setScratch(c ?? emptyAudioClip())} />
          <div className="btn-row">
            <button
              type="button"
              className="btn btn--accent"
              disabled={!scratch.youtubeUrl}
              onClick={() => audio.loadClip('music', scratch, true)}
            >
              Play on music
            </button>
            <button
              type="button"
              className="btn"
              disabled={!scratch.youtubeUrl}
              onClick={() => audio.loadClip('ambience', scratch, true)}
            >
              Play on ambience
            </button>
          </div>
        </section>

        <section className="panel">
          <h3>Campaign data</h3>
          <p className="hint">
            Saved automatically in this browser via localStorage. Export a JSON backup anytime.
          </p>
          <div className="btn-row">
            <button
              type="button"
              className="btn"
              onClick={() => {
                const blob = new Blob([exportData(data)], { type: 'application/json' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = 'dm-assistant-campaign.json'
                a.click()
                URL.revokeObjectURL(url)
                setMessage('Exported campaign JSON.')
              }}
            >
              Export JSON
            </button>
            <button type="button" className="btn" onClick={() => fileRef.current?.click()}>
              Import JSON
            </button>
            <button
              type="button"
              className="btn btn--danger"
              onClick={() => {
                if (confirm('Reset to sample campaign? Your current data will be replaced.')) {
                  resetToSeed()
                  setMessage('Reset to sample data.')
                }
              }}
            >
              Reset sample
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              hidden
              onChange={async (e) => {
                const file = e.target.files?.[0]
                if (!file) return
                try {
                  importJson(await file.text())
                  setMessage('Imported campaign data.')
                } catch {
                  setMessage('Import failed — check the JSON file.')
                }
                e.target.value = ''
              }}
            />
          </div>
          {message ? <p className="hint">{message}</p> : null}
        </section>

        <section className="panel panel--wide">
          <h3>Assigned clips</h3>
          {library.length === 0 ? (
            <p className="empty-inline">No YouTube clips assigned yet.</p>
          ) : (
            <ul className="library-list">
              {library.map((entry) => (
                <li key={entry.key}>
                  <div>
                    <strong>{entry.clip.label || 'Untitled clip'}</strong>
                    <span>{entry.source}</span>
                    <code>{entry.clip.youtubeUrl}</code>
                  </div>
                  <div className="btn-row">
                    <button
                      type="button"
                      className="btn btn--sm btn--accent"
                      onClick={() => audio.loadClip(entry.kind, entry.clip, true)}
                    >
                      Play
                    </button>
                    <button
                      type="button"
                      className="btn btn--sm btn--ghost"
                      onClick={() => setScratch(entry.clip)}
                    >
                      Edit in scratch
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
