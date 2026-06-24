import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api/client'

export type DoseSummary = {
  total: number
  taken: number
  late: number
  pending: number
}

export type Dose = {
  id?: string
  logId?: string
  medicationId: string
  name?: string
  medicationName?: string
  dosage: string
  scheduledAt?: string
  scheduledTime?: string
  takenAt?: string
  status: string
}

export type MedicationsTodayResponse = {
  summary: DoseSummary
  doses: Dose[]
}

export function useMedicationsToday(healthProfileId: string | undefined) {
  return useQuery({
    queryKey: ['medications', 'today', healthProfileId],
    queryFn: () =>
      api.get<MedicationsTodayResponse>(
        `/medications/today?healthProfileId=${healthProfileId}`
      ),
    enabled: !!healthProfileId,
  })
}
