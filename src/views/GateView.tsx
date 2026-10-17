import type { AppRole } from '../types'

export function GateView({ onChoose }: { onChoose: (role: AppRole) => void }) {
  return (
    <div className="gate-view">
      <section className="panel gate-card">
        <p className="eyebrow">Same site · two seats</p>
        <h1>Are you the DM or a player?</h1>
        <p className="lede">
          One URL. The DM keeps notes and the map host on this device. Players create a character
          and join the table with a room code — they never see the desktop.
        </p>
        <div className="gate-choices">
          <button type="button" className="gate-choice" onClick={() => onChoose('dm')}>
            <strong>I’m the DM</strong>
            <span>Assistant desktop, world, and map host</span>
          </button>
          <button type="button" className="gate-choice" onClick={() => onChoose('player')}>
            <strong>I’m a player</strong>
            <span>Create a character, then join the room</span>
          </button>
        </div>
        <p className="hint">Remembered on this device until you tap Switch role in the header.</p>
      </section>
    </div>
  )
}
