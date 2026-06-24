import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '@/lib/api/client'

type UpdateLogVars = {
  medicationId: string
  logId: string
  status: 'TAKEN' | 'MISSED' | 'SKIPPED'
  notes?: string
}

export function useUpdateMedicationLog() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ medicationId, logId, status, notes }: UpdateLogVars) =>
      api.patch(`/medications/${medicationId}/logs/${logId}`, { status, notes }),
    onSuccess: (_, { medicationId }) => {
      queryClient.invalidateQueries({ queryKey: ['medication-logs', medicationId] })
      queryClient.invalidateQueries({ queryKey: ['medications', 'logs'] })
      queryClient.invalidateQueries({ queryKey: ['medications', 'today'] })
      queryClient.invalidateQueries({ queryKey: ['alerts', 'active'] })
      toast.success('Status da dose atualizado.')
    },
    onError: () => {
      toast.error('Não foi possível atualizar a dose.')
    },
  })
}
