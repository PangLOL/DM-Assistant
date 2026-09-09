import { uid } from '../data/storage'
import type { CharacterStats, Skill } from '../types'

type Props = {
  stats: CharacterStats
  onChange: (patch: Partial<CharacterStats>) => void
  compact?: boolean
}

function TagList({
  label,
  items,
  onChange,
  placeholder,
}: {
  label: string
  items: string[]
  onChange: (items: string[]) => void
  placeholder: string
}) {
  return (
    <div className="tag-editor">
      <div className="tag-editor__label">{label}</div>
      <div className="tag-list">
        {items.map((item, i) => (
          <span key={`${item}-${i}`} className="tag">
            {item}
            <button
              type="button"
              aria-label={`Remove ${item}`}
              onClick={() => onChange(items.filter((_, idx) => idx !== i))}
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <form
        className="tag-add"
        onSubmit={(e) => {
          e.preventDefault()
          const form = e.currentTarget
          const input = form.elements.namedItem('tag') as HTMLInputElement
          const v = input.value.trim()
          if (!v) return
          onChange([...items, v])
          input.value = ''
        }}
      >
        <input name="tag" placeholder={placeholder} />
        <button type="submit" className="btn btn--sm">
          Add
        </button>
      </form>
    </div>
  )
}

export function StatEditor({ stats, onChange, compact }: Props) {
  const setSkill = (id: string, patch: Partial<Skill>) => {
    onChange({
      skills: stats.skills.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    })
  }

  const hpPct = Math.max(0, Math.min(100, (stats.hp / Math.max(1, stats.maxHp)) * 100))

  return (
    <div className={`stat-editor${compact ? ' stat-editor--compact' : ''}`}>
      <div className="hp-block">
        <div className="hp-block__row">
          <label className="field field--inline">
            <span>HP</span>
            <input
              type="number"
              value={stats.hp}
              onChange={(e) => onChange({ hp: Number(e.target.value) })}
            />
          </label>
          <span className="hp-sep">/</span>
          <label className="field field--inline">
            <span>Max</span>
            <input
              type="number"
              value={stats.maxHp}
              onChange={(e) => onChange({ maxHp: Number(e.target.value) })}
            />
          </label>
          <div className="hp-quick">
            <button type="button" className="btn btn--sm" onClick={() => onChange({ hp: Math.max(0, stats.hp - 1) })}>
              −1
            </button>
            <button type="button" className="btn btn--sm" onClick={() => onChange({ hp: Math.max(0, stats.hp - 5) })}>
              −5
            </button>
            <button
              type="button"
              className="btn btn--sm"
              onClick={() => onChange({ hp: Math.min(stats.maxHp, stats.hp + 1) })}
            >
              +1
            </button>
            <button
              type="button"
              className="btn btn--sm"
              onClick={() => onChange({ hp: Math.min(stats.maxHp, stats.hp + 5) })}
            >
              +5
            </button>
            <button type="button" className="btn btn--sm" onClick={() => onChange({ hp: stats.maxHp })}>
              Full
            </button>
          </div>
        </div>
        <div className="hp-bar" aria-hidden>
          <div className="hp-bar__fill" style={{ width: `${hpPct}%` }} />
        </div>
      </div>

      <div className="field-row field-row--stats">
        <label className="field">
          <span>Armor</span>
          <input
            type="number"
            value={stats.armor}
            onChange={(e) => onChange({ armor: Number(e.target.value) })}
          />
        </label>
        <label className="field">
          <span>Attack</span>
          <input
            type="number"
            value={stats.attack}
            onChange={(e) => onChange({ attack: Number(e.target.value) })}
          />
        </label>
        <label className="field">
          <span>Init</span>
          <input
            type="number"
            value={stats.initiative}
            onChange={(e) => onChange({ initiative: Number(e.target.value) })}
          />
        </label>
        <label className="field">
          <span>Skill pts</span>
          <input
            type="number"
            value={stats.skillPoints}
            onChange={(e) => onChange({ skillPoints: Number(e.target.value) })}
          />
        </label>
      </div>

      <div className="skills-block">
        <div className="skills-block__head">
          <h4>Skills</h4>
          <button
            type="button"
            className="btn btn--sm"
            onClick={() =>
              onChange({
                skills: [...stats.skills, { id: uid(), name: 'New skill', points: 1 }],
              })
            }
          >
            Add skill
          </button>
        </div>
        {stats.skills.length === 0 ? <p className="empty-inline">No skills yet.</p> : null}
        <ul className="skill-list">
          {stats.skills.map((skill) => (
            <li key={skill.id}>
              <input
                value={skill.name}
                onChange={(e) => setSkill(skill.id, { name: e.target.value })}
              />
              <input
                type="number"
                value={skill.points}
                onChange={(e) => setSkill(skill.id, { points: Number(e.target.value) })}
              />
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => onChange({ skills: stats.skills.filter((s) => s.id !== skill.id) })}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="tag-grid">
        <TagList
          label="Traits"
          items={stats.traits}
          onChange={(traits) => onChange({ traits })}
          placeholder="Add trait"
        />
        <TagList
          label="Buffs"
          items={stats.buffs}
          onChange={(buffs) => onChange({ buffs })}
          placeholder="Add buff"
        />
        <TagList
          label="Debuffs"
          items={stats.debuffs}
          onChange={(debuffs) => onChange({ debuffs })}
          placeholder="Add debuff"
        />
      </div>
    </div>
  )
}
