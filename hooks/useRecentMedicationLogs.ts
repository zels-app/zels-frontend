import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api/client'

export type RecentLog = {
  id: string
  medicationId: string
  medicationName: string
  dosage: string
  status: 'TAKEN' | 'MISSED' | 'SKIPPED'
  scheduledAt: string
  confirmedAt?: string
  isActive: boolean
}

type RecentLogsResponse = RecentLog[] | { logs?: RecentLog[]; data?: RecentLog[] }

export function useRecentMedicationLogs(healthProfileId: string | undefined) {
  return useQuery({
    queryKey: ['medications', 'logs', 'recent', healthProfileId],
    queryFn: () =>
      api
        .get<RecentLogsResponse>(
          `/medications/logs/recent?healthProfileId=${healthProfileId}&limit=10`
        )
        .then((res) => (Array.isArray(res) ? res : (res.logs ?? res.data ?? []))),
    enabled: !!healthProfileId,
    staleTime: 30 * 1000,
  })
}
