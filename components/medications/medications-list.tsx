'use client'

import { useHealthProfile } from '@/lib/api/health-profile'
import { useMedications } from '@/lib/api/medications'
import { MedicationCard } from './medication-card'

function CardSkeleton() {
  return (
    <div className="rounded-xl bg-card shadow-sm ring-1 ring-black/5 p-4 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-muted shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-3.5 bg-muted rounded w-2/5" />
          <div className="h-3 bg-muted rounded w-1/3" />
        </div>
      </div>
    </div>
  )
}

export function MedicationsList() {
  const { data: profile } = useHealthProfile()
  const { data: medications, isLoading, isError } = useMedications(profile?.id)

  if (isLoading) {
    return (
      <div className="space-y-3">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    )
  }

  if (isError) {
    return (
      <p className="py-12 text-center text-sm text-zels-text-soft">
        Não foi possível carregar os medicamentos.
      </p>
    )
  }

  if (!medications || medications.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-zels-text-soft">
        Nenhum medicamento ativo encontrado.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {medications.map((med) => (
        <MedicationCard key={med.id} med={med} />
      ))}
    </div>
  )
}
