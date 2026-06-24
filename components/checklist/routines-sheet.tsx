'use client'

import { useState } from 'react'
import { X, Trash2, Plus } from 'lucide-react'
import {
  useChecklistTemplates,
  useCreateChecklistTemplate,
  useDeleteChecklistTemplate,
  type ChecklistTemplate,
} from '@/hooks/useChecklistTemplates'

type Props = {
  healthProfileId: string
  onClose: () => void
}

function TemplateRow({
  template,
  healthProfileId,
  isLast,
}: {
  template: ChecklistTemplate
  healthProfileId: string
  isLast: boolean
}) {
  const [confirming, setConfirming] = useState(false)
  const { mutate: deleteTemplate, isPending } = useDeleteChecklistTemplate()

  function handleDelete() {
    deleteTemplate(
      { id: template.id, healthProfileId },
      { onSuccess: () => setConfirming(false) },
    )
  }

  return (
    <div
      className="flex items-center gap-3 px-4 py-3"
      style={{ borderBottom: isLast ? 'none' : '1px solid #e8e5de' }}
    >
      <div className="flex-1 min-w-0">
        <p className="truncate text-[#3D2B1F]" style={{ fontSize: '0.875rem' }}>
          {template.itemName}
        </p>
        {template.scheduledTime && (
          <p
            className="font-mono mt-0.5"
            style={{ fontSize: '0.6875rem', color: 'rgba(61,43,31,0.42)' }}
          >
            {template.scheduledTime}
          </p>
        )}
        {!template.scheduledTime && (
          <p
            className="mt-0.5"
            style={{ fontSize: '0.6875rem', color: 'rgba(61,43,31,0.42)' }}
          >
            sem horário
          </p>
        )}
      </div>

      {confirming ? (
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleDelete}
            disabled={isPending}
            className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-white disabled:opacity-40"
            style={{ backgroundColor: '#B8341A' }}
          >
            {isPending ? '…' : 'Remover'}
          </button>
          <button
            onClick={() => setConfirming(false)}
            className="text-xs transition-opacity hover:opacity-70"
            style={{ color: 'rgba(61,43,31,0.42)' }}
          >
            Não
          </button>
        </div>
      ) : (
        <button
          onClick={() => setConfirming(true)}
          className="shrink-0 p-1.5 rounded-md transition-opacity hover:opacity-60"
          style={{ color: 'rgba(61,43,31,0.42)' }}
          aria-label="Remover rotina"
        >
          <Trash2 size={15} />
        </button>
      )}
    </div>
  )
}

function AddRoutineInline({ healthProfileId }: { healthProfileId: string }) {
  const [open, setOpen] = useState(false)
  const [itemName, setItemName] = useState('')
  const [scheduledTime, setScheduledTime] = useState('')
  const { mutate: createTemplate, isPending } = useCreateChecklistTemplate()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!itemName.trim()) return
    createTemplate(
      { healthProfileId, itemName: itemName.trim(), scheduledTime: scheduledTime || undefined },
      {
        onSuccess: () => {
          setItemName('')
          setScheduledTime('')
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
        className="flex items-center gap-2 px-4 py-3 rounded-xl w-full text-sm font-medium border transition-opacity hover:opacity-80"
        style={{ borderColor: 'rgba(139,175,138,0.40)', color: 'var(--zels-primary-strong)' }}
      >
        <Plus size={15} />
        Adicionar nova rotina
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <input
        value={itemName}
        onChange={(e) => setItemName(e.target.value)}
        placeholder="Nome da rotina *"
        autoFocus
        className="w-full rounded-xl border px-4 py-3 text-sm text-[#3D2B1F] focus:outline-none focus:ring-2 focus:ring-zels-primary/30"
        style={{ borderColor: '#e8e5de', backgroundColor: '#f6f4ef' }}
      />
      <input
        type="time"
        value={scheduledTime}
        onChange={(e) => setScheduledTime(e.target.value)}
        className="w-full rounded-xl border px-4 py-3 text-sm font-mono text-[#3D2B1F] focus:outline-none focus:ring-2 focus:ring-zels-primary/30"
        style={{ borderColor: '#e8e5de', backgroundColor: '#f6f4ef' }}
      />
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isPending || !itemName.trim()}
          className="flex-1 py-3 rounded-xl text-white text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-40 disabled:pointer-events-none"
          style={{ backgroundColor: 'var(--primary)' }}
        >
          {isPending ? 'Salvando…' : 'Salvar rotina'}
        </button>
        <button
          type="button"
          onClick={() => { setOpen(false); setItemName(''); setScheduledTime('') }}
          className="px-4 py-3 rounded-xl text-sm border"
          style={{ color: 'rgba(61,43,31,0.42)', borderColor: '#e8e5de' }}
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}

export function RoutinesSheet({ healthProfileId, onClose }: Props) {
  const { data: templates, isLoading } = useChecklistTemplates(healthProfileId)
  const safeTemplates = Array.isArray(templates) ? templates : []

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden />

      <div className="relative bg-white rounded-t-2xl pt-8 pb-8 px-6 max-h-[80vh] overflow-y-auto">
        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-[#efece5]" />

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <p className="font-semibold text-[#3D2B1F]">Rotinas diárias</p>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md transition-colors"
            style={{ color: 'rgba(61,43,31,0.42)' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Lista */}
        {isLoading && (
          <div className="animate-pulse space-y-2 mb-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-12 rounded-xl" style={{ backgroundColor: '#efece5' }} />
            ))}
          </div>
        )}

        {!isLoading && safeTemplates.length === 0 && (
          <p
            className="py-4 text-center text-sm mb-4"
            style={{ color: 'rgba(61,43,31,0.68)' }}
          >
            Nenhuma rotina cadastrada ainda.
          </p>
        )}

        {!isLoading && safeTemplates.length > 0 && (
          <div
            className="rounded-xl border overflow-hidden mb-4"
            style={{ borderColor: '#e8e5de' }}
          >
            {safeTemplates.map((t, i) => (
              <TemplateRow
                key={t.id}
                template={t}
                healthProfileId={healthProfileId}
                isLast={i === safeTemplates.length - 1}
              />
            ))}
          </div>
        )}

        <AddRoutineInline healthProfileId={healthProfileId} />
      </div>
    </div>
  )
}
