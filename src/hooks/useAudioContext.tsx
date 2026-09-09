import { createContext, useContext, type ReactNode } from 'react'
import type { AudioEngine } from '../hooks/useAudioEngine'

const AudioContext = createContext<AudioEngine | null>(null)

export function AudioProvider({
  engine,
  children,
}: {
  engine: AudioEngine
  children: ReactNode
}) {
  return <AudioContext.Provider value={engine}>{children}</AudioContext.Provider>
}

export function useAudio() {
  const ctx = useContext(AudioContext)
  if (!ctx) throw new Error('useAudio must be used within AudioProvider')
  return ctx
}
