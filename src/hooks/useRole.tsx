import { createContext, useContext, type ReactNode } from 'react'
import type { AppRole } from '../types'

const RoleContext = createContext<AppRole>('dm')

export function RoleProvider({ role, children }: { role: AppRole; children: ReactNode }) {
  return <RoleContext.Provider value={role}>{children}</RoleContext.Provider>
}

export function useRole(): AppRole {
  return useContext(RoleContext)
}
