import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '@/lib/api/client'

type DeleteLogVars = {
  medicationId: string
  logId: string
}

export function useDeleteMedicationLog() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ medicationId, logId }: DeleteLogVars) =>
      api.delete(`/medications/${medicationId}/logs/${logId}`),
    onSuccess: (_, { medicationId }) => {
      queryClient.invalidateQueries({ queryKey: ['medication-logs', medicationId] })
      queryClient.invalidateQueries({ queryKey: ['medications', 'logs'] })
      queryClient.invalidateQueries({ queryKey: ['medications', 'today'] })
      queryClient.invalidateQueries({ queryKey: ['alerts', 'active'] })
      toast.success('Marcação removida.')
    },
    onError: () => {
      toast.error('Não foi possível remover a marcação.')
    },
  })
}
