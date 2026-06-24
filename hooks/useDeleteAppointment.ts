import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '@/lib/api/client'

export function useDeleteAppointment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/appointments/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments', 'list'] })
      queryClient.invalidateQueries({ queryKey: ['appointments', 'upcoming'] })
      queryClient.invalidateQueries({ queryKey: ['exams'] })
      toast.success('Compromisso removido')
    },
    onError: () => {
      toast.error('Erro ao remover compromisso')
    },
  })
}
