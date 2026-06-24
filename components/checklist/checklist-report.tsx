'use client'

import { cn } from '@/lib/utils'
import { type ChecklistReport } from '@/lib/api/checklists'

function StatPill({
  label,
  value,
  colorClass,
}: {
  label: string
  value: number
  colorClass: string
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-muted/60 px-3 py-2">
      <span className={cn('text-base font-semibold tabular-nums', colorClass)}>{value}</span>
      <span className="text-xs text-zels-text-soft">{label}</span>
    </div>
  )
}

export function ChecklistReportBar({ report }: { report: ChecklistReport }) {
  return (
    <div className="flex flex-wrap gap-2">
      <StatPill label="Total" value={report.total} colorClass="text-foreground" />
      <StatPill label="Concluídos" value={report.completed} colorClass="text-zels-ok" />
      <StatPill label="Pendentes" value={report.pending} colorClass="text-zels-attention" />
      <StatPill label="Não feitos" value={report.notDone} colorClass="text-zels-urgent" />
    </div>
  )
}
