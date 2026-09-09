import { formatTime } from '../lib/youtube'
import { useAudio } from '../hooks/useAudioContext'
import type { AudioChannel } from '../hooks/useAudioEngine'

function ChannelControls({ channel, label }: { channel: AudioChannel; label: string }) {
  const { state, play, pause, stop, setVolume } = useAudio()
  const ch = state[channel]
  const clip = ch.clip

  return (
    <div className={`audio-channel audio-channel--${channel}`}>
      <div className="audio-channel__meta">
        <span className="audio-channel__label">{label}</span>
        <span className="audio-channel__title">
          {clip?.label || (clip?.youtubeUrl ? 'YouTube clip' : 'No clip loaded')}
        </span>
        {clip?.youtubeUrl ? (
          <span className="audio-channel__time">
            {formatTime(ch.currentTime)} · in {formatTime(clip.inPoint)}
            {clip.outPoint != null ? ` → ${formatTime(clip.outPoint)}` : ''}
          </span>
        ) : null}
        {ch.error ? <span className="audio-channel__error">{ch.error}</span> : null}
      </div>
      <div className="audio-channel__controls">
        {ch.playing ? (
          <button type="button" className="btn btn--sm" onClick={() => pause(channel)} disabled={!clip}>
            Pause
          </button>
        ) : (
          <button type="button" className="btn btn--sm btn--accent" onClick={() => play(channel)} disabled={!clip}>
            Play
          </button>
        )}
        <button type="button" className="btn btn--sm btn--ghost" onClick={() => stop(channel)} disabled={!clip}>
          Stop
        </button>
        <label className="volume">
          <span className="sr-only">Volume</span>
          <input
            type="range"
            min={0}
            max={100}
            value={ch.volume}
            onChange={(e) => setVolume(channel, Number(e.target.value))}
          />
        </label>
      </div>
    </div>
  )
}

export function AudioDock() {
  const { state, stopAll, musicMount, ambienceMount } = useAudio()

  return (
    <footer className="audio-dock">
      <div className="audio-dock__brand">
        <span className="audio-dock__pulse" data-ready={state.ready} />
        <div>
          <strong>Audio engine</strong>
          <span>{state.ready ? 'YouTube ready' : 'Loading YouTube API…'}</span>
        </div>
      </div>
      <div className="audio-dock__channels">
        <ChannelControls channel="music" label="Music" />
        <ChannelControls channel="ambience" label="Ambience" />
      </div>
      <button type="button" className="btn btn--ghost" onClick={stopAll}>
        Stop all
      </button>
      <div className="yt-hosts" aria-hidden>
        <div ref={musicMount} id="yt-music-host" />
        <div ref={ambienceMount} id="yt-ambience-host" />
      </div>
    </footer>
  )
}
