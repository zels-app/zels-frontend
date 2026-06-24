'use client'

import { useState, useEffect } from 'react'
import { Plus, X, Check, Minus, GripVertical, BarChart2, Trash2 } from 'lucide-react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useQuery, useQueries, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api/client'
import { useHealthProfile } from '@/lib/api/health-profile'
import { useHealthRecords } from '@/lib/api/health-records'
import {
  useChecklist,
  useChecklistItems,
  useChecklistReport,
  useUpdateChecklistItem,
  useCreateChecklist,
  useCreateChecklistItem,
  useDeleteChecklistItem,
  type Checklist,
  type ChecklistItem,
  type ChecklistItemStatus,
  type ChecklistReport,
} from '@/lib/api/checklists'
import { TaskRow, getVisualStatus } from './task-row'
import { SuggestionsSheet, fetchSuggestions, type SuggestedItem, type SuggestionsData } from './suggestions-sheet'
import { useCreateChecklistTemplate } from '@/hooks/useChecklistTemplates'
import { PageHeader } from '@/components/layout/page-header'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayParam(): string {
  return new Date().toLocaleDateString('en-CA')
}

function tomorrowParam(): string {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toLocaleDateString('en-CA')
}

function getLast7Days(): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    return d.toLocaleDateString('en-CA')
  })
}


function todayDayName(): string {
  return new Date().toLocaleDateString('pt-BR', { weekday: 'long' })
}

function patientFirstName(fullName: string): string {
  return fullName.split(' ')[0]
}

function todaySubtitle(firstName: string): string {
  const date = new Date().toLocaleDateString('pt-BR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
  return `${firstName} · ${date}`
}

// ─── Category inference ───────────────────────────────────────────────────────

const inferCat = (name: string): string => {
  const n = name.toLowerCase()
  if (n.includes('med') || n.includes('remédio') || n.includes('comprimido')) return 'medicação'
  if (
    n.includes('café') || n.includes('almoço') || n.includes('jantar') ||
    n.includes('lanche') || n.includes('refeição')
  ) return 'alimentação'
  if (n.includes('banho') || n.includes('higiene') || n.includes('escov')) return 'higiene'
  if (
    n.includes('pressão') || n.includes('glicemia') ||
    n.includes('peso') || n.includes('vital')
  ) return 'sinais vitais'
  if (
    n.includes('caminhada') || n.includes('exercício') ||
    n.includes('atividade física')
  ) return 'atividade'
  return 'rotina'
}

// ─── Periods ──────────────────────────────────────────────────────────────────

type Period = 'manha' | 'tarde' | 'noite' | 'outros'

const PERIOD_CONFIG: Record<
  Exclude<Period, 'outros'>,
  { label: string; range: string; turno: string }
> = {
  manha: { label: 'Manhã',  range: '6h–11h',  turno: 'matutino'   },
  tarde: { label: 'Tarde',  range: '12h–17h', turno: 'vespertino' },
  noite: { label: 'Noite',  range: '18h–23h', turno: 'noturno'    },
}

const PERIODS: Period[] = ['manha', 'tarde', 'noite', 'outros']

function getCurrentPeriod(): Exclude<Period, 'outros'> {
  const h = new Date().getHours()
  if (h >= 6  && h < 12) return 'manha'
  if (h >= 12 && h < 18) return 'tarde'
  return 'noite'
}

function timeToPeriod(time: string | null): Period {
  if (!time) return 'outros'
  const [h] = time.split(':').map(Number)
  if (h >= 6  && h < 12) return 'manha'
  if (h >= 12 && h < 18) return 'tarde'
  if (h >= 18)           return 'noite'
  return 'outros'
}

function groupByPeriod(items: ChecklistItem[]): Record<Period, ChecklistItem[]> {
  const g: Record<Period, ChecklistItem[]> = { manha: [], tarde: [], noite: [], outros: [] }
  const sorted = [...items].sort((a, b) =>
    (a.scheduledTime ?? '25:00').localeCompare(b.scheduledTime ?? '25:00'),
  )
  sorted.forEach((item) => g[timeToPeriod(item.scheduledTime)].push(item))
  return g
}

function groupByPeriodOrdered(items: ChecklistItem[]): Record<Period, ChecklistItem[]> {
  const g: Record<Period, ChecklistItem[]> = { manha: [], tarde: [], noite: [], outros: [] }
  items.forEach((item) => g[timeToPeriod(item.scheduledTime)].push(item))
  return g
}

// ─── 7-day stats hook ─────────────────────────────────────────────────────────

type DayStats = { date: string; total: number; completed: number }

function useLast7DayStats(healthProfileId: string | undefined): DayStats[] {
  const days = getLast7Days()
  const from = days[0]
  const to   = days[days.length - 1]

  const { data: weekChecklists } = useQuery({
    queryKey: ['checklists', healthProfileId, from, to],
    queryFn:  () => api.get<Checklist[]>(`/checklists/${healthProfileId}?from=${from}&to=${to}`),
    enabled:  !!healthProfileId,
  })

  const list = Array.isArray(weekChecklists) ? weekChecklists : []

  const reportQueries = useQueries({
    queries: list.map((cl) => ({
      queryKey: ['checklist-report', cl.id],
      queryFn:  () => api.get<ChecklistReport>(`/checklists/${cl.id}/report`),
    })),
  })

  return days.map((day) => {
    const clIdx  = list.findIndex((c) => c.date.slice(0, 10) === day)
    const report = clIdx >= 0 ? reportQueries[clIdx]?.data : undefined
    return { date: day, total: report?.total ?? 0, completed: report?.completed ?? 0 }
  })
}

// ─── WeekChart ────────────────────────────────────────────────────────────────

function WeekChart({ stats }: { stats: DayStats[] }) {
  return (
    <div
      className="rounded-[14px] border p-5"
      style={{ backgroundColor: '#ffffff', borderColor: '#e8e5de' }}
    >
      <p className="font-semibold text-[#3D2B1F] mb-4" style={{ fontSize: '0.875rem' }}>
        Cumprimento · 7 dias
      </p>

      <div className="flex items-end gap-2">
        {stats.map((day, i) => {
          const pct     = day.total > 0 ? (day.completed / day.total) * 100 : 0
          const isToday = i === stats.length - 1
          const date    = new Date(day.date + 'T00:00:00')
          const label   = isToday
            ? 'hoje'
            : date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')

          const fillColor =
            pct >= 80 ? 'var(--zels-primary-strong)' :
            pct >= 50 ? '#A86E13' :
            pct > 0   ? '#B8341A' :
                        'transparent'

          return (
            <div key={day.date} className="flex-1 flex flex-col items-center gap-1.5">
              {/* % above */}
              <span
                className="font-mono tabular-nums"
                style={{
                  fontSize: '0.625rem',
                  color: isToday
                    ? 'var(--zels-primary-strong)'
                    : day.total > 0
                    ? 'rgba(61,43,31,0.68)'
                    : 'transparent',
                  userSelect: 'none',
                }}
              >
                {day.total > 0 ? `${Math.round(pct)}%` : '—'}
              </span>

              {/* Bar */}
              <div
                className="w-full rounded-sm overflow-hidden flex flex-col justify-end"
                style={{ height: '56px', backgroundColor: '#efece5' }}
                title={day.total > 0 ? `${day.completed}/${day.total} tarefas` : 'Sem checklist'}
              >
                {day.total > 0 && (
                  <div
                    className="w-full rounded-sm transition-all duration-500"
                    style={{
                      height: `${Math.max(pct, 5)}%`,
                      backgroundColor: fillColor,
                    }}
                  />
                )}
              </div>

              {/* Label below */}
              <span
                className="font-mono"
                style={{
                  fontSize: '0.625rem',
                  color:     isToday ? 'var(--zels-primary-strong)' : 'rgba(61,43,31,0.42)',
                  fontWeight: isToday ? 600 : 400,
                }}
              >
                {label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Period header (shared between left and right columns) ────────────────────

function PeriodHeader({
  period,
  items,
  isNow,
  variant,
}: {
  period: Period
  items: ChecklistItem[]
  isNow: boolean
  variant: 'readonly' | 'template'
}) {
  const cfg   = period !== 'outros' ? PERIOD_CONFIG[period as Exclude<Period, 'outros'>] : null
  const done  = items.filter((i) => i.status === 'COMPLETED').length
  const total = items.length

  if (variant === 'template') {
    return (
      <p
        className="font-mono uppercase tracking-wider mt-4 mb-2 first:mt-0"
        style={{ fontSize: '0.6875rem', color: 'rgba(61,43,31,0.42)' }}
      >
        {cfg?.label ?? 'Outros'}
      </p>
    )
  }

  return (
    <div
      className="flex items-center gap-2 px-3 py-2.5 rounded-lg mb-1"
      style={{ backgroundColor: isNow ? 'rgba(139,175,138,0.06)' : 'transparent' }}
    >
      <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
        <span
          className="font-[600] text-[#3D2B1F]"
          style={{ fontSize: '0.875rem' }}
        >
          {cfg?.label ?? 'Outros'}
        </span>
        {cfg && (
          <span className="font-mono" style={{ fontSize: '0.6875rem', color: 'rgba(61,43,31,0.42)' }}>
            {cfg.range}
          </span>
        )}
        {cfg && (
          <span className="italic" style={{ fontSize: '0.71875rem', color: 'rgba(61,43,31,0.68)' }}>
            {cfg.turno}
          </span>
        )}
      </div>
      <span
        className="font-mono tabular-nums shrink-0"
        style={{ fontSize: '0.71875rem', color: 'rgba(61,43,31,0.42)' }}
      >
        {done}/{total}
      </span>
    </div>
  )
}

// ─── SortableRow (template column) ───────────────────────────────────────────

function SortableRow({ item }: { item: ChecklistItem }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  })
  const { mutate: deleteItem, isPending: isDeleting } = useDeleteChecklistItem(item.checklistId)

  const dndStyle = { transform: CSS.Transform.toString(transform), transition }
  const cat = 'rotina'

  return (
    <div
      ref={setNodeRef}
      style={{ ...dndStyle, gridTemplateColumns: '16px 44px 1fr auto auto' }}
      {...attributes}
      className={cn(
        'grid items-center gap-2 py-2 rounded-md',
        isDragging && 'opacity-50 bg-[#f6f4ef] z-10',
      )}
    >
      <button
        {...listeners}
        type="button"
        className="cursor-grab active:cursor-grabbing shrink-0 touch-none"
        style={{ color: 'rgba(61,43,31,0.42)' }}
        aria-label="Arrastar"
      >
        <GripVertical size={14} />
      </button>

      <span
        className="font-mono tabular-nums"
        style={{ fontSize: '0.71875rem', color: 'rgba(61,43,31,0.68)' }}
      >
        {item.scheduledTime ?? '—'}
      </span>

      <span
        className="truncate text-[#3D2B1F]"
        style={{ fontSize: '0.8125rem' }}
      >
        {item.itemName}
      </span>

      <span
        className="uppercase font-mono rounded-sm px-1.5 py-0.5 shrink-0 whitespace-nowrap"
        style={{
          fontSize: '0.59375rem',
          backgroundColor: '#efece5',
          color: 'rgba(61,43,31,0.68)',
          letterSpacing: '0.04em',
        }}
      >
        {cat}
      </span>

      <button
        type="button"
        disabled={isDeleting}
        onClick={() => {
          if (window.confirm('Remover este item do checklist?')) {
            deleteItem({ itemId: item.id })
          }
        }}
        className="shrink-0 p-1 rounded transition-colors hover:text-[#B8341A] disabled:opacity-40 disabled:pointer-events-none"
        style={{ color: 'rgba(61,43,31,0.42)' }}
        aria-label="Remover item"
      >
        <Trash2 size={14} />
      </button>
    </div>
  )
}

// ─── AddItemInline ────────────────────────────────────────────────────────────

function AddItemInline({ checklistId }: { checklistId: string }) {
  const [open, setOpen]           = useState(false)
  const [itemName, setItemName]   = useState('')
  const [scheduledTime, setTime]  = useState('')
  const [isRoutine, setIsRoutine] = useState(false)
  const { mutate: addItem, isPending: isAdding }           = useCreateChecklistItem(checklistId)
  const { mutateAsync: createTemplate, isPending: isCreatingTemplate } = useCreateChecklistTemplate()
  const { data: profile }         = useHealthProfile()
  const isPending = isAdding || isCreatingTemplate

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!itemName.trim()) return
    const name = itemName.trim()
    const time = scheduledTime || undefined

    if (isRoutine && profile?.id) {
      try {
        await createTemplate({ healthProfileId: profile.id, itemName: name, scheduledTime: time })
      } catch {
        return
      }
    }

    addItem(
      { itemName: name, scheduledTime: time },
      {
        onSuccess: () => {
          setItemName('')
          setTime('')
          setIsRoutine(false)
          setOpen(false)
        },
      },
    )
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-2 py-2 rounded-lg text-sm transition-colors hover:opacity-80 border"
        style={{ color: 'var(--zels-primary-strong)', borderColor: 'rgba(139,175,138,0.40)' }}
      >
        <Plus size={13} />
        Nova tarefa
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2 pt-2 border-t" style={{ borderColor: '#e8e5de' }}>
      <input
        value={itemName}
        onChange={(e) => setItemName(e.target.value)}
        placeholder="Nome da tarefa *"
        autoFocus
        className="w-full rounded-lg border px-3 py-2 text-sm text-[#3D2B1F] focus:outline-none focus:ring-2 focus:ring-zels-primary/30"
        style={{ borderColor: '#e8e5de', backgroundColor: '#f6f4ef' }}
      />

      {/* Mode toggle */}
      <div className="flex gap-1">
        <button
          type="button"
          onClick={() => setIsRoutine(false)}
          className="flex-1 px-3 py-1.5 rounded-lg text-sm transition-colors"
          style={{
            backgroundColor: !isRoutine ? 'rgba(139,175,138,0.12)' : 'transparent',
            color: !isRoutine ? 'var(--zels-primary-strong)' : 'rgba(61,43,31,0.68)',
            border: !isRoutine ? 'none' : '1px solid #e8e5de',
          }}
        >
          Apenas hoje
        </button>
        <button
          type="button"
          onClick={() => setIsRoutine(true)}
          className="flex-1 px-3 py-1.5 rounded-lg text-sm transition-colors"
          style={{
            backgroundColor: isRoutine ? 'rgba(139,175,138,0.12)' : 'transparent',
            color: isRoutine ? 'var(--zels-primary-strong)' : 'rgba(61,43,31,0.68)',
            border: isRoutine ? 'none' : '1px solid #e8e5de',
          }}
        >
          Rotina diária
        </button>
      </div>

      <input
        type="time"
        value={scheduledTime}
        onChange={(e) => setTime(e.target.value)}
        className="w-full rounded-lg border px-3 py-2 text-sm font-mono text-[#3D2B1F] focus:outline-none focus:ring-2 focus:ring-zels-primary/30"
        style={{ borderColor: '#e8e5de', backgroundColor: '#f6f4ef' }}
      />
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isPending || !itemName.trim()}
          className="flex-1 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-40 hover:opacity-90 transition-opacity disabled:pointer-events-none"
          style={{ backgroundColor: 'var(--primary)' }}
        >
          {isPending ? '…' : 'Adicionar'}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="px-3 py-2 rounded-lg text-sm border"
          style={{ color: 'rgba(61,43,31,0.42)', borderColor: '#e8e5de' }}
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}

// ─── ItemDialog ───────────────────────────────────────────────────────────────

function ItemDialog({
  item,
  checklistId,
  onClose,
}: {
  item: ChecklistItem
  checklistId: string
  onClose: () => void
}) {
  const [notePhase, setNotePhase] = useState<'PARTIAL' | 'NOT_DONE' | null>(null)
  const [noteText, setNoteText]   = useState('')
  const { mutate, isPending }     = useUpdateChecklistItem(checklistId)

  function handleStatus(status: ChecklistItemStatus, notes?: string) {
    mutate({ itemId: item.id, status, notes }, { onSuccess: onClose })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm bg-white rounded-[14px] shadow-xl p-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-semibold text-[#3D2B1F]">{item.itemName}</p>
            {item.scheduledTime && (
              <p className="font-mono mt-0.5" style={{ fontSize: '0.75rem', color: 'rgba(61,43,31,0.42)' }}>
                {item.scheduledTime}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="shrink-0 p-1.5 rounded-md transition-colors"
            style={{ color: 'rgba(61,43,31,0.42)' }}
          >
            <X size={18} />
          </button>
        </div>

        {!notePhase ? (
          <div className="space-y-2">
            <button
              onClick={() => handleStatus('COMPLETED')}
              disabled={isPending}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-opacity hover:opacity-80 disabled:opacity-40"
              style={{ backgroundColor: 'rgba(139,175,138,0.10)', color: 'var(--zels-primary-strong)' }}
            >
              <Check size={16} /> Concluído
            </button>
            <button
              onClick={() => { setNotePhase('PARTIAL'); setNoteText('') }}
              disabled={isPending}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium transition-opacity hover:opacity-80 disabled:opacity-40"
              style={{ borderColor: 'rgba(168,110,19,0.3)', color: '#A86E13' }}
            >
              <Minus size={16} /> Parcial
            </button>
            <button
              onClick={() => { setNotePhase('NOT_DONE'); setNoteText('') }}
              disabled={isPending}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium transition-opacity hover:opacity-80 disabled:opacity-40"
              style={{ borderColor: 'rgba(184,52,26,0.3)', color: '#B8341A' }}
            >
              <X size={16} /> Não feito
            </button>
            <button
              onClick={onClose}
              className="w-full text-center py-2 text-sm"
              style={{ color: 'rgba(61,43,31,0.42)' }}
            >
              Cancelar
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm" style={{ color: 'rgba(61,43,31,0.68)' }}>
              {notePhase === 'PARTIAL' ? 'Observação (opcional):' : 'Motivo (opcional):'}
            </p>
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Ex: Recusou, fez pela metade…"
              rows={3}
              autoFocus
              className="w-full rounded-xl border px-3 py-2.5 text-sm text-[#3D2B1F] focus:outline-none focus:ring-2 focus:ring-zels-primary/30 resize-none"
              style={{ borderColor: '#e8e5de', backgroundColor: '#f6f4ef' }}
            />
            <div className="flex gap-2">
              <button
                onClick={() => handleStatus(notePhase, noteText || undefined)}
                disabled={isPending}
                className={cn(
                  'flex-1 py-2.5 rounded-xl text-sm font-medium transition-opacity disabled:opacity-40',
                  notePhase === 'PARTIAL' ? 'bg-amber-50 text-[#A86E13]' : 'bg-red-50 text-[#B8341A]',
                )}
              >
                {isPending ? 'Registrando…' : 'Confirmar'}
              </button>
              <button
                onClick={() => setNotePhase(null)}
                disabled={isPending}
                className="px-4 py-2.5 rounded-xl text-sm border"
                style={{ color: 'rgba(61,43,31,0.42)', borderColor: '#e8e5de' }}
              >
                Voltar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── ReportDialog ─────────────────────────────────────────────────────────────

function ReportDialog({
  report,
  items,
  onClose,
}: {
  report: ChecklistReport
  items: ChecklistItem[]
  onClose: () => void
}) {
  const vs = getVisualStatus

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md bg-white rounded-[14px] shadow-xl p-6 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-[#3D2B1F]" style={{ fontSize: '1rem' }}>
            Relatório do dia
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md transition-colors"
            style={{ color: 'rgba(61,43,31,0.42)' }}
          >
            <X size={18} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-5">
          {[
            { label: 'Total',       value: report.total,     bg: '#efece5',                    color: '#3D2B1F' },
            { label: 'Concluídos', value: report.completed, bg: 'rgba(139,175,138,0.12)',      color: 'var(--zels-primary-strong)' },
            { label: 'Pendentes',  value: report.pending,   bg: 'rgba(168,110,19,0.08)',       color: '#A86E13' },
            { label: 'Não feitos', value: report.notDone,   bg: 'rgba(184,52,26,0.08)',        color: '#B8341A' },
          ].map(({ label, value, bg, color }) => (
            <div key={label} className="rounded-xl p-3 text-center" style={{ backgroundColor: bg }}>
              <p className="tabular-nums font-semibold" style={{ fontSize: '1.5rem', color }}>{value}</p>
              <p className="mt-0.5" style={{ fontSize: '0.75rem', color: 'rgba(61,43,31,0.68)' }}>{label}</p>
            </div>
          ))}
        </div>

        <p
          className="font-mono uppercase tracking-wider mb-3"
          style={{ fontSize: '0.6875rem', color: 'rgba(61,43,31,0.42)' }}
        >
          Itens
        </p>
        {items.map((item) => {
          const v = vs(item)
          const dotColor = v === 'done' ? 'var(--zels-primary-strong)' : v === 'late' ? '#B8341A' : v === 'skipped' ? '#A86E13' : '#efece5'
          return (
            <div
              key={item.id}
              className="grid gap-2 py-2.5 border-b last:border-0"
              style={{ gridTemplateColumns: '10px 40px 1fr', borderColor: '#e8e5de' }}
            >
              <div className="flex items-start justify-center pt-[5px]">
                <div className="w-2.5 h-2.5 rounded-[3px]" style={{ backgroundColor: dotColor }} />
              </div>
              <span className="font-mono" style={{ fontSize: '0.6875rem', color: 'rgba(61,43,31,0.42)' }}>
                {item.scheduledTime ?? '—'}
              </span>
              <span
                className={cn('truncate', v === 'done' && 'line-through')}
                style={{
                  fontSize: '0.8125rem',
                  color: v === 'late' ? '#B8341A' : v === 'done' ? 'rgba(61,43,31,0.68)' : '#3D2B1F',
                }}
              >
                {item.itemName}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── DiaryFeed ────────────────────────────────────────────────────────────────

const SOURCE_PT: Record<string, string> = {
  APP:       'Aplicativo',
  WHATSAPP:  'WhatsApp',
  AUDIO:     'Áudio',
  IMAGE:     'Imagem',
}

function DiaryFeed({ healthProfileId }: { healthProfileId: string }) {
  const today    = todayParam()
  const tomorrow = tomorrowParam()

  const { data, isLoading } = useHealthRecords(healthProfileId, {
    type: 'DIARY', from: today, to: tomorrow, limit: 6,
  })

  const records = data?.records ?? []

  return (
    <div
      className="rounded-[14px] border p-5"
      style={{ backgroundColor: '#ffffff', borderColor: '#e8e5de' }}
    >
      <div className="flex items-center justify-between mb-4">
        <p className="font-semibold text-[#3D2B1F]" style={{ fontSize: '0.875rem' }}>
          Observações recentes
        </p>
        <span className="text-sm" style={{ color: 'var(--zels-primary-strong)' }}>
          todas →
        </span>
      </div>

      {isLoading && (
        <div className="animate-pulse grid grid-cols-2 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-lg" style={{ backgroundColor: '#efece5' }} />
          ))}
        </div>
      )}

      {!isLoading && records.length === 0 && (
        <p className="py-4 text-center text-sm" style={{ color: 'rgba(61,43,31,0.68)' }}>
          Nenhuma observação registrada hoje.
        </p>
      )}

      {!isLoading && records.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {records.map((r) => {
            const time = new Date(r.createdAt).toLocaleTimeString('pt-BR', {
              hour: '2-digit', minute: '2-digit',
            })
            const source = SOURCE_PT[r.source] ?? r.source

            return (
              <div
                key={r.id}
                className="rounded-xl p-3 space-y-1"
                style={{ backgroundColor: '#f6f4ef' }}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="font-mono tabular-nums"
                    style={{ fontSize: '0.71875rem', color: 'rgba(61,43,31,0.68)' }}
                  >
                    {time}
                  </span>
                  <span
                    className="uppercase font-mono rounded-sm px-1.5 py-0.5"
                    style={{
                      fontSize: '0.59375rem',
                      backgroundColor: '#efece5',
                      color: 'rgba(61,43,31,0.68)',
                      letterSpacing: '0.04em',
                    }}
                  >
                    diário
                  </span>
                </div>

                <p
                  className="font-[600]"
                  style={{ fontSize: '0.8125rem', color: 'rgba(61,43,31,0.68)' }}
                >
                  {source}
                </p>

                <p
                  style={{ fontSize: '0.84375rem', color: '#3D2B1F', lineHeight: 1.5 }}
                  className="line-clamp-2"
                >
                  {r.data.text ?? '—'}
                </p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function ColSkeleton() {
  return (
    <div className="animate-pulse space-y-2">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="h-10 rounded-lg" style={{ backgroundColor: '#efece5' }} />
      ))}
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function ChecklistDesktop() {
  const queryClient       = useQueryClient()
  const { data: profile } = useHealthProfile()
  const today = todayParam()

  const { data: checklists, isLoading: checklistLoading } = useChecklist(profile?.id)
  const checklist = Array.isArray(checklists) ? checklists[0] : undefined

  const { data: items,  isLoading: itemsLoading   } = useChecklistItems(checklist?.id)
  const { data: report, isLoading: reportLoading  } = useChecklistReport(checklist?.id)
  const { mutateAsync: createChecklist }             = useCreateChecklist()

  const weekStats = useLast7DayStats(profile?.id)

  const [sortedItems, setSortedItems]                     = useState<ChecklistItem[]>([])
  const [reportOpen, setReportOpen]                       = useState(false)
  const [selectedItem, setSelectedItem]                   = useState<ChecklistItem | null>(null)
  const [isFetchingSuggestions, setIsFetchingSuggestions] = useState(false)
  const [suggestionsOpen, setSuggestionsOpen]             = useState(false)
  const [suggestionsData, setSuggestionsData]             = useState<SuggestionsData | null>(null)
  const [isCreatingItems, setIsCreatingItems]             = useState(false)

  useEffect(() => {
    if (items) setSortedItems(Array.isArray(items) ? items : [])
  }, [items])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (over && active.id !== over.id) {
      setSortedItems((prev) => {
        const oldIdx = prev.findIndex((i) => i.id === active.id)
        const newIdx = prev.findIndex((i) => i.id === over.id)
        return arrayMove(prev, oldIdx, newIdx)
      })
    }
  }

  async function handleCreate() {
    if (!profile?.id) return
    setIsFetchingSuggestions(true)
    try {
      const data = await fetchSuggestions(profile.id)
      setSuggestionsData(data)
      setSuggestionsOpen(true)
    } catch {
      toast.error('Erro ao buscar sugestões')
    } finally {
      setIsFetchingSuggestions(false)
    }
  }

  async function handleConfirmCreate(selectedItems: SuggestedItem[]) {
    if (!profile?.id) return
    setIsCreatingItems(true)
    let cl: Checklist | undefined
    try {
      cl = await createChecklist({ healthProfileId: profile.id, date: today })
    } catch {
      setIsCreatingItems(false)
      return
    }
    try {
      for (const item of selectedItems) {
        await api.post<unknown>(`/checklists/${cl.id}/items`, {
          itemName: item.itemName,
          scheduledTime: item.scheduledTime,
        })
      }
      queryClient.invalidateQueries({ queryKey: ['checklist-items', cl.id] })
      setSuggestionsOpen(false)
    } catch {
      toast.error('Alguns itens não puderam ser adicionados')
      setSuggestionsOpen(false)
    } finally {
      setIsCreatingItems(false)
    }
  }

  const isLoading   = checklistLoading || (!!checklist && (itemsLoading || reportLoading))
  const emptyState  = !checklistLoading && !checklist
  const currentPeriod = getCurrentPeriod()

  const safeItems    = Array.isArray(items) ? items : []
  const grouped      = groupByPeriod(safeItems)
  const sortedGroups = groupByPeriodOrdered(sortedItems)

  const firstName    = profile?.fullName ? patientFirstName(profile.fullName) : '…'

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <PageHeader
            overline={profile?.fullName}
            title="Checklist"
            subtitle={new Date().toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' })}
          />
        </div>

        {checklist && report && (
          <button
            type="button"
            onClick={() => setReportOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition-colors hover:bg-[#efece5]"
            style={{ color: 'rgba(61,43,31,0.68)', borderColor: '#e8e5de' }}
          >
            <BarChart2 size={14} />
            Ver relatório
          </button>
        )}
      </div>

      {/* Empty state */}
      {emptyState && (
        <div className="py-20 flex flex-col items-center gap-4">
          <p className="text-sm" style={{ color: 'rgba(61,43,31,0.68)' }}>
            Nenhum checklist criado para hoje.
          </p>
          <button
            type="button"
            onClick={handleCreate}
            disabled={isFetchingSuggestions || !profile?.id}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50 disabled:pointer-events-none"
            style={{ backgroundColor: 'var(--primary)' }}
          >
            <Plus size={15} />
            {isFetchingSuggestions ? 'Buscando tarefas…' : 'Iniciar checklist do dia'}
          </button>
        </div>
      )}

      {!emptyState && (
        <div className="space-y-5">
          {/* Week chart */}
          <WeekChart stats={weekStats} />

          {/* 2-column grid */}
          <div className="grid gap-5" style={{ gridTemplateColumns: '1fr 360px' }}>
            {/* Left column — read-only today */}
            <div
              className="rounded-[14px] border p-5"
              style={{ backgroundColor: '#ffffff', borderColor: '#e8e5de' }}
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="font-semibold text-[#3D2B1F]" style={{ fontSize: '0.875rem' }}>
                    Hoje · {firstName}
                  </p>
                </div>
              </div>

              {isLoading ? (
                <ColSkeleton />
              ) : safeItems.length === 0 ? (
                <p className="py-4 text-center text-sm" style={{ color: 'rgba(61,43,31,0.68)' }}>
                  Nenhum item no checklist de hoje.
                </p>
              ) : (
                <div>
                  {PERIODS.map((period) => {
                    const periodItems = grouped[period]
                    if (periodItems.length === 0) return null
                    const isNow = period === currentPeriod
                    return (
                      <div key={period} className="mb-3 last:mb-0">
                        <PeriodHeader period={period} items={periodItems} isNow={isNow} variant="readonly" />
                        <div className="px-1">
                          {periodItems.map((item) => (
                            <TaskRow key={item.id} item={item} onTap={setSelectedItem} />
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Right column — template */}
            <div
              className="rounded-[14px] border p-5"
              style={{ backgroundColor: '#ffffff', borderColor: '#e8e5de' }}
            >
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <p className="font-semibold text-[#3D2B1F]" style={{ fontSize: '0.875rem' }}>
                    Template do checklist
                  </p>
                  <p className="mt-0.5" style={{ fontSize: '0.71875rem', color: 'rgba(61,43,31,0.68)' }}>
                    edite tarefas · arraste pra reordenar
                  </p>
                </div>
              </div>

              {isLoading ? (
                <ColSkeleton />
              ) : sortedItems.length === 0 ? (
                <p className="py-3 text-sm" style={{ color: 'rgba(61,43,31,0.68)' }}>
                  Nenhum item.
                </p>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={sortedItems.map((i) => i.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div>
                      {PERIODS.map((period) => {
                        const periodItems = sortedGroups[period]
                        if (periodItems.length === 0) return null
                        return (
                          <div key={period}>
                            <PeriodHeader period={period} items={periodItems} isNow={false} variant="template" />
                            {periodItems.map((item) => (
                              <SortableRow key={item.id} item={item} />
                            ))}
                          </div>
                        )
                      })}
                    </div>
                  </SortableContext>
                </DndContext>
              )}

              {checklist && (
                <div className="mt-4">
                  <AddItemInline checklistId={checklist.id} />
                </div>
              )}
            </div>
          </div>

          {/* Diary feed */}
          {profile?.id && <DiaryFeed healthProfileId={profile.id} />}
        </div>
      )}

      {/* Dialogs */}
      {selectedItem && checklist && (
        <ItemDialog
          item={selectedItem}
          checklistId={checklist.id}
          onClose={() => setSelectedItem(null)}
        />
      )}

      {reportOpen && report && safeItems.length > 0 && (
        <ReportDialog
          report={report}
          items={safeItems}
          onClose={() => setReportOpen(false)}
        />
      )}

      {suggestionsOpen && suggestionsData && (
        <SuggestionsSheet
          data={suggestionsData}
          onConfirm={handleConfirmCreate}
          onCancel={() => setSuggestionsOpen(false)}
          isCreating={isCreatingItems}
          variant="dialog"
        />
      )}
    </>
  )
}
