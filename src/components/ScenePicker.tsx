import { useStore } from '../hooks/useStore'

export function ScenePicker() {
  const { data, setActiveScene } = useStore()
  const location = data.locations.find((l) => l.id === data.activeLocationId)
  const scenes = data.scenes.filter((s) => s.locationId === data.activeLocationId)

  if (!location) {
    return (
      <div className="scene-picker">
        <p className="empty-inline">Toggle a location to choose a scene.</p>
      </div>
    )
  }

  return (
    <div className="scene-picker" role="tablist" aria-label="Scene selection">
      <button
        type="button"
        role="tab"
        aria-selected={data.activeSceneId == null}
        className={data.activeSceneId == null ? 'is-active' : undefined}
        onClick={() => setActiveScene(null)}
      >
        <strong>Default</strong>
        <span>Location weather & audio</span>
      </button>
      {scenes.map((scene) => (
        <button
          key={scene.id}
          type="button"
          role="tab"
          aria-selected={data.activeSceneId === scene.id}
          className={data.activeSceneId === scene.id ? 'is-active' : undefined}
          onClick={() => setActiveScene(scene.id)}
        >
          <strong>{scene.name}</strong>
          <span>
            {scene.encounters.length} encounter{scene.encounters.length === 1 ? '' : 's'}
          </span>
        </button>
      ))}
      {scenes.length === 0 ? (
        <p className="scene-picker__hint">No custom scenes yet — add some in Scenes.</p>
      ) : null}
    </div>
  )
}
