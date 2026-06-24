import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api/client'
import type { AccessControl } from './useAccessControl'

type CreateAccessBody = {
  healthProfileId: string
  userId: string
  roleInProfile: 'CURATOR' | 'FAMILY' | 'CAREGIVER'
  canView: boolean
  canRegister: boolean
}

export function useCreateAccess(healthProfileId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateAccessBody) =>
      api.post<AccessControl>('/access-control', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['access-control', healthProfileId] })
    },
  })
}
