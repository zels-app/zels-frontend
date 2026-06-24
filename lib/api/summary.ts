import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api/client'

export type SummaryPeriod = '7d' | '30d' | '90d'

export type HealthSummary = {
  period: SummaryPeriod
  generatedAt: string
  patientName: string
  summaryText: string
  highlights: string[]
  stats: {
    totalRecords: number
    recordsByType: Partial<Record<'VITAL' | 'SYMPTOM' | 'DIARY' | 'EXAM' | 'EVENT', number>>
    activeMedications: number
    activeConditions: number
  }
}

export function useSummary(healthProfileId: string | undefined, period: SummaryPeriod = '7d') {
  return useQuery({
    queryKey: ['summary', healthProfileId, period],
    queryFn: () =>
      api.get<HealthSummary>(`/summary/${healthProfileId}?period=${period}`),
    enabled: !!healthProfileId,
    staleTime: 10 * 60 * 1000,
  })
}
