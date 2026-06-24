import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api/client'

export type Medication = {
  id: string
  healthProfileId: string
  name: string
  dosage: string
  instructions?: string
  frequency: 'DAILY' | 'WEEKLY' | 'CUSTOM'
  schedule: string[]
  startDate: string
  endDate?: string
  isActive: boolean
}

type MedicationsResponse = Medication[] | { data: Medication[] }

export function useMedications(healthProfileId: string | undefined) {
  return useQuery({
    queryKey: ['medications', healthProfileId, 'active'],
    queryFn: async () => {
      const res = await api.get<MedicationsResponse>(
        `/medications/${healthProfileId}?isActive=true`
      )
      return Array.isArray(res) ? res : res.data
    },
    enabled: !!healthProfileId,
  })
}
