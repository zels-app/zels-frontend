import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api/client'

export function useInviteElderly(healthProfileId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (email: string) =>
      api.post(`/health-profile/${healthProfileId}/invite-elderly`, { email }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['health-profile'] })
    },
  })
}
