import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api/client'

export type AppointmentKind = 'CONSULTATION' | 'EXAM' | 'THERAPY' | 'VACCINE' | 'OTHER'
export type AppointmentStatus = 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'MISSED'

export type Appointment = {
  id: string
  kind: AppointmentKind
  status: AppointmentStatus
  title: string
  professional?: string
  scheduledAt: string
  location?: string
  notes?: string
  durationMinutes?: number
  healthProfileId: string
}

export function useAppointmentsUpcoming(healthProfileId: string | undefined) {
  return useQuery({
    queryKey: ['appointments', 'upcoming', healthProfileId],
    queryFn: async () => {
      const params = new URLSearchParams()
      params.append('healthProfileId', healthProfileId!)
      params.append('limit', '5')

      const res = await api.get<Appointment[] | { appointments?: Appointment[]; data?: Appointment[] }>(
        `/appointments/upcoming?${params}`
      )
      if (Array.isArray(res)) return res
      const r = res as { appointments?: Appointment[]; data?: Appointment[] }
      return r.appointments ?? r.data ?? []
    },
    enabled: !!healthProfileId,
  })
}
