import { useCallback, useEffect, useRef, useState } from 'react'
import type { AudioClip } from '../types'
import { extractYouTubeId, loadYouTubeApi } from '../lib/youtube'

export type AudioChannel = 'music' | 'ambience'

type ChannelState = {
  clip: AudioClip | null
  playing: boolean
  currentTime: number
  volume: number
  error: string | null
}

const initialChannel = (): ChannelState => ({
  clip: null,
  playing: false,
  currentTime: 0,
  volume: 70,
  error: null,
})

type EngineState = {
  music: ChannelState
  ambience: ChannelState
  ready: boolean
}

/**
 * Dual-channel YouTube audio engine.
 * Plays trimmed clips via in/out points without hosting audio files.
 */
export function useAudioEngine() {
  const [state, setState] = useState<EngineState>({
    music: initialChannel(),
    ambience: initialChannel(),
    ready: false,
  })

  const musicPlayer = useRef<YT.Player | null>(null)
  const ambiencePlayer = useRef<YT.Player | null>(null)
  const musicClip = useRef<AudioClip | null>(null)
  const ambienceClip = useRef<AudioClip | null>(null)
  const pollRef = useRef<number | null>(null)
  const musicMount = useRef<HTMLDivElement | null>(null)
  const ambienceMount = useRef<HTMLDivElement | null>(null)

  const setChannel = useCallback(
    (channel: AudioChannel, patch: Partial<ChannelState>) => {
      setState((s) => ({ ...s, [channel]: { ...s[channel], ...patch } }))
    },
    [],
  )

  const getPlayer = useCallback((channel: AudioChannel) => {
    return channel === 'music' ? musicPlayer.current : ambiencePlayer.current
  }, [])

  const getClipRef = useCallback((channel: AudioChannel) => {
    return channel === 'music' ? musicClip : ambienceClip
  }, [])

  useEffect(() => {
    let cancelled = false

    async function init() {
      await loadYouTubeApi()
      if (cancelled || !window.YT?.Player) return
      if (!musicMount.current || !ambienceMount.current) return

      const makePlayer = (el: HTMLDivElement, channel: AudioChannel) =>
        new window.YT!.Player(el, {
          height: '0',
          width: '0',
          playerVars: {
            autoplay: 0,
            controls: 0,
            disablekb: 1,
            fs: 0,
            modestbranding: 1,
            playsinline: 1,
            rel: 0,
          },
          events: {
            onReady: (e) => {
              e.target.setVolume(channel === 'music' ? 70 : 55)
            },
            onError: () => {
              setChannel(channel, {
                error: 'Could not load this YouTube video. Check the URL or availability.',
                playing: false,
              })
            },
          },
        })

      musicPlayer.current = makePlayer(musicMount.current, 'music')
      ambiencePlayer.current = makePlayer(ambienceMount.current, 'ambience')
      setState((s) => ({ ...s, ready: true }))
    }

    void init()

    return () => {
      cancelled = true
      if (pollRef.current) window.clearInterval(pollRef.current)
      musicPlayer.current?.destroy()
      ambiencePlayer.current?.destroy()
      musicPlayer.current = null
      ambiencePlayer.current = null
    }
  }, [setChannel])

  useEffect(() => {
    pollRef.current = window.setInterval(() => {
      ;(['music', 'ambience'] as AudioChannel[]).forEach((channel) => {
        const player = getPlayer(channel)
        const clip = getClipRef(channel).current
        if (!player || !clip?.youtubeUrl) return
        try {
          const t = player.getCurrentTime?.() ?? 0
          const out = clip.outPoint
          setChannel(channel, { currentTime: t })
          if (out != null && t >= out - 0.15) {
            player.seekTo(clip.inPoint || 0, true)
            player.playVideo()
          }
          const st = player.getPlayerState?.()
          if (st === 0 /* YT.PlayerState.ENDED */) {
            player.seekTo(clip.inPoint || 0, true)
            player.playVideo()
          }
        } catch {
          /* player may not be ready */
        }
      })
    }, 400)

    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current)
    }
  }, [getClipRef, getPlayer, setChannel])

  const loadClip = useCallback(
    (channel: AudioChannel, clip: AudioClip | null, autoplay = false) => {
      getClipRef(channel).current = clip
      setChannel(channel, {
        clip,
        playing: false,
        currentTime: clip?.inPoint ?? 0,
        error: null,
      })

      const player = getPlayer(channel)
      if (!player || !clip?.youtubeUrl) {
        player?.stopVideo?.()
        return
      }

      const videoId = extractYouTubeId(clip.youtubeUrl)
      if (!videoId) {
        setChannel(channel, { error: 'Invalid YouTube URL', playing: false })
        return
      }

      const start = clip.inPoint || 0
      const end = clip.outPoint ?? undefined
      try {
        if (autoplay) {
          player.loadVideoById({ videoId, startSeconds: start, endSeconds: end })
          player.playVideo()
          setChannel(channel, { playing: true })
        } else {
          player.cueVideoById({ videoId, startSeconds: start, endSeconds: end })
        }
      } catch {
        setChannel(channel, { error: 'Player not ready yet — try again in a moment.' })
      }
    },
    [getClipRef, getPlayer, setChannel],
  )

  const play = useCallback(
    (channel: AudioChannel) => {
      const player = getPlayer(channel)
      const clip = getClipRef(channel).current
      if (!player || !clip?.youtubeUrl) return
      const videoId = extractYouTubeId(clip.youtubeUrl)
      if (!videoId) return
      try {
        const t = player.getCurrentTime?.() ?? 0
        const beforeIn = t < (clip.inPoint || 0) - 0.5
        const afterOut = clip.outPoint != null && t >= clip.outPoint
        if (beforeIn || afterOut) player.seekTo(clip.inPoint || 0, true)
        player.playVideo()
        setChannel(channel, { playing: true, error: null })
      } catch {
        setChannel(channel, { error: 'Unable to play — is the API ready?' })
      }
    },
    [getClipRef, getPlayer, setChannel],
  )

  const pause = useCallback(
    (channel: AudioChannel) => {
      getPlayer(channel)?.pauseVideo?.()
      setChannel(channel, { playing: false })
    },
    [getPlayer, setChannel],
  )

  const stop = useCallback(
    (channel: AudioChannel) => {
      const player = getPlayer(channel)
      const clip = getClipRef(channel).current
      player?.pauseVideo?.()
      if (clip) player?.seekTo(clip.inPoint || 0, true)
      setChannel(channel, { playing: false, currentTime: clip?.inPoint ?? 0 })
    },
    [getClipRef, getPlayer, setChannel],
  )

  const setVolume = useCallback(
    (channel: AudioChannel, volume: number) => {
      const v = Math.max(0, Math.min(100, volume))
      getPlayer(channel)?.setVolume?.(v)
      setChannel(channel, { volume: v })
    },
    [getPlayer, setChannel],
  )

  const playSceneAudio = useCallback(
    (music: AudioClip | null, ambience: AudioClip | null) => {
      loadClip('music', music, Boolean(music?.youtubeUrl))
      loadClip('ambience', ambience, Boolean(ambience?.youtubeUrl))
    },
    [loadClip],
  )

  const stopAll = useCallback(() => {
    stop('music')
    stop('ambience')
  }, [stop])

  return {
    state,
    musicMount,
    ambienceMount,
    loadClip,
    play,
    pause,
    stop,
    stopAll,
    setVolume,
    playSceneAudio,
  }
}

export type AudioEngine = ReturnType<typeof useAudioEngine>
