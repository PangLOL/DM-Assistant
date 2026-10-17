import type { Player } from '../types'

export function CharacterSheet({
  player,
  compact = false,
}: {
  player: Player
  compact?: boolean
}) {
  return (
    <article className={`character-sheet${compact ? ' character-sheet--compact' : ''}`}>
      <div className="character-sheet__hero">
        {player.portraitDataUrl ? (
          <img className="character-sheet__portrait" src={player.portraitDataUrl} alt="" />
        ) : (
          <div className="character-sheet__portrait character-sheet__portrait--empty" aria-hidden>
            {player.name.slice(0, 1) || '?'}
          </div>
        )}
        <div>
          <p className="eyebrow">{player.role || 'Adventurer'}</p>
          <h3>{player.name}</h3>
          <p className="hp-text">
            {player.stats.hp}/{player.stats.maxHp} HP
          </p>
        </div>
      </div>
      {!compact && player.backstory ? <p className="character-sheet__story">{player.backstory}</p> : null}
      <dl className="meta-list">
        <div>
          <dt>AC</dt>
          <dd>{player.stats.ac}</dd>
        </div>
        <div>
          <dt>Speed</dt>
          <dd>{player.stats.speedFt} ft</dd>
        </div>
        <div>
          <dt>Attack</dt>
          <dd>+{player.stats.attackBonus}</dd>
        </div>
        <div>
          <dt>Damage</dt>
          <dd>{player.stats.damageDice}</dd>
        </div>
        <div>
          <dt>Range</dt>
          <dd>{player.stats.rangeFt} ft</dd>
        </div>
      </dl>
    </article>
  )
}
