'use client'

import { useState } from 'react'
import { BookOpen, AlertCircle, Activity, CalendarDays, FileText, ChevronDown, ChevronUp, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { type HealthRecord, type HealthRecordType, useDeleteHealthRecord } from '@/lib/api/health-records'

const TYPE_CONFIG: Record<
  HealthRecordType,
  { label: string; Icon: React.ElementType; textClass: string; bgClass: string }
> = {
  DIARY:   { label: 'Diário',  Icon: BookOpen,     textClass: 'text-zels-primary',    bgClass: 'bg-zels-primary-soft' },
  SYMPTOM: { label: 'Sintoma', Icon: AlertCircle,  textClass: 'text-zels-urgent',     bgClass: 'bg-red-50' },
  VITAL:   { label: 'Vital',   Icon: Activity,     textClass: 'text-zels-ok',         bgClass: 'bg-zels-primary-soft' },
  EVENT:   { label: 'Evento',  Icon: CalendarDays, textClass: 'text-zels-attention',  bgClass: 'bg-amber-50' },
  EXAM:    { label: 'Exame',   Icon: FileText,     textClass: 'text-zels-text-soft',  bgClass: 'bg-muted' },
}

const INTENSITY_CONFIG: Record<string, { label: string; textClass: string; bgClass: string }> = {
  leve:     { label: 'Leve',     textClass: 'text-zels-attention', bgClass: 'bg-amber-50' },
  mild:     { label: 'Leve',     textClass: 'text-zels-attention', bgClass: 'bg-amber-50' },
  moderado: { label: 'Moderado', textClass: 'text-orange-600',    bgClass: 'bg-orange-50' },
  moderate: { label: 'Moderado', textClass: 'text-orange-600',    bgClass: 'bg-orange-50' },
  forte:    { label: 'Forte',    textClass: 'text-zels-urgent',   bgClass: 'bg-red-50' },
}

const VITAL_LABELS: Record<string, string> = {
  blood_pressure: 'Pressão arterial',
  heart_rate:     'Freq. cardíaca',
  weight:         'Peso',
}

const SOURCE_LABELS: Partial<Record<HealthRecord['source'], string>> = {
  WHATSAPP: 'WhatsApp',
  AUDIO:    'Áudio',
  IMAGE:    'Imagem',
}

function relativeTime(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (diff < 1) return 'agora'
  if (diff < 60) return `há ${diff} min`
  const h = Math.floor(diff / 60)
  if (h < 24) return `há ${h}h`
  const d = Math.floor(h / 24)
  if (d === 1) return 'ontem'
  return `há ${d}d`
}

function formatSummary(record: HealthRecord): string {
  const { type, data } = record
  if (type === 'DIARY') return (data.text ?? '').slice(0, 90)
  if (type === 'SYMPTOM') {
    const intensityLabel = data.intensity ? (INTENSITY_CONFIG[data.intensity]?.label ?? data.intensity) : ''
    return `${data.symptom ?? ''} · ${intensityLabel}`
  }
  if (type === 'VITAL') {
    if (data.type === 'blood_pressure') return `${data.systolic}/${data.diastolic} mmHg`
    return `${data.value} ${data.unit ?? ''}`
  }
  if (type === 'EVENT') return (data.description ?? '').slice(0, 90)
  return ''
}

function RecordDetail({ record }: { record: HealthRecord }) {
  const { type, data } = record

  if (type === 'DIARY') {
    return <p className="text-sm text-foreground leading-relaxed">{data.text}</p>
  }

  if (type === 'SYMPTOM') {
    const intensity = data.intensity ? INTENSITY_CONFIG[data.intensity] : null
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-foreground">{data.symptom}</span>
          {intensity && (
            <span
              className={cn(
                'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                intensity.bgClass,
                intensity.textClass
              )}
            >
              {intensity.label}
            </span>
          )}
        </div>
        {data.context && (
          <p className="text-sm text-zels-text-soft italic">&ldquo;{data.context}&rdquo;</p>
        )}
      </div>
    )
  }

  if (type === 'VITAL') {
    const label = VITAL_LABELS[data.type ?? ''] ?? data.type
    const valueStr =
      data.type === 'blood_pressure'
        ? `${data.systolic}/${data.diastolic} ${data.unit ?? 'mmHg'}`
        : `${data.value} ${data.unit ?? ''}`
    return (
      <div className="space-y-1">
        <p className="text-xs text-zels-text-soft">{label}</p>
        <p className="font-mono text-base font-semibold text-foreground">{valueStr}</p>
      </div>
    )
  }

  if (type === 'EVENT') {
    return (
      <div className="space-y-1">
        <p className="text-sm text-foreground">{data.description}</p>
        {data.location && (
          <p className="text-xs text-zels-text-soft">📍 {data.location}</p>
        )}
      </div>
    )
  }

  return null
}

export function HealthRecordCard({ record }: { record: HealthRecord }) {
  const [expanded, setExpanded] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const { mutate: deleteRecord, isPending: isDeleting } = useDeleteHealthRecord()

  const config = TYPE_CONFIG[record.type] ?? TYPE_CONFIG.EXAM
  const { Icon } = config
  const sourceLabel = SOURCE_LABELS[record.source]

  function handleDelete() {
    setDeleteError(null)
    deleteRecord(record.id, {
      onError: () => setDeleteError('Não foi possível excluir. Tente novamente.'),
    })
  }

  return (
    <div className="rounded-xl bg-card shadow-sm ring-1 ring-black/5 overflow-hidden">
      <button
        type="button"
        onClick={() => {
          setExpanded(prev => !prev)
          setConfirming(false)
        }}
        aria-expanded={expanded}
        className="w-full flex items-start gap-3 p-4 text-left hover:bg-muted/40 transition-colors"
      >
        <div
          className={cn(
            'h-8 w-8 rounded-lg shrink-0 flex items-center justify-center mt-0.5',
            config.bgClass
          )}
        >
          <Icon size={15} className={config.textClass} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className={cn('text-xs font-semibold', config.textClass)}>{config.label}</span>
            {sourceLabel && (
              <span className="text-xs text-zels-text-faint">· via {sourceLabel}</span>
            )}
          </div>
          <p className="text-sm text-foreground truncate">{formatSummary(record)}</p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
          <span className="font-mono text-xs text-zels-text-faint">
            {relativeTime(record.createdAt)}
          </span>
          {expanded ? (
            <ChevronUp size={14} className="text-zels-text-faint" />
          ) : (
            <ChevronDown size={14} className="text-zels-text-faint" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-border px-4 pb-4 pt-3 space-y-4">
          <RecordDetail record={record} />

          {!confirming && (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="inline-flex items-center gap-1.5 text-xs text-zels-text-faint hover:text-zels-urgent transition-colors"
            >
              <Trash2 size={12} />
              Excluir registro
            </button>
          )}

          {confirming && (
            <div className="space-y-2">
              <p className="text-xs text-zels-text-soft">Tem certeza? Esta ação não pode ser desfeita.</p>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium text-zels-urgent bg-red-50 hover:opacity-80 transition-opacity disabled:opacity-40 disabled:pointer-events-none"
                >
                  {isDeleting ? 'Excluindo…' : 'Sim, excluir'}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  disabled={isDeleting}
                  className="text-xs text-zels-text-faint hover:text-foreground transition-colors"
                >
                  Cancelar
                </button>
              </div>
              {deleteError && <p className="text-xs text-zels-urgent">{deleteError}</p>}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
