import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api/client'

export type VitalReading = {
  value?: number
  systolic?: number
  diastolic?: number
  unit: string
  recordedAt: string
}

export type LatestVitals = {
  blood_pressure?: VitalReading
  heart_rate?: VitalReading
  weight?: VitalReading
  blood_glucose?: VitalReading
}

type VitalsLatestResponse = {
  healthProfileId: string
  vitals: LatestVitals
}

export function useVitalsLatest(healthProfileId: string | undefined) {
  return useQuery({
    queryKey: ['vitals', 'latest', healthProfileId],
    queryFn: () =>
      api.get<VitalsLatestResponse>(
        `/health-records/vitals/latest?healthProfileId=${healthProfileId}`
      ).then(res => res.vitals),
    enabled: !!healthProfileId,
  })
}
