import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '@/lib/api/client'
import type { Appointment, AppointmentStatus } from './useAppointmentsUpcoming'

export function useUpdateAppointmentStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: AppointmentStatus }) =>
      api.patch<Appointment>(`/appointments/${id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments', 'list'] })
      queryClient.invalidateQueries({ queryKey: ['appointments', 'upcoming'] })
      toast.success('Status atualizado')
    },
    onError: () => {
      toast.error('Erro ao atualizar status')
    },
  })
}
