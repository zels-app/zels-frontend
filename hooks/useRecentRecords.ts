import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api/client'

export type RecentRecord = {
  id: string
  type: string
  data: Record<string, unknown>
  createdAt: string
  recordedBy?: string
}

export function useRecentRecords(healthProfileId: string | undefined) {
  return useQuery({
    queryKey: ['health-records', 'recent', healthProfileId],
    queryFn: async () => {
      const res = await api.get<unknown>(`/health-records/${healthProfileId}?limit=4`)
      if (Array.isArray(res)) return res as RecentRecord[]
      const r = res as { records?: RecentRecord[]; data?: RecentRecord[] }
      return r.records ?? r.data ?? []
    },
    enabled: !!healthProfileId,
  })
}
