import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api, ApiError } from '@/lib/api/client'

export type LogStatus = 'TAKEN' | 'MISSED' | 'SKIPPED'

export type MedicationLog = {
  id: string
  medicationId: string
  status: LogStatus
  scheduledAt: string
  confirmedAt?: string
  notes?: string
}

export function useMedicationLogs(medicationId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ['medication-logs', medicationId],
    queryFn: () => api.get<MedicationLog[]>(`/medications/${medicationId}/logs`),
    enabled: enabled && !!medicationId,
  })
}

export function useCreateMedicationLog(medicationId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: { scheduledAt: string; status: LogStatus; notes?: string }) =>
      api.post<MedicationLog>(`/medications/${medicationId}/logs`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medication-logs', medicationId] })
      queryClient.invalidateQueries({ queryKey: ['medications', 'today'] })
      queryClient.invalidateQueries({ queryKey: ['alerts', 'active'] })
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
