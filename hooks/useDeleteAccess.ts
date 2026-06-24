import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api/client'

export function useDeleteAccess(healthProfileId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/access-control/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['access-control', healthProfileId] })
    },
  })
}
