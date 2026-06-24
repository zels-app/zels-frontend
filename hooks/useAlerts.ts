import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api/client'

export type AlertLevel = 'urgent' | 'warning' | 'info'

export type Alert = {
  id?: string
  level: AlertLevel
  title: string
  detail: string
  when: string
  relatedType?: string
}

type AlertsResponse = {
  healthProfileId: string
  generatedAt: string
  alerts: Alert[]
}

export function useAlerts(healthProfileId: string | undefined) {
  return useQuery({
    queryKey: ['alerts', 'active', healthProfileId],
    queryFn: () =>
      api.get<AlertsResponse>(`/medications/alerts?healthProfileId=${healthProfileId}`),
    enabled: !!healthProfileId,
    select: (res) => Array.isArray(res) ? res : res.alerts ?? [],
  })
}
