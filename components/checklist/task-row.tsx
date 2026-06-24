'use client'

import { Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { type ChecklistItem } from '@/lib/api/checklists'

export type VisualStatus = 'done' | 'late' | 'skipped' | 'pending'

function isItemLate(item: ChecklistItem): boolean {
  if (item.status !== 'PENDING' || !item.scheduledTime) return false
  const [h, m] = item.scheduledTime.split(':').map(Number)
  if (isNaN(h) || isNaN(m)) return false
  const sched = new Date()
  sched.setHours(h, m, 0, 0)
  return new Date() > sched
}

export function getVisualStatus(item: ChecklistItem): VisualStatus {
  if (item.status === 'COMPLETED') return 'done'
  if (item.status === 'NOT_DONE' || item.status === 'PARTIAL') return 'skipped'
  if (isItemLate(item)) return 'late'
  return 'pending'
}

const LABEL_CLASS: Record<VisualStatus, string> = {
  done:    'line-through text-[rgba(61,43,31,0.68)]',
  late:    'text-[#B8341A]',
  skipped: 'text-[#3D2B1F]',
  pending: 'text-[#3D2B1F]',
}

function StatusCircle({ item }: { item: ChecklistItem }) {
  const status = item.status

  if (status === 'COMPLETED') {
    return (
      <div
        className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
        style={{ backgroundColor: 'var(--zels-primary)' }}
      >
        <Check size={11} color="white" strokeWidth={3} />
      </div>
    )
  }
  if (status === 'PARTIAL') {
    return (
      <div
        className="w-5 h-5 rounded-full shrink-0"
        style={{ border: '2px solid #A86E13', backgroundColor: 'rgba(168,110,19,0.10)' }}
      />
    )
  }
  if (status === 'NOT_DONE') {
    return (
      <div
        className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
        style={{ border: '2px solid #B8341A', backgroundColor: 'rgba(184,52,26,0.10)' }}
      >
        <X size={11} color="#B8341A" strokeWidth={3} />
      </div>
    )
  }
  // PENDING or LATE
  return (
    <div
      className="w-5 h-5 rounded-full shrink-0"
      style={{ border: '2px solid rgba(61,43,31,0.20)', backgroundColor: 'transparent' }}
    />
  )
}

export function TaskRow({
  item,
  onTap,
}: {
  item: ChecklistItem
  onTap: (item: ChecklistItem) => void
}) {
  const vs = getVisualStatus(item)

  return (
    <button
      type="button"
      onClick={() => onTap(item)}
      className="w-full grid items-center gap-x-2.5 py-2.5 px-2 text-left hover:bg-black/[0.02] rounded-md transition-colors"
      style={{ gridTemplateColumns: '20px 40px 1fr' }}
    >
      <div className="flex items-center justify-center">
        <StatusCircle item={item} />
      </div>

      <span
        className="font-mono leading-5 tabular-nums"
        style={{ fontSize: '0.6875rem', color: 'rgba(61,43,31,0.42)' }}
      >
        {item.scheduledTime ?? '—'}
      </span>

      <div className="min-w-0">
        <p
          className={cn('leading-5 truncate', LABEL_CLASS[vs])}
          style={{ fontSize: '0.8125rem' }}
        >
          {item.itemName}
        </p>
        {item.notes && (
          <p
            className="italic mt-0.5 leading-snug"
            style={{ fontSize: '0.71875rem', color: 'rgba(61,43,31,0.42)' }}
          >
            {item.notes}
          </p>
        )}
      </div>
    </button>
  )
}
