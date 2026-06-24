import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '@/lib/api/client'
import type { Appointment, AppointmentKind } from './useAppointmentsUpcoming'

export type CreateAppointmentInput = {
  healthProfileId: string
  kind: AppointmentKind
  title: string
  scheduledAt: string
  professional?: string
  location?: string
  durationMinutes?: number
  notes?: string
}

export function useCreateAppointment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateAppointmentInput) =>
      api.post<Appointment>('/appointments', input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments', 'list'] })
      queryClient.invalidateQueries({ queryKey: ['appointments', 'upcoming'] })
      queryClient.invalidateQueries({ queryKey: ['exams'] })
      toast.success('Compromisso adicionado')
    },
    onError: () => {
      toast.error('Erro ao adicionar compromisso')
    },
  })
}
