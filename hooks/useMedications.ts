import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '@/lib/api/client'

export type MedicationFrequency = 'DAILY' | 'WEEKLY' | 'CUSTOM'

export type Medication = {
  id: string
  healthProfileId: string
  name: string
  dosage: string
  instructions?: string
  frequency: MedicationFrequency
  schedule: string[]
  startDate: string
  endDate?: string
  isActive: boolean
  approvalStatus?: 'PENDING' | 'APPROVED' | 'REJECTED'
}

type MedicationsResponse = Medication[] | { data: Medication[] }

function unpack(res: MedicationsResponse): Medication[] {
  if (Array.isArray(res)) return res
  return Array.isArray(res.data) ? res.data : []
}

export function useMedications(healthProfileId: string | undefined, isActive = true) {
  return useQuery({
    queryKey: ['medications', 'list', healthProfileId, isActive],
    queryFn: () =>
      api
        .get<MedicationsResponse>(`/medications/${healthProfileId}?isActive=${isActive}`)
        .then(unpack),
    enabled: !!healthProfileId,
  })
}

export type MedicationBody = {
  healthProfileId: string
  name: string
  dosage: string
  instructions?: string
  frequency: MedicationFrequency
  schedule: string[]
  startDate: string
  endDate?: string
}

export function useCreateMedication(healthProfileId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: MedicationBody) => api.post<Medication>('/medications', body),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['medications', 'list', healthProfileId] })
      queryClient.invalidateQueries({ queryKey: ['medications', 'today'] })
      queryClient.invalidateQueries({ queryKey: ['alerts', 'active'] })
      if (data.approvalStatus === 'PENDING') {
        toast.info('Medicamento enviado para aprovação')
      } else {
        toast.success('Medicamento cadastrado com sucesso')
      }
    },
    onError: () => {
      toast.error('Não foi possível cadastrar o medicamento.')
    },
  })
}

export function useUpdateMedication(healthProfileId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }: Partial<MedicationBody> & { id: string }) =>
      api.patch<Medication>(`/medications/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medications', 'list', healthProfileId] })
      queryClient.invalidateQueries({ queryKey: ['medications', 'today'] })
      toast.success('Medicamento atualizado.')
    },
    onError: () => {
      toast.error('Não foi possível atualizar o medicamento.')
    },
  })
}
