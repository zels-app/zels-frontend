'use client'

import { useHealthProfile } from '@/lib/api/health-profile'
import { useChecklist, useChecklistItems, useChecklistReport } from '@/lib/api/checklists'
import { ChecklistReportBar } from './checklist-report'
import { ChecklistItemCard } from './checklist-item-card'

function ReportSkeleton() {
  return (
    <div className="flex gap-2 animate-pulse">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="h-9 w-24 rounded-lg bg-muted" />
      ))}
    </div>
  )
}

function CardSkeleton() {
  return (
    <div className="rounded-xl bg-card shadow-sm ring-1 ring-black/5 p-4 animate-pulse space-y-3">
      <div className="flex items-center gap-3">
        <div className="h-3.5 w-12 rounded bg-muted shrink-0" />
        <div className="flex-1 h-3.5 bg-muted rounded" />
        <div className="h-5 w-16 rounded-full bg-muted shrink-0" />
      </div>
      <div className="flex gap-2">
        <div className="h-7 w-24 rounded-lg bg-muted" />
        <div className="h-7 w-20 rounded-lg bg-muted" />
        <div className="h-7 w-20 rounded-lg bg-muted" />
      </div>
    </div>
  )
}

export function ChecklistList() {
  const { data: profile } = useHealthProfile()

  const {
    data: checklists,
    isLoading: checklistLoading,
    isError: checklistError,
  } = useChecklist(profile?.id)

  const checklist = checklists?.[0]

  const { data: items, isLoading: itemsLoading } = useChecklistItems(checklist?.id)
  const { data: report, isLoading: reportLoading } = useChecklistReport(checklist?.id)

  const isLoading = checklistLoading || (!!checklist && (itemsLoading || reportLoading))

  if (checklistError) {
    return (
      <p className="py-12 text-center text-sm text-zels-text-soft">
        Não foi possível carregar o checklist.
      </p>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <ReportSkeleton />
        <div className="space-y-3">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </div>
    )
  }

  if (!checklist) {
    return (
      <p className="py-12 text-center text-sm text-zels-text-soft">
        Nenhum checklist para hoje.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      {report && <ChecklistReportBar report={report} />}

      {!items || items.length === 0 ? (
        <p className="py-8 text-center text-sm text-zels-text-soft">
          Nenhum item no checklist de hoje.
        </p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <ChecklistItemCard key={item.id} item={item} checklistId={checklist.id} />
          ))}
        </div>
      )}
    </div>
  )
}
