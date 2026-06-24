'use client'

import { useState } from 'react'
import { Check, SkipForward, X, Trash2 } from 'lucide-react'
import { useUpdateMedicationLog } from '@/hooks/useUpdateMedicationLog'
import { useDeleteMedicationLog } from '@/hooks/useDeleteMedicationLog'

type LogStatus = 'TAKEN' | 'MISSED' | 'SKIPPED'

export type EditLogProps = {
  logId: string
  medicationId: string
  medicationName: string
  scheduledTime: string
  status: string
}

const STATUS_OPTIONS: {
  value: LogStatus
  label: string
  icon: React.ReactNode
  color: string
  bg: string
  selectedBg: string
}[] = [
  {
    value: 'TAKEN',
    label: 'Tomada',
    icon: <Check size={14} />,
    color: 'var(--zels-primary-strong)',
    bg: 'rgba(139,175,138,0.08)',
    selectedBg: 'var(--zels-primary-soft)',
  },
  {
    value: 'SKIPPED',
    label: 'Pulei',
    icon: <SkipForward size={14} />,
    color: '#a86e13',
    bg: 'rgba(168,110,19,0.08)',
    selectedBg: 'rgba(168,110,19,0.15)',
  },
  {
    value: 'MISSED',
    label: 'Esqueci',
    icon: <X size={14} />,
    color: '#b8341a',
    bg: 'rgba(184,52,26,0.08)',
    selectedBg: 'rgba(184,52,26,0.15)',
  },
]

function normalizeStatus(raw: string): LogStatus {
  const upper = raw.toUpperCase()
  if (upper === 'TAKEN' || upper === 'MISSED' || upper === 'SKIPPED') return upper as LogStatus
  return 'TAKEN'
}

export function EditLogDialog({
  open,
  onClose,
  log,
}: {
  open: boolean
  onClose: () => void
  log: EditLogProps
}) {
  const [selected, setSelected] = useState<LogStatus>(normalizeStatus(log.status))
  const [confirmDelete, setConfirmDelete] = useState(false)
  const { mutate: updateLog, isPending: isUpdating } = useUpdateMedicationLog()
  const { mutate: deleteLog, isPending: isDeleting } = useDeleteMedicationLog()
  const isPending = isUpdating || isDeleting

  if (!open) return null

  const currentStatus = normalizeStatus(log.status)
  const unchanged = selected === currentStatus

  function handleConfirm() {
    updateLog(
      { medicationId: log.medicationId, logId: log.logId, status: selected },
      { onSuccess: onClose }
    )
  }

  function handleDelete() {
    deleteLog(
      { medicationId: log.medicationId, logId: log.logId },
      { onSuccess: onClose }
    )
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 60,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(61,43,31,0.45)',
        padding: 16,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 400,
          background: '#ffffff',
          borderRadius: 16,
          boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
          padding: 24,
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
        }}
      >
        {/* header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <p style={{ fontSize: 15, fontWeight: 600, color: '#3D2B1F', lineHeight: 1.3 }}>
              Alterar registro de dose
            </p>
            <p style={{ fontSize: 12, color: 'rgba(61,43,31,0.55)', marginTop: 3 }}>
              {log.medicationName}
              {log.scheduledTime !== '—' && (
                <span style={{ fontFamily: 'var(--font-jetbrains-mono, monospace)' }}>
                  {' '}· {log.scheduledTime}
                </span>
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'rgba(61,43,31,0.42)',
              padding: 4,
              flexShrink: 0,
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* label */}
        <p style={{ fontSize: 13, color: 'rgba(61,43,31,0.68)', marginBottom: -8 }}>
          Selecione o novo status para esta dose:
        </p>

        {/* status options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {STATUS_OPTIONS.map((opt) => {
            const isSelected = selected === opt.value
            const isCurrent = currentStatus === opt.value
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setSelected(opt.value)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '11px 14px',
                  borderRadius: 10,
                  border: isSelected
                    ? `2px solid ${opt.color}`
                    : '2px solid rgba(61,43,31,0.1)',
                  background: isSelected ? opt.selectedBg : opt.bg,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.12s ease',
                }}
              >
                <span style={{ color: opt.color, display: 'flex', flexShrink: 0 }}>
                  {opt.icon}
                </span>
                <span style={{ fontSize: 14, fontWeight: 500, color: opt.color, flex: 1 }}>
                  {opt.label}
                </span>
                {isCurrent && (
                  <span
                    style={{
                      fontFamily: 'var(--font-jetbrains-mono, monospace)',
                      fontSize: 10,
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      color: 'rgba(61,43,31,0.42)',
                      flexShrink: 0,
                    }}
                  >
                    atual
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* remove option */}
        <div>
          <hr style={{ border: 'none', borderTop: '1px solid rgba(61,43,31,0.08)', margin: '0 0 12px' }} />
          {!confirmDelete ? (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              disabled={isPending}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                width: '100%',
                padding: '10px 14px',
                borderRadius: 10,
                border: '2px solid rgba(184,52,26,0.2)',
                background: 'rgba(184,52,26,0.05)',
                color: '#b8341a',
                fontSize: 13,
                fontWeight: 500,
                cursor: isPending ? 'not-allowed' : 'pointer',
                opacity: isPending ? 0.5 : 1,
                textAlign: 'left',
              }}
            >
              <Trash2 size={14} />
              Remover marcação
            </button>
          ) : (
            <div
              style={{
                padding: '12px 14px',
                borderRadius: 10,
                border: '2px solid rgba(184,52,26,0.3)',
                background: 'rgba(184,52,26,0.06)',
              }}
            >
              <p style={{ fontSize: 13, color: '#b8341a', fontWeight: 500, marginBottom: 10 }}>
                Tem certeza? A dose voltará ao status original (pendente ou atrasada).
              </p>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  disabled={isDeleting}
                  style={{
                    padding: '7px 14px',
                    borderRadius: 7,
                    fontSize: 12,
                    fontWeight: 500,
                    color: 'rgba(61,43,31,0.68)',
                    background: 'transparent',
                    border: 'none',
                    cursor: isDeleting ? 'not-allowed' : 'pointer',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  style={{
                    padding: '7px 14px',
                    borderRadius: 7,
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#ffffff',
                    background: '#b8341a',
                    border: 'none',
                    cursor: isDeleting ? 'not-allowed' : 'pointer',
                    opacity: isDeleting ? 0.5 : 1,
                  }}
                >
                  {isDeleting ? 'Removendo…' : 'Sim, remover'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* actions */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 4 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '9px 16px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 500,
              color: 'rgba(61,43,31,0.68)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={unchanged || isPending}
            style={{
              padding: '9px 18px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              color: '#ffffff',
              background: 'var(--primary)',
              border: 'none',
              cursor: unchanged || isPending ? 'not-allowed' : 'pointer',
              opacity: unchanged || isPending ? 0.5 : 1,
            }}
          >
            {isPending ? 'Salvando…' : 'Confirmar alteração'}
          </button>
        </div>
      </div>
    </div>
  )
}
