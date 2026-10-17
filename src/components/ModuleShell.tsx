import { useRef, useState, type DragEvent, type PointerEvent as REPointer, type ReactNode } from 'react'
import { MODULE_LABELS, type ModuleId } from '../types'
import { useStore } from '../hooks/useStore'
import { snapPct, useIsDesktop } from '../hooks/useIsDesktop'

type Props = {
  id: ModuleId
  index: number
  children: ReactNode
}

export function ModuleShell({ id, index, children }: Props) {
  const { data, updateModuleLayout, bringModuleToFront, reorderModules } = useStore()
  const desktop = useIsDesktop()
  const mod = data.modules.find((m) => m.id === id)
  const canvasRef = useRef<HTMLElement | null>(null)
  const drag = useRef<{
    mode: 'move' | 'resize'
    px: number
    py: number
    x: number
    y: number
    w: number
    h: number
  } | null>(null)
  const [dragging, setDragging] = useState(false)

  if (!mod) return null

  const onPointerDown = (mode: 'move' | 'resize') => (e: REPointer) => {
    if (!desktop) return
    const canvas = (e.currentTarget as HTMLElement).closest('.desktop-canvas') as HTMLElement | null
    canvasRef.current = canvas
    bringModuleToFront(id)
    drag.current = {
      mode,
      px: e.clientX,
      py: e.clientY,
      x: mod.x,
      y: mod.y,
      w: mod.w,
      h: mod.h,
    }
    setDragging(true)
    e.currentTarget.setPointerCapture(e.pointerId)
    e.preventDefault()
  }

  const onPointerMove = (e: REPointer) => {
    const d = drag.current
    const canvas = canvasRef.current
    if (!d || !canvas) return
    const rect = canvas.getBoundingClientRect()
    const dx = ((e.clientX - d.px) / rect.width) * 100
    const dy = ((e.clientY - d.py) / rect.height) * 100
    if (d.mode === 'move') {
      updateModuleLayout(id, { x: snapPct(d.x + dx), y: snapPct(d.y + dy) })
    } else {
      updateModuleLayout(id, { w: snapPct(d.w + dx), h: snapPct(d.h + dy) })
    }
  }

  const endDrag = () => {
    drag.current = null
    setDragging(false)
  }

  const onDragStart = (e: DragEvent) => {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(index))
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    const from = Number(e.dataTransfer.getData('text/plain'))
    if (!Number.isNaN(from)) reorderModules(from, index)
  }

  const style = desktop
    ? {
        left: `${mod.x}%`,
        top: `${mod.y}%`,
        width: `${mod.w}%`,
        height: `${mod.h}%`,
        zIndex: index + 1,
      }
    : undefined

  return (
    <section
      className={`dash-module${desktop ? ' dash-module--abs' : ''}${dragging ? ' is-dragging' : ''}`}
      style={style}
      data-module={id}
      onDragOver={desktop ? undefined : (e) => e.preventDefault()}
      onDrop={desktop ? undefined : onDrop}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      <header className="dash-module__head" onPointerDown={desktop ? onPointerDown('move') : undefined}>
        <button
          type="button"
          className="drag-handle"
          draggable={!desktop}
          onDragStart={desktop ? undefined : onDragStart}
          aria-label={desktop ? `Move ${MODULE_LABELS[id]}` : `Reorder ${MODULE_LABELS[id]}`}
          title={desktop ? 'Drag to move' : 'Drag to reorder'}
        >
          ⋮⋮
        </button>
        <h3>{MODULE_LABELS[id]}</h3>
      </header>
      <div className="dash-module__body">{children}</div>
      {desktop ? (
        <button
          type="button"
          className="resize-handle"
          aria-label={`Resize ${MODULE_LABELS[id]}`}
          onPointerDown={onPointerDown('resize')}
        />
      ) : null}
    </section>
  )
}
