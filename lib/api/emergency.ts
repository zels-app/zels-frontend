import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api/client'

export type EmergencyMedication = {
  name: string
  dosage: string
  schedule: string[]
}

export type EmergencyCondition = {
  name: string
  status: string
}

export type EmergencyVital = {
  type: string
  data: {
    type: string
    systolic?: number
    diastolic?: number
    value?: number
    unit?: string
  }
  recordedAt: string
}

export type EmergencyEvent = {
  type: string
  summary: string | Record<string, unknown>
  recordedAt: string
}

export type EmergencyData = {
  patient: {
    name: string
    age: number
    bloodType: string
    emergencyNotes?: string
  }
  medications: EmergencyMedication[]
  conditions: EmergencyCondition[]
  recentVitals: EmergencyVital[]
  recentEvents: EmergencyEvent[]
  generatedAt: string
}

export function useEmergency(healthProfileId: string | undefined) {
  return useQuery({
    queryKey: ['emergency', healthProfileId],
    queryFn: () => api.get<EmergencyData>(`/emergency/${healthProfileId}`),
    enabled: !!healthProfileId,
    staleTime: 0,
  })
}
