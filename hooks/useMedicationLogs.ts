import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api/client'

export type MedicationLogStatus = 'TAKEN' | 'MISSED' | 'SKIPPED'

export type MedicationLog = {
  id: string
  medicationId: string
  status: MedicationLogStatus
  scheduledAt: string
  confirmedAt?: string
  notes?: string
}

export function useMedicationLogs(
  medicationId: string | undefined,
  params: { from?: string; to?: string } = {},
  enabled = true
) {
  const qs = new URLSearchParams()
  if (params.from) qs.set('from', params.from)
  if (params.to) qs.set('to', params.to)
  const query = qs.toString()

  return useQuery({
    queryKey: ['medications', 'logs', medicationId, params.from, params.to],
    queryFn: () =>
      api.get<MedicationLog[]>(
        `/medications/${medicationId}/logs${query ? `?${query}` : ''}`
      ),
    enabled: enabled && !!medicationId,
  })
}
