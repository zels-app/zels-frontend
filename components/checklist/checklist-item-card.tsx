'use client'

import { useState } from 'react'
import { Clock, Check, Minus, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  type ChecklistItem,
  type ChecklistItemStatus,
  useUpdateChecklistItem,
} from '@/lib/api/checklists'

const STATUS_CONFIG: Record<
  ChecklistItemStatus,
  { label: string; textClass: string; bgClass: string }
> = {
  PENDING: {
    label: 'Pendente',
    textClass: 'text-zels-text-faint',
    bgClass: 'bg-muted',
  },
  COMPLETED: {
    label: 'Concluído',
    textClass: 'text-zels-ok',
    bgClass: 'bg-zels-primary-soft',
  },
  PARTIAL: {
    label: 'Parcial',
    textClass: 'text-zels-attention',
    bgClass: 'bg-amber-50',
  },
  NOT_DONE: {
    label: 'Não feito',
    textClass: 'text-zels-urgent',
    bgClass: 'bg-red-50',
  },
}

export function ChecklistItemCard({
  item,
  checklistId,
}: {
  item: ChecklistItem
  checklistId: string
}) {
  const [pendingAction, setPendingAction] = useState<'PARTIAL' | 'NOT_DONE' | null>(null)
  const [noteText, setNoteText] = useState('')
  const [error, setError] = useState<string | null>(null)

  const { mutate, isPending } = useUpdateChecklistItem(checklistId)

  const statusConfig = STATUS_CONFIG[item.status]

  function handleCompleted() {
    setError(null)
    mutate(
      { itemId: item.id, status: 'COMPLETED' },
      { onError: () => setError('Não foi possível registrar. Tente novamente.') },
    )
  }

  function openNoteFor(action: 'PARTIAL' | 'NOT_DONE') {
    setPendingAction(action)
    setNoteText('')
    setError(null)
  }

  function handleConfirm() {
    if (!pendingAction) return
    setError(null)
    mutate(
      { itemId: item.id, status: pendingAction, notes: noteText || undefined },
      {
        onSuccess: () => {
          setPendingAction(null)
          setNoteText('')
        },
        onError: () => setError('Não foi possível registrar. Tente novamente.'),
      },
    )
  }

  function handleCancel() {
    setPendingAction(null)
    setNoteText('')
    setError(null)
  }

  return (
    <div className="rounded-xl bg-card shadow-sm ring-1 ring-black/5 p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
          <Clock size={13} className="text-zels-text-faint" />
          <span className="font-mono text-xs text-zels-text-soft">{item.scheduledTime}</span>
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">{item.itemName}</p>
          {item.notes && (
            <p className="mt-0.5 text-xs text-zels-text-soft italic">
              &ldquo;{item.notes}&rdquo;
            </p>
          )}
        </div>

        <span
          className={cn(
            'shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
            statusConfig.bgClass,
            statusConfig.textClass,
          )}
        >
          {statusConfig.label}
        </span>
      </div>

      {/* Action buttons — always visible para permitir correção */}
      {!pendingAction && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={handleCompleted}
            disabled={isPending}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-zels-ok bg-zels-primary-soft hover:opacity-80 transition-opacity disabled:opacity-40 disabled:pointer-events-none"
          >
            <Check size={12} />
            {isPending ? 'Registrando…' : 'Concluído'}
          </button>

          <button
            type="button"
            onClick={() => openNoteFor('PARTIAL')}
            disabled={isPending}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-zels-attention border border-zels-attention/25 hover:bg-amber-50 transition-colors disabled:opacity-40 disabled:pointer-events-none"
          >
            <Minus size={12} />
            Parcial
          </button>

          <button
            type="button"
            onClick={() => openNoteFor('NOT_DONE')}
            disabled={isPending}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-zels-urgent border border-zels-urgent/25 hover:bg-red-50 transition-colors disabled:opacity-40 disabled:pointer-events-none"
          >
            <X size={12} />
            Não feito
          </button>
        </div>
      )}

      {/* Campo de nota (aparece ao clicar em Parcial ou Não feito) */}
      {pendingAction && (
        <div className="space-y-2">
          <p className="text-xs text-zels-text-soft">
            {pendingAction === 'PARTIAL'
              ? 'Observação sobre o parcial (opcional):'
              : 'Motivo ou observação (opcional):'}
          </p>
          <textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Ex: Recusou, fez pela metade…"
            rows={2}
            className="w-full rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-foreground placeholder:text-zels-text-faint focus:outline-none focus:ring-2 focus:ring-zels-primary/30 resize-none"
          />
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isPending}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-opacity disabled:opacity-40 disabled:pointer-events-none',
                pendingAction === 'PARTIAL'
                  ? 'text-zels-attention bg-amber-50 hover:opacity-80'
                  : 'text-zels-urgent bg-red-50 hover:opacity-80',
              )}
            >
              {isPending ? 'Registrando…' : 'Confirmar'}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              disabled={isPending}
              className="text-xs text-zels-text-faint hover:text-foreground transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-xs text-zels-urgent">{error}</p>}
    </div>
  )
}
