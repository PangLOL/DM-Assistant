import type { ReactNode } from 'react'
import {
  CastModule,
  EncountersModule,
  PartyModule,
  PlaceModule,
  SoundscapeModule,
} from '../components/DashboardModules'
import { ModuleShell } from '../components/ModuleShell'
import { useResolvedScene, useStore } from '../hooks/useStore'
import { useIsDesktop } from '../hooks/useIsDesktop'
import type { ModuleId } from '../types'

const RENDERERS: Record<ModuleId, () => ReactNode> = {
  place: () => <PlaceModule />,
  soundscape: () => <SoundscapeModule />,
  party: () => <PartyModule />,
  cast: () => <CastModule />,
  encounters: () => <EncountersModule />,
}

type Props = {
  onOpenLocations: () => void
}

export function DashboardView({ onOpenLocations }: Props) {
  const { data } = useStore()
  const desktop = useIsDesktop()
  const { location, isDefault, scene } = useResolvedScene()
  const visible = data.modules
    .map((m, index) => ({ ...m, index }))
    .filter((m) => m.visible)

  return (
    <div className="view dashboard-view">
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">Live dashboard</p>
          <h2>{location?.name ?? 'No location selected'}</h2>
          <p className="lede">
            {location
              ? isDefault
                ? 'Running location Default — weather & audio from world defaults.'
                : `Scene: ${scene?.name ?? '—'}`
              : 'Open the location list and toggle a place to begin.'}{' '}
            {desktop
              ? 'Drag module headers to place them on the desktop; resize from the corner.'
              : 'On a phone, modules stack in order. Reorder in Customize.'}
          </p>
        </div>
        <button type="button" className="btn btn--accent locations-open" onClick={onOpenLocations}>
          Locations
        </button>
      </header>

      {visible.length === 0 ? (
        <p className="empty">All modules are hidden. Open Customize to turn some back on.</p>
      ) : desktop ? (
        <div className="desktop-canvas">
          {visible.map((mod) => (
            <ModuleShell key={mod.id} id={mod.id} index={mod.index}>
              {RENDERERS[mod.id]()}
            </ModuleShell>
          ))}
        </div>
      ) : (
        <div className="dashboard-grid">
          {visible.map((mod) => (
            <ModuleShell key={mod.id} id={mod.id} index={mod.index}>
              {RENDERERS[mod.id]()}
            </ModuleShell>
          ))}
        </div>
      )}
    </div>
  )
}
