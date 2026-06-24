import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api, ApiError } from '@/lib/api/client'

type LogDoseVars = {
  medicationId: string
  scheduledAt: string
  status: 'TAKEN' | 'MISSED' | 'SKIPPED'
  confirmedAt?: string
  notes?: string
}

// TODO: unificar com lib/api/medication-logs.ts useCreateMedicationLog
export function useLogDose(healthProfileId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ medicationId, ...body }: LogDoseVars) =>
      api.post(`/medications/${medicationId}/logs`, body),
    onSuccess: (_, { medicationId }) => {
      queryClient.invalidateQueries({ queryKey: ['medications', 'today', healthProfileId] })
      queryClient.invalidateQueries({ queryKey: ['medication-logs', medicationId] })
      queryClient.invalidateQueries({ queryKey: ['alerts', 'active', healthProfileId] })
      queryClient.invalidateQueries({ queryKey: ['medications', 'logs'] })
      toast.success('Dose registrada com sucesso.')
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status === 409) {
        toast.error('Esta dose já foi registrada. Use "Alterar" para mudar o status.')
      } else {
        toast.error('Não foi possível registrar a dose. Tente novamente.')
      }
    },
  })
}
