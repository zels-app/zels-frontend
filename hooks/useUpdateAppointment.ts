import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '@/lib/api/client'
import type { Appointment, AppointmentKind } from './useAppointmentsUpcoming'

export type UpdateAppointmentInput = {
  id: string
  kind?: AppointmentKind
  title?: string
  scheduledAt?: string
  professional?: string
  location?: string
  durationMinutes?: number
  notes?: string
}

export function useUpdateAppointment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }: UpdateAppointmentInput) =>
      api.patch<Appointment>(`/appointments/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments', 'list'] })
      queryClient.invalidateQueries({ queryKey: ['appointments', 'upcoming'] })
      queryClient.invalidateQueries({ queryKey: ['exams'] })
      toast.success('Compromisso atualizado')
    },
    onError: () => {
      toast.error('Erro ao atualizar compromisso')
    },
  })
}
