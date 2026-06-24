import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api/client'
import type { Appointment } from './useAppointmentsUpcoming'

export type AppointmentFilters = {
  from?: string
  to?: string
  kind?: string
  status?: string
}

export function useAppointments(
  healthProfileId: string | undefined,
  filters: AppointmentFilters = {}
) {
  const from = new Date()
  from.setDate(from.getDate() - 30)
  const to = new Date()
  to.setDate(to.getDate() + 60)

  return useQuery({
    queryKey: ['appointments', 'list', healthProfileId, filters],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (healthProfileId) params.append('healthProfileId', healthProfileId)
      if (filters.from) {
        params.append('from', filters.from)
      } else if (!isNaN(from.getTime())) {
        params.append('from', from.toISOString().split('T')[0])
      }
      if (filters.to) {
        params.append('to', filters.to)
      } else if (!isNaN(to.getTime())) {
        params.append('to', to.toISOString().split('T')[0])
      }
      if (filters.kind) params.append('kind', filters.kind)
      if (filters.status) params.append('status', filters.status)

      const res = await api.get<Appointment[] | { appointments?: Appointment[]; data?: Appointment[] }>(
        `/appointments?${params}`
      )
      if (Array.isArray(res)) return res
      const r = res as { appointments?: Appointment[]; data?: Appointment[] }
      return r.appointments ?? r.data ?? []
    },
    enabled: !!healthProfileId,
  })
}
