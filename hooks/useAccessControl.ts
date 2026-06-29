import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api/client'

export type AccessControl = {
  id: string
  healthProfileId: string
  userId: string
  roleInProfile: 'CURATOR' | 'FAMILY' | 'CAREGIVER'
  canView: boolean
  canRegister: boolean
  createdAt: string
  user: {
    id: string
    name: string
    displayName?: string | null
    email: string
    role: string
  }
}

export function useAccessControl(healthProfileId: string | undefined) {
  return useQuery({
    queryKey: ['access-control', healthProfileId],
    queryFn: async () => {
      const res = await api.get<
        AccessControl[] | { members?: AccessControl[]; data?: AccessControl[] }
      >(`/access-control/${healthProfileId}`)
      if (Array.isArray(res)) return res
      const r = res as { members?: AccessControl[]; data?: AccessControl[] }
      return r.members ?? r.data ?? []
    },
    enabled: !!healthProfileId,
  })
}
