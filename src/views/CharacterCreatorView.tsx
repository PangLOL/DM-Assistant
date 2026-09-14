import { useState } from 'react'
import { PortraitPicker } from '../components/PortraitPicker'
import { downloadCharacterHandout } from '../data/campaignCsv'
import { createPlayer } from '../data/storage'
import { saveMyCharacter } from '../lib/role'
import { emptyStats, type Player } from '../types'

const CLASS_OPTIONS = [
  'Barbarian',
  'Bard',
  'Cleric',
  'Druid',
  'Fighter',
  'Monk',
  'Paladin',
  'Ranger',
  'Rogue',
  'Sorcerer',
  'Warlock',
  'Wizard',
  'Custom',
]

const SPEED_OPTIONS = [20, 25, 30, 35, 40]
const AC_OPTIONS = [10, 11, 12, 13, 14, 15, 16, 17, 18]
const DAMAGE_PRESETS = ['1d4', '1d6', '1d8', '1d10', '1d12', '2d6', '1d4+2', '1d6+2', '1d8+3', '1d10+4']
const RANGE_OPTIONS = [5, 30, 60, 80, 120, 150]
const MAX_HP_OPTIONS = [8, 10, 12, 14, 16, 18, 20, 24, 28]

export function CharacterCreatorView({
  onReadyToJoin,
  onCancel,
}: {
  onReadyToJoin: (player: Player) => void
  onCancel: () => void
}) {
  const [name, setName] = useState('')
  const [classChoice, setClassChoice] = useState('Fighter')
  const [customRole, setCustomRole] = useState('')
  const [backstory, setBackstory] = useState('')
  const [personality, setPersonality] = useState('')
  const [portraitDataUrl, setPortraitDataUrl] = useState('')
  const [maxHp, setMaxHp] = useState(12)
  const [ac, setAc] = useState(14)
  const [speedFt, setSpeedFt] = useState(30)
  const [attackBonus, setAttackBonus] = useState(3)
  const [damageDice, setDamageDice] = useState('1d8+2')
  const [customDamage, setCustomDamage] = useState('')
  const [rangeFt, setRangeFt] = useState(5)
  const [saved, setSaved] = useState<Player | null>(null)

  const role = classChoice === 'Custom' ? customRole.trim() : classChoice
  const dice = customDamage.trim() || (damageDice === 'custom' ? '' : damageDice) || '1d8+2'

  const finish = () => {
    const stats = emptyStats()
    const player = createPlayer({
      name: name.trim() || 'New adventurer',
      role,
      personality: personality.trim(),
      backstory: backstory.trim(),
      portraitDataUrl,
      stats: {
        ...stats,
        hp: maxHp,
        maxHp,
        ac,
        armor: ac,
        speedFt,
        attackBonus,
        attack: attackBonus,
        damageDice: dice,
        rangeFt,
      },
    })
    saveMyCharacter(player)
    downloadCharacterHandout(player)
    setSaved(player)
  }

  if (saved) {
    return (
      <section className="panel join-panel creator-panel">
        <p className="eyebrow">Character file ready</p>
        <h2>Send this to your DM</h2>
        <p className="lede">
          Your browser downloaded <strong>{saved.name}.csv</strong>
          {saved.portraitDataUrl ? ' plus a portrait file' : ''}. AirDrop it, text it, or attach it
          in chat. After the DM imports it, join the room and pick your name on the map.
        </p>
        <div className="btn-row">
          <button type="button" className="btn btn--accent" onClick={() => onReadyToJoin(saved)}>
            Join room
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => {
              downloadCharacterHandout(saved)
            }}
          >
            Download again
          </button>
        </div>
      </section>
    )
  }

  return (
    <section className="panel creator-panel">
      <p className="eyebrow">New character</p>
      <h2>Make a character</h2>
      <p className="lede">
        5e-lite fields for the table. Portrait stays in the CSV as a small image — nothing is
        uploaded to a server.
      </p>

      <div className="form-grid">
        <label className="field">
          <span>Name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Aerin Sol" />
        </label>
        <label className="field">
          <span>Class / role</span>
          <select value={classChoice} onChange={(e) => setClassChoice(e.target.value)}>
            {CLASS_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </label>
        {classChoice === 'Custom' ? (
          <label className="field field--full">
            <span>Custom role</span>
            <input value={customRole} onChange={(e) => setCustomRole(e.target.value)} />
          </label>
        ) : null}
        <label className="field field--full">
          <span>Backstory</span>
          <textarea rows={4} value={backstory} onChange={(e) => setBackstory(e.target.value)} />
        </label>
        <label className="field field--full">
          <span>Personality</span>
          <textarea rows={2} value={personality} onChange={(e) => setPersonality(e.target.value)} />
        </label>
        <div className="field field--full">
          <span>Portrait</span>
          <PortraitPicker value={portraitDataUrl} onChange={setPortraitDataUrl} />
        </div>
        <label className="field">
          <span>Max HP</span>
          <select value={maxHp} onChange={(e) => setMaxHp(Number(e.target.value))}>
            {MAX_HP_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Armor class</span>
          <select value={ac} onChange={(e) => setAc(Number(e.target.value))}>
            {AC_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Speed</span>
          <select value={speedFt} onChange={(e) => setSpeedFt(Number(e.target.value))}>
            {SPEED_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n} ft
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Attack bonus</span>
          <select value={attackBonus} onChange={(e) => setAttackBonus(Number(e.target.value))}>
            {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
              <option key={n} value={n}>
                +{n}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Damage dice</span>
          <select
            value={DAMAGE_PRESETS.includes(damageDice) ? damageDice : 'custom'}
            onChange={(e) => {
              if (e.target.value === 'custom') setDamageDice('custom')
              else {
                setDamageDice(e.target.value)
                setCustomDamage('')
              }
            }}
          >
            {DAMAGE_PRESETS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
            <option value="custom">Custom</option>
          </select>
        </label>
        {damageDice === 'custom' || customDamage ? (
          <label className="field">
            <span>Custom dice</span>
            <input
              value={customDamage}
              onChange={(e) => setCustomDamage(e.target.value)}
              placeholder="2d6+3"
            />
          </label>
        ) : null}
        <label className="field">
          <span>Range</span>
          <select value={rangeFt} onChange={(e) => setRangeFt(Number(e.target.value))}>
            {RANGE_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n} ft
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="btn-row">
        <button type="button" className="btn btn--accent" onClick={finish}>
          Download CSV and continue
        </button>
        <button type="button" className="btn" onClick={onCancel}>
          Skip — join without a new character
        </button>
      </div>
    </section>
  )
}
