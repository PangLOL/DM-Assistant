/** Minimal YouTube IFrame API typings used by the audio engine. */
declare namespace YT {
  const PlayerState: {
    UNSTARTED: -1
    ENDED: 0
    PLAYING: 1
    PAUSED: 2
    BUFFERING: 3
    CUED: 5
  }

  interface PlayerOptions {
    height?: string | number
    width?: string | number
    videoId?: string
    playerVars?: Record<string, string | number>
    events?: {
      onReady?: (event: PlayerEvent) => void
      onStateChange?: (event: OnStateChangeEvent) => void
      onError?: (event: OnErrorEvent) => void
    }
  }

  interface PlayerEvent {
    target: Player
  }

  interface OnStateChangeEvent {
    data: number
    target: Player
  }

  interface OnErrorEvent {
    data: number
    target: Player
  }

  class Player {
    constructor(elementId: string | HTMLElement, options: PlayerOptions)
    playVideo(): void
    pauseVideo(): void
    stopVideo(): void
    seekTo(seconds: number, allowSeekAhead: boolean): void
    loadVideoById(
      args: string | { videoId: string; startSeconds?: number; endSeconds?: number },
    ): void
    cueVideoById(
      args: string | { videoId: string; startSeconds?: number; endSeconds?: number },
    ): void
    getCurrentTime(): number
    getDuration(): number
    getPlayerState(): number
    setVolume(volume: number): void
    getVolume(): number
    mute(): void
    unMute(): void
    isMuted(): boolean
    destroy(): void
  }
}
