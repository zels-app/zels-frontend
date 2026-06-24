'use client'

import { useState } from 'react'
import { Pill, ChevronDown, ChevronUp, Check, SkipForward, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { type Medication } from '@/lib/api/medications'
import {
  useMedicationLogs,
  useCreateMedicationLog,
  type LogStatus,
  type MedicationLog,
} from '@/lib/api/medication-logs'

function toScheduledAt(timeStr: string): string {
  const [h, m] = timeStr.split(':').map(Number)
  const d = new Date()
  d.setHours(h, m, 0, 0)
  return d.toISOString()
}

function relativeTime(isoString: string): string {
  const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 60000)
  if (diff < 1) return 'agora mesmo'
  if (diff < 60) return `há ${diff} min`
  const hours = Math.floor(diff / 60)
  if (hours < 24) return `há ${hours}h`
  const days = Math.floor(hours / 24)
  return `há ${days} dia${days > 1 ? 's' : ''}`
}

const STATUS_CONFIG: Record<LogStatus, { label: string; textClass: string }> = {
  TAKEN: { label: 'Tomado', textClass: 'text-zels-ok' },
  MISSED: { label: 'Esquecido', textClass: 'text-zels-urgent' },
  SKIPPED: { label: 'Pulado', textClass: 'text-zels-attention' },
}

function ScheduleRow({
  timeStr,
  pendingKey,
  onLog,
}: {
  timeStr: string
  pendingKey: string | null
  onLog: (timeStr: string, status: LogStatus) => void
}) {
  const isBusy = (status: LogStatus) => pendingKey === `${timeStr}-${status}`
  const anyPending = pendingKey !== null

  return (
    <div className="flex items-center gap-2 py-2.5 border-b border-border last:border-0 flex-wrap">
      <button
        type="button"
        onClick={() => onLog(timeStr, 'TAKEN')}
        disabled={anyPending}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-zels-ok bg-zels-primary-soft hover:opacity-80 transition-opacity disabled:opacity-40 disabled:pointer-events-none flex-1 min-w-[10rem]"
      >
        <Check size={13} />
        {isBusy('TAKEN') ? 'Registrando…' : `Confirmar tomada das ${timeStr}`}
      </button>

      <div className="flex gap-1.5">
        <button
          type="button"
          onClick={() => onLog(timeStr, 'SKIPPED')}
          disabled={anyPending}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-sm font-medium text-zels-attention hover:bg-amber-50 transition-colors disabled:opacity-40 disabled:pointer-events-none"
        >
          <SkipForward size={13} />
          {isBusy('SKIPPED') ? '…' : 'Pulei'}
        </button>
        <button
          type="button"
          onClick={() => onLog(timeStr, 'MISSED')}
          disabled={anyPending}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-sm font-medium text-zels-urgent hover:bg-red-50 transition-colors disabled:opacity-40 disabled:pointer-events-none"
        >
          <X size={13} />
          {isBusy('MISSED') ? '…' : 'Esqueci'}
        </button>
      </div>
    </div>
  )
}

function LogRow({ log }: { log: MedicationLog }) {
  const config = STATUS_CONFIG[log.status]
  const scheduledTime = new Date(log.scheduledAt).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })
  const timeRef = log.confirmedAt ?? log.scheduledAt

  return (
    <div className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
      <div className="flex items-center gap-1.5">
        <span className={cn('text-sm font-medium', config.textClass)}>{config.label}</span>
        <span className="text-xs text-zels-text-faint">· previsto {scheduledTime}</span>
      </div>
      <span className="font-mono text-xs text-zels-text-faint shrink-0">{relativeTime(timeRef)}</span>
    </div>
  )
}

export function MedicationCard({ med }: { med: Medication }) {
  const [expanded, setExpanded] = useState(false)
  const [pendingKey, setPendingKey] = useState<string | null>(null)
  const [logError, setLogError] = useState<string | null>(null)

  const { data: logs, isLoading: logsLoading } = useMedicationLogs(med.id, expanded)
  const { mutate: createLog } = useCreateMedicationLog(med.id)

  function handleLog(timeStr: string, status: LogStatus) {
    setLogError(null)
    setPendingKey(`${timeStr}-${status}`)
    createLog(
      { scheduledAt: toScheduledAt(timeStr), status },
      {
        onError: () => setLogError('Não foi possível registrar. Tente novamente.'),
        onSettled: () => setPendingKey(null),
      }
    )
  }

  const schedulePreview = med.schedule
    .slice(0, 3)
    .join(' · ')
    .concat(med.schedule.length > 3 ? ' …' : '')

  return (
    <div className="rounded-xl bg-card shadow-sm ring-1 ring-black/5 overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        aria-expanded={expanded}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/40 transition-colors"
      >
        <div className="h-10 w-10 rounded-lg bg-zels-primary-soft shrink-0 flex items-center justify-center">
          <Pill size={18} className="text-zels-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">{med.name}</p>
          <p className="text-xs text-zels-text-soft truncate">
            {med.dosage}
            {med.schedule.length > 0 && (
              <span className="font-mono"> · {schedulePreview}</span>
            )}
          </p>
        </div>
        {expanded
          ? <ChevronUp size={16} className="text-zels-text-faint shrink-0" />
          : <ChevronDown size={16} className="text-zels-text-faint shrink-0" />
        }
      </button>

      {expanded && (
        <div className="border-t border-border px-4 pb-4 pt-4 space-y-5">
          {med.instructions && (
            <div className="rounded-lg bg-muted/50 px-3 py-2 text-sm text-zels-text-soft">
              <span className="font-medium text-foreground">Instruções: </span>
              {med.instructions}
            </div>
          )}

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-zels-text-faint mb-2">
              Registrar tomada
            </p>
            {med.schedule.length > 0 ? (
              <>
                {med.schedule.map((timeStr) => (
                  <ScheduleRow
                    key={timeStr}
                    timeStr={timeStr}
                    pendingKey={pendingKey}
                    onLog={handleLog}
                  />
                ))}
                {logError && (
                  <p className="mt-2 text-xs text-zels-urgent">{logError}</p>
                )}
              </>
            ) : (
              <p className="text-sm text-zels-text-faint">Sem horários definidos.</p>
            )}
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-zels-text-faint mb-2">
              Histórico recente
            </p>
            {logsLoading && (
              <div className="space-y-1.5 animate-pulse">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-7 rounded bg-muted" />
                ))}
              </div>
            )}
            {!logsLoading && (!logs || logs.length === 0) && (
              <p className="py-2 text-sm text-zels-text-faint">Nenhum registro ainda.</p>
            )}
            {!logsLoading && logs && logs.length > 0 &&
              logs.map((log) => <LogRow key={log.id} log={log} />)
            }
          </div>
        </div>
      )}
    </div>
  )
}
