import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api/client'

type UpdateAccessBody = {
  canView?: boolean
  canRegister?: boolean
}

export function useUpdateAccess(healthProfileId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateAccessBody }) =>
      api.patch(`/access-control/${id}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['access-control', healthProfileId] })
    },
  })
}
