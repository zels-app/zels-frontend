'use client'

import { Pill, Clock } from 'lucide-react'
import { useHealthProfile } from '@/lib/api/health-profile'
import { useMedications, type Medication } from '@/lib/api/medications'

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-border last:border-0 animate-pulse">
      <div className="h-9 w-9 rounded-lg bg-muted shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3.5 bg-muted rounded w-2/5" />
        <div className="h-3 bg-muted rounded w-1/4" />
      </div>
      <div className="h-3 bg-muted rounded w-10" />
    </div>
  )
}

function MedicationRow({ med }: { med: Medication }) {
  const now = new Date().toTimeString().slice(0, 5)
  const upcoming = med.schedule.filter((t) => t >= now).sort()[0]
  const displayTime = upcoming ?? med.schedule[0] ?? null

  return (
    <div className="flex items-center gap-3 py-3 border-b border-border last:border-0">
      <div className="h-9 w-9 rounded-lg bg-zels-primary-soft shrink-0 flex items-center justify-center">
        <Pill size={16} className="text-zels-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{med.name}</p>
        <p className="text-xs text-zels-text-soft">{med.dosage}</p>
      </div>
      {displayTime && (
        <div className="flex items-center gap-1 text-zels-text-faint shrink-0">
          <Clock size={11} />
          <span className="font-mono text-xs">{displayTime}</span>
        </div>
      )}
    </div>
  )
}

export function MedicationsWidget() {
  const { data: profile } = useHealthProfile()
  const { data: medications, isLoading, isError } = useMedications(profile?.id)

  return (
    <div className="rounded-xl bg-card shadow-sm ring-1 ring-black/5 p-5 flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-foreground">Medicamentos ativos</h2>
        {medications !== undefined && (
          <span className="font-mono text-xs text-zels-text-faint">{medications.length}</span>
        )}
      </div>

      {isLoading && (
        <>
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </>
      )}

      {isError && (
        <p className="text-sm text-zels-text-soft py-8 text-center">
          Não foi possível carregar.
        </p>
      )}

      {!isLoading && !isError && medications?.length === 0 && (
        <p className="text-sm text-zels-text-soft py-8 text-center">
          Nenhum medicamento ativo.
        </p>
      )}

      {medications && medications.length > 0 &&
        medications.map((med) => <MedicationRow key={med.id} med={med} />)
      }
    </div>
  )
}
