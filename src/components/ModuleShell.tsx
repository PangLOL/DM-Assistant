import {
  useRef,
  useState,
  type DragEvent,
  type ReactNode,
} from 'react'
import { MODULE_LABELS, type ModuleId } from '../types'
import { useStore } from '../hooks/useStore'

type ModuleShellProps = {
  id: ModuleId
  index: number
  children: ReactNode
}

export function ModuleShell({ id, index, children }: ModuleShellProps) {
  const { reorderModules } = useStore()
  const [dragging, setDragging] = useState(false)
  const dragIndex = useRef<number | null>(null)

  const onDragStart = (e: DragEvent) => {
    dragIndex.current = index
    setDragging(true)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(index))
  }

  const onDragOver = (e: DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    const from = Number(e.dataTransfer.getData('text/plain'))
    if (!Number.isNaN(from)) reorderModules(from, index)
    setDragging(false)
  }

  return (
    <section
      className={`dash-module${dragging ? ' is-dragging' : ''}`}
      onDragOver={onDragOver}
      onDrop={onDrop}
      data-module={id}
    >
      <header className="dash-module__head">
        <button
          type="button"
          className="drag-handle"
          draggable
          onDragStart={onDragStart}
          onDragEnd={() => setDragging(false)}
          aria-label={`Drag to reorder ${MODULE_LABELS[id]}`}
          title="Drag to reorder"
        >
          ⋮⋮
        </button>
        <h3>{MODULE_LABELS[id]}</h3>
      </header>
      <div className="dash-module__body">{children}</div>
    </section>
  )
}
