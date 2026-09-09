import { useState } from 'react'
import { StoreProvider } from './hooks/useStore'
import { useAudioEngine } from './hooks/useAudioEngine'
import { AudioProvider } from './hooks/useAudioContext'
import { AudioDock } from './components/AudioDock'
import { SessionView } from './views/SessionView'
import { WorldView } from './views/WorldView'
import { ScenesView } from './views/ScenesView'
import { PlayersView } from './views/PlayersView'
import { NpcsView } from './views/NpcsView'
import { AudioView } from './views/AudioView'
import type { NavView } from './types'

const NAV: { id: NavView; label: string }[] = [
  { id: 'session', label: 'Session' },
  { id: 'world', label: 'World' },
  { id: 'scenes', label: 'Scenes' },
  { id: 'players', label: 'Players' },
  { id: 'npcs', label: 'Enemies / NPCs' },
  { id: 'audio', label: 'Audio' },
]

function Shell() {
  const [view, setView] = useState<NavView>('session')
  const engine = useAudioEngine()

  return (
    <AudioProvider engine={engine}>
      <div className="app-shell">
        <header className="topbar">
          <div className="brand">
            <span className="brand__mark" aria-hidden />
            <div>
              <p className="brand__name">DM Assistant</p>
              <p className="brand__tag">World · scenes · trackers · soundscapes</p>
            </div>
          </div>
          <nav className="nav" aria-label="Primary">
            {NAV.map((item) => (
              <button
                key={item.id}
                type="button"
                className={view === item.id ? 'is-active' : undefined}
                onClick={() => setView(item.id)}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </header>

        <main className="main">
          {view === 'session' && <SessionView />}
          {view === 'world' && <WorldView />}
          {view === 'scenes' && <ScenesView />}
          {view === 'players' && <PlayersView />}
          {view === 'npcs' && <NpcsView />}
          {view === 'audio' && <AudioView />}
        </main>

        <AudioDock />
      </div>
    </AudioProvider>
  )
}

export default function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  )
}
