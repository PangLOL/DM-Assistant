import { createContext, useContext, type ReactNode } from 'react'
import type { TablePropose } from '../lib/tableSync'

type Bus = {
  sendPropose?: (msg: Omit<TablePropose, 'type'> & { type?: 'propose' }) => void
}

const TableBus = createContext<Bus>({})

export function TableBusProvider({
  sendPropose,
  children,
}: {
  sendPropose?: Bus['sendPropose']
  children: ReactNode
}) {
  return <TableBus.Provider value={{ sendPropose }}>{children}</TableBus.Provider>
}

export function useTableBus() {
  return useContext(TableBus)
}
