'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Plus, X, Check, Minus, Settings2 } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api/client'
import { useHealthProfile } from '@/lib/api/health-profile'
import { useCurrentUser } from '@/lib/api/user'
import {
  useChecklist,
  useChecklistItems,
  useChecklistReport,
  useUpdateChecklistItem,
  useCreateChecklist,
  useCreateChecklistItem,
  type Checklist,
  type ChecklistItem,
  type ChecklistItemStatus,
  type ChecklistReport,
} from '@/lib/api/checklists'
import { TaskRow, getVisualStatus } from './task-row'
import { SuggestionsSheet, fetchSuggestions, type SuggestedItem, type SuggestionsData } from './suggestions-sheet'
import { RoutinesSheet } from './routines-sheet'
import { useCreateChecklistTemplate } from '@/hooks/useChecklistTemplates'
import { PageHeader } from '@/components/layout/page-header'
import { ROLE_CONFIG } from '@/components/ciclo/person-card'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayParam(): string {
  return new Date().toLocaleDateString('en-CA')
}

function todayDateLabel(): string {
  return new Date()
    .toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
    .toUpperCase()
}

function currentTimeLabel(): string {
  return new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function getFirstName(fullName: string): string {
  return fullName.split(' ')[0]
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0] ?? '')
    .join('')
    .toUpperCase()
}

// ─── Periods ──────────────────────────────────────────────────────────────────

type Period = 'madrugada' | 'manha' | 'tarde' | 'noite' | 'outros'

const PERIOD_CONFIG: Record<
  Exclude<Period, 'outros'>,
  { label: string; range: string; turno: string }
> = {
  madrugada: { label: 'Madrugada', range: '0h–5h',   turno: 'noturno tardio' },
  manha:     { label: 'Manhã',     range: '6h–11h',  turno: 'matutino'       },
  tarde:     { label: 'Tarde',     range: '12h–17h', turno: 'vespertino'     },
  noite:     { label: 'Noite',     range: '18h–23h', turno: 'noturno'        },
}

const PERIODS: Period[] = ['madrugada', 'manha', 'tarde', 'noite', 'outros']

function getCurrentPeriod(): Exclude<Period, 'outros'> {
  const h = new Date().getHours()
  if (h >= 0 && h < 6)  return 'madrugada'
  if (h >= 6 && h < 12) return 'manha'
  if (h >= 12 && h < 18) return 'tarde'
  return 'noite'
}

function timeToPeriod(time: string | null): Period {
  if (!time) return 'outros'
  const [h] = time.split(':').map(Number)
  if (h >= 0  && h < 6)  return 'madrugada'
  if (h >= 6  && h < 12) return 'manha'
  if (h >= 12 && h < 18) return 'tarde'
  if (h >= 18)           return 'noite'
  return 'outros'
}

// ─── Segmented Bar ────────────────────────────────────────────────────────────

const SEGMENT_COLOR: Record<string, string> = {
  done:    'var(--zels-primary)',
  late:    '#B8341A',
  skipped: '#A86E13',
  pending: '#efece5',
}

function SegmentedBar({ items }: { items: ChecklistItem[] }) {
  if (items.length === 0) return null

  const sorted = [...items].sort((a, b) =>
    (a.scheduledTime ?? '25:00').localeCompare(b.scheduledTime ?? '25:00'),
  )

  return (
    <div className="flex gap-0.5" style={{ height: '8px' }}>
      {sorted.map((item) => (
        <div
          key={item.id}
          className="flex-1 rounded-[2px]"
          style={{ backgroundColor: SEGMENT_COLOR[getVisualStatus(item)] }}
        />
      ))}
    </div>
  )
}

// ─── MomentoBlock ─────────────────────────────────────────────────────────────

function MomentoBlock({
  period,
  items,
  currentPeriod,
  onTap,
}: {
  period: Period
  items: ChecklistItem[]
  currentPeriod: Exclude<Period, 'outros'>
  onTap: (item: ChecklistItem) => void
}) {
  if (items.length === 0) return null

  const isNow = period === currentPeriod
  const cfg = period !== 'outros' ? PERIOD_CONFIG[period as Exclude<Period, 'outros'>] : null
  const done  = items.filter((i) => i.status === 'COMPLETED').length
  const total = items.length
  const sorted = [...items].sort((a, b) =>
    (a.scheduledTime ?? '25:00').localeCompare(b.scheduledTime ?? '25:00'),
  )

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ backgroundColor: isNow ? 'rgba(139,175,138,0.06)' : 'transparent' }}
    >
      {/* Block header */}
      <div className="flex items-center gap-2 px-3 pt-3 pb-2">
        <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
          <span
            className="font-[700] text-[#3D2B1F]"
            style={{ fontSize: '1rem', fontFamily: 'var(--font-sans)' }}
          >
            {cfg?.label ?? 'Outros'}
          </span>

          {cfg && (
            <span
              className="font-mono"
              style={{ fontSize: '0.6875rem', color: 'rgba(61,43,31,0.42)' }}
            >
              {cfg.range}
            </span>
          )}

          {cfg && (
            <span
              className="italic"
              style={{ fontSize: '0.71875rem', color: 'rgba(61,43,31,0.68)' }}
            >
              {cfg.turno}
            </span>
          )}

          {isNow && (
            <span
              className="inline-flex items-center px-2 py-0.5 rounded-full font-semibold text-white"
              style={{ fontSize: '0.625rem', backgroundColor: 'var(--primary)' }}
            >
              agora
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

      {/* Tasks */}
      <div className="px-3 pb-3">
        <div className="bg-white rounded-lg overflow-hidden px-1">
          {sorted.map((item) => (
            <TaskRow key={item.id} item={item} onTap={onTap} />
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── BottomSheet ──────────────────────────────────────────────────────────────

function BottomSheet({
  item,
  checklistId,
  onClose,
}: {
  item: ChecklistItem
  checklistId: string
  onClose: () => void
}) {
  const [notePhase, setNotePhase] = useState<'PARTIAL' | 'NOT_DONE' | null>(null)
  const [noteText, setNoteText] = useState('')
  const { mutate, isPending } = useUpdateChecklistItem(checklistId)

  function handleStatus(status: ChecklistItemStatus, notes?: string) {
    mutate({ itemId: item.id, status, notes }, { onSuccess: onClose })
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />

      <div className="relative bg-white rounded-t-2xl pt-8 pb-8 px-6 space-y-4 max-h-[85vh] overflow-y-auto">
        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-[#efece5]" />

        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-semibold text-[#3D2B1F] leading-snug">{item.itemName}</p>
            {item.scheduledTime && (
              <p className="font-mono mt-0.5" style={{ fontSize: '0.75rem', color: 'rgba(61,43,31,0.42)' }}>
                {item.scheduledTime}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="shrink-0 p-1 rounded-md transition-colors"
            style={{ color: 'rgba(61,43,31,0.42)' }}
          >
            <X size={18} />
          </button>
        </div>

        {!notePhase ? (
          <div className="space-y-2.5">
            <button
              onClick={() => handleStatus('COMPLETED')}
              disabled={isPending}
              className="w-full flex items-center gap-3 px-4 py-4 rounded-xl text-sm font-medium transition-opacity hover:opacity-80 disabled:opacity-40"
              style={{ backgroundColor: 'rgba(139,175,138,0.10)', color: 'var(--zels-primary-strong)' }}
            >
              <Check size={16} />
              Concluído
            </button>
            <button
              onClick={() => { setNotePhase('PARTIAL'); setNoteText('') }}
              disabled={isPending}
              className="w-full flex items-center gap-3 px-4 py-4 rounded-xl border text-sm font-medium transition-opacity hover:opacity-80 disabled:opacity-40"
              style={{ borderColor: 'rgba(168,110,19,0.3)', color: '#A86E13' }}
            >
              <Minus size={16} />
              Parcial
            </button>
            <button
              onClick={() => { setNotePhase('NOT_DONE'); setNoteText('') }}
              disabled={isPending}
              className="w-full flex items-center gap-3 px-4 py-4 rounded-xl border text-sm font-medium transition-opacity hover:opacity-80 disabled:opacity-40"
              style={{ borderColor: 'rgba(184,52,26,0.3)', color: '#B8341A' }}
            >
              <X size={16} />
              Não feito
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm" style={{ color: 'rgba(61,43,31,0.68)' }}>
              {notePhase === 'PARTIAL'
                ? 'Observação sobre o parcial (opcional):'
                : 'Motivo ou observação (opcional):'}
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
                  'flex-1 py-3 rounded-xl text-sm font-medium transition-opacity disabled:opacity-40',
                  notePhase === 'PARTIAL'
                    ? 'bg-amber-50 text-[#A86E13]'
                    : 'bg-red-50 text-[#B8341A]',
                )}
              >
                {isPending ? 'Registrando…' : 'Confirmar'}
              </button>
              <button
                onClick={() => setNotePhase(null)}
                disabled={isPending}
                className="px-4 py-3 rounded-xl text-sm border"
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

// ─── AddItemSheet ─────────────────────────────────────────────────────────────

function AddItemSheet({
  checklistId,
  healthProfileId,
  onClose,
}: {
  checklistId: string
  healthProfileId: string
  onClose: () => void
}) {
  const [itemName, setItemName] = useState('')
  const [scheduledTime, setScheduledTime] = useState('')
  const [mode, setMode] = useState<'today' | 'routine'>('today')
  const { mutate: addItem, isPending: isAddingItem } = useCreateChecklistItem(checklistId)
  const { mutateAsync: createTemplate, isPending: isCreatingTemplate } = useCreateChecklistTemplate()
  const isPending = isAddingItem || isCreatingTemplate

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!itemName.trim()) return
    const name = itemName.trim()
    const time = scheduledTime || undefined

    if (mode === 'routine') {
      try {
        await createTemplate({ healthProfileId, itemName: name, scheduledTime: time })
      } catch {
        return
      }
    }

    addItem({ itemName: name, scheduledTime: time }, { onSuccess: onClose })
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />

      <div className="relative bg-white rounded-t-2xl pt-8 pb-8 px-6">
        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-[#efece5]" />

        <div className="flex items-center justify-between mb-4">
          <p className="font-semibold text-[#3D2B1F]">Nova tarefa</p>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md transition-colors"
            style={{ color: 'rgba(61,43,31,0.42)' }}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            value={itemName}
            onChange={(e) => setItemName(e.target.value)}
            placeholder="Nome da tarefa *"
            autoFocus
            className="w-full rounded-xl border px-4 py-3 text-sm text-[#3D2B1F] focus:outline-none focus:ring-2 focus:ring-zels-primary/30"
            style={{ borderColor: '#e8e5de', backgroundColor: '#f6f4ef' }}
          />

          {/* Mode toggle */}
          <div className="flex rounded-xl overflow-hidden border" style={{ borderColor: '#e8e5de' }}>
            {(['today', 'routine'] as const).map((opt) => {
              const active = mode === opt
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setMode(opt)}
                  className="flex-1 py-2.5 text-sm font-medium transition-colors"
                  style={{
                    backgroundColor: active ? 'rgba(139,175,138,0.12)' : 'transparent',
                    color: active ? 'var(--zels-primary-strong)' : 'rgba(61,43,31,0.68)',
                  }}
                >
                  {opt === 'today' ? 'Apenas hoje' : 'Rotina diária'}
                </button>
              )
            })}
          </div>

          <div className="space-y-1">
            <label className="text-xs" style={{ color: 'rgba(61,43,31,0.42)' }}>
              Horário (opcional)
            </label>
            <input
              type="time"
              value={scheduledTime}
              onChange={(e) => setScheduledTime(e.target.value)}
              className="w-full rounded-xl border px-4 py-3 text-sm font-mono text-[#3D2B1F] focus:outline-none focus:ring-2 focus:ring-zels-primary/30"
              style={{ borderColor: '#e8e5de', backgroundColor: '#f6f4ef' }}
            />
          </div>
          <button
            type="submit"
            disabled={isPending || !itemName.trim()}
            className="w-full py-3.5 rounded-xl text-white text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-40 disabled:pointer-events-none"
            style={{ backgroundColor: 'var(--primary)' }}
          >
            {isPending ? 'Adicionando…' : 'Adicionar tarefa'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div
        className="rounded-[14px] border"
        style={{ height: '96px', backgroundColor: '#ffffff', borderColor: '#e8e5de' }}
      />
      <div className="space-y-3">
        <div className="h-5 w-20 rounded-md" style={{ backgroundColor: '#efece5' }} />
        <div className="h-28 rounded-xl" style={{ backgroundColor: '#efece5' }} />
        <div className="h-5 w-16 rounded-md" style={{ backgroundColor: '#efece5' }} />
        <div className="h-20 rounded-xl" style={{ backgroundColor: '#efece5' }} />
      </div>
    </div>
  )
}

// ─── ChecklistContent ─────────────────────────────────────────────────────────

function ChecklistContent({
  checklist,
  items,
  report,
  healthProfileId,
}: {
  checklist: Checklist
  items: ChecklistItem[]
  report: ChecklistReport | undefined
  healthProfileId: string
}) {
  const [selectedItem, setSelectedItem] = useState<ChecklistItem | null>(null)
  const [addSheetOpen, setAddSheetOpen]   = useState(false)
  const [routinesOpen, setRoutinesOpen]   = useState(false)

  const currentPeriod = getCurrentPeriod()

  const grouped: Record<Period, ChecklistItem[]> = {
    madrugada: [], manha: [], tarde: [], noite: [], outros: [],
  }
  items.forEach((item) => grouped[timeToPeriod(item.scheduledTime)].push(item))

  const lateCount = items.filter((i) => getVisualStatus(i) === 'late').length
  const doneCount = report?.completed ?? items.filter((i) => i.status === 'COMPLETED').length
  const total     = report?.total ?? items.length

  return (
    <>
      {/* Status card */}
      {total > 0 && (
        <div
          className="rounded-[14px] border p-4 space-y-3"
          style={{ backgroundColor: '#ffffff', borderColor: '#e8e5de' }}
        >
          <p
            className="font-mono uppercase tracking-widest"
            style={{ fontSize: '0.65625rem', color: 'var(--zels-primary)', letterSpacing: '0.1em' }}
          >
            AGORA · {currentTimeLabel()}
          </p>

          <div className="flex items-end gap-1.5 flex-wrap">
            <span
              className="font-mono tabular-nums font-[700]"
              style={{ fontSize: '1.375rem', color: '#3D2B1F' }}
            >
              {doneCount}
            </span>
            <span style={{ fontSize: '1.375rem', color: '#3D2B1F' }}>de</span>
            <span
              className="font-mono tabular-nums font-[700]"
              style={{ fontSize: '1.375rem', color: '#3D2B1F' }}
            >
              {total}
            </span>
            <span
              className="font-[500] mb-0.5"
              style={{ fontSize: '0.9375rem', color: 'rgba(61,43,31,0.68)' }}
            >
              tarefas
            </span>

            {lateCount > 0 && (
              <span
                className="ml-auto shrink-0 font-semibold px-2.5 py-0.5 rounded-full"
                style={{
                  fontSize: '0.75rem',
                  backgroundColor: 'rgba(184,52,26,0.10)',
                  color: '#B8341A',
                }}
              >
                {lateCount} atrasada{lateCount > 1 ? 's' : ''}
              </span>
            )}
          </div>

          <SegmentedBar items={items} />
        </div>
      )}

      {/* Moments */}
      <div className="space-y-2">
        {PERIODS.map((period) => (
          <MomentoBlock
            key={period}
            period={period}
            items={grouped[period]}
            currentPeriod={currentPeriod}
            onTap={setSelectedItem}
          />
        ))}
        {items.length === 0 && (
          <p
            className="py-8 text-center text-sm"
            style={{ color: 'rgba(61,43,31,0.68)' }}
          >
            Nenhum item no checklist de hoje.
          </p>
        )}
      </div>

      {/* Gerenciar rotinas */}
      <button
        type="button"
        onClick={() => setRoutinesOpen(true)}
        className="flex items-center gap-1.5 transition-opacity hover:opacity-70"
        style={{ color: 'rgba(61,43,31,0.42)', fontSize: '0.8125rem' }}
      >
        <Settings2 size={13} />
        Gerenciar rotinas
      </button>

      {selectedItem && (
        <BottomSheet
          item={selectedItem}
          checklistId={checklist.id}
          onClose={() => setSelectedItem(null)}
        />
      )}

      {addSheetOpen && (
        <AddItemSheet
          checklistId={checklist.id}
          healthProfileId={healthProfileId}
          onClose={() => setAddSheetOpen(false)}
        />
      )}

      {routinesOpen && (
        <RoutinesSheet
          healthProfileId={healthProfileId}
          onClose={() => setRoutinesOpen(false)}
        />
      )}

      <button
        type="button"
        onClick={() => setAddSheetOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full text-white flex items-center justify-center z-40 hover:opacity-90 transition-opacity"
        style={{
          backgroundColor: 'var(--primary)',
          boxShadow: '0 4px 16px rgba(139,175,138,0.35)',
        }}
        aria-label="Adicionar tarefa"
      >
        <Plus size={22} />
      </button>
    </>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function ChecklistMobile() {
  const router      = useRouter()
  const queryClient = useQueryClient()
  const { data: profile }     = useHealthProfile()
  const { data: currentUser } = useCurrentUser()
  const today = todayParam()

  const { data: checklists, isLoading: checklistLoading, isError } = useChecklist(profile?.id)
  const checklist = Array.isArray(checklists) ? checklists[0] : undefined

  const { data: items, isLoading: itemsLoading } = useChecklistItems(checklist?.id)
  const { data: report }                          = useChecklistReport(checklist?.id)
  const { mutateAsync: createChecklist }          = useCreateChecklist()

  const [isFetchingSuggestions, setIsFetchingSuggestions] = useState(false)
  const [suggestionsOpen, setSuggestionsOpen]             = useState(false)
  const [suggestionsData, setSuggestionsData]             = useState<SuggestionsData | null>(null)
  const [isCreatingItems, setIsCreatingItems]             = useState(false)

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

  const isLoading = checklistLoading || (!!checklist && itemsLoading)
  const firstName = profile?.fullName ? getFirstName(profile.fullName) : '…'
  const initials  = currentUser?.name ? getInitials(currentUser.name) : '?'

  return (
    <div className="space-y-4 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="p-1 -ml-1 rounded-md transition-colors"
          style={{ color: 'rgba(61,43,31,0.42)' }}
        >
          <ChevronLeft size={20} />
        </button>

        <div className="flex-1 min-w-0">
          <PageHeader
            overline={profile?.fullName}
            title="Checklist"
            subtitle={new Date().toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' })}
          />
        </div>

        <div
          className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
          style={{ backgroundColor: ROLE_CONFIG[currentUser?.role as keyof typeof ROLE_CONFIG]?.color ?? 'var(--zels-avatar-curator)' }}
        >
          <span
            className="text-white font-mono font-semibold"
            style={{ fontSize: '0.625rem' }}
          >
            {initials}
          </span>
        </div>
      </div>

      {/* Error */}
      {isError && (
        <p className="py-8 text-center text-sm" style={{ color: 'rgba(61,43,31,0.68)' }}>
          Não foi possível carregar o checklist.
        </p>
      )}

      {/* Loading */}
      {!isError && isLoading && <Skeleton />}

      {/* Empty state */}
      {!isError && !isLoading && !checklist && (
        <div className="py-16 flex flex-col items-center gap-4">
          <p className="text-sm text-center" style={{ color: 'rgba(61,43,31,0.68)' }}>
            Nenhum checklist criado para hoje.
          </p>
          <button
            type="button"
            onClick={handleCreate}
            disabled={isFetchingSuggestions || !profile?.id}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-white text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50 disabled:pointer-events-none"
            style={{ backgroundColor: 'var(--primary)' }}
          >
            <Plus size={16} />
            {isFetchingSuggestions ? 'Buscando tarefas…' : 'Iniciar checklist do dia'}
          </button>
        </div>
      )}

      {/* Content */}
      {!isError && !isLoading && checklist && profile?.id && (
        <ChecklistContent
          checklist={checklist}
          items={Array.isArray(items) ? items : []}
          report={report}
          healthProfileId={profile.id}
        />
      )}

      {suggestionsOpen && suggestionsData && (
        <SuggestionsSheet
          data={suggestionsData}
          onConfirm={handleConfirmCreate}
          onCancel={() => setSuggestionsOpen(false)}
          isCreating={isCreatingItems}
          variant="sheet"
        />
      )}
    </div>
  )
}
