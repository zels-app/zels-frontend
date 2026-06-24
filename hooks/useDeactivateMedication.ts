import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '@/lib/api/client'

type DeactivateVars = {
  medicationId: string
  healthProfileId: string
}

export function useDeactivateMedication() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ medicationId }: DeactivateVars) =>
      api.patch(`/medications/${medicationId}`, { isActive: false }),
    onSuccess: (_, { healthProfileId }) => {
      queryClient.invalidateQueries({ queryKey: ['medications', 'list', healthProfileId] })
      queryClient.invalidateQueries({ queryKey: ['medications', 'today'] })
      queryClient.invalidateQueries({ queryKey: ['alerts', 'active'] })
      toast.success('Medicamento desativado.')
    },
    onError: () => {
      toast.error('Não foi possível desativar o medicamento.')
    },
  })
}
