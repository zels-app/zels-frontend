import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '@/lib/api/client'

export type ConditionStatus = 'INVESTIGATING' | 'ACTIVE' | 'CONTROLLED' | 'RESOLVED' | 'CHRONIC'

export type Condition = {
  id: string
  healthProfileId: string
  name: string
  status: ConditionStatus
  startDate: string | null
  diagnosisDate: string | null
  endDate: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
  approvalStatus?: 'PENDING' | 'APPROVED' | 'REJECTED'
}

export type Treatment = {
  id: string
  conditionId: string
  description: string
  startDate: string
  endDate: string | null
  notes: string | null
  createdAt: string
  approvalStatus?: 'PENDING' | 'APPROVED' | 'REJECTED'
}

export function useConditions(healthProfileId: string | undefined) {
  return useQuery({
    queryKey: ['conditions', healthProfileId],
    queryFn: () => api.get<Condition[]>(`/conditions/${healthProfileId}`),
    enabled: !!healthProfileId,
  })
}

export function useCreateCondition() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: {
      healthProfileId: string
      name: string
      status: ConditionStatus
      diagnosisDate?: string
      notes?: string
    }) => api.post<Condition>('/conditions', body),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['conditions'] })
      if (data.approvalStatus === 'PENDING') {
        toast.info('Condição enviada para aprovação')
      } else {
        toast.success('Condição cadastrada com sucesso')
      }
    },
    onError: () => {
      toast.error("Erro ao adicionar condição")
    },
  })
}

export function usePatchCondition() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: ConditionStatus }) =>
      api.patch<Condition>(`/conditions/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conditions'] })
      toast.success("Status atualizado")
    },
    onError: () => {
      toast.error("Erro ao atualizar status")
    },
  })
}

export function useConditionTreatments(conditionId: string, enabled: boolean) {
  return useQuery({
    queryKey: ['treatments', conditionId],
    queryFn: () => api.get<Treatment[]>(`/conditions/${conditionId}/treatments`),
    enabled,
  })
}

export function useUpdateCondition() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }: {
      id: string
      name?: string
      status?: ConditionStatus
      diagnosisDate?: string
      notes?: string
    }) => api.patch<Condition>(`/conditions/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conditions'] })
      toast.success("Condição atualizada")
    },
    onError: () => {
      toast.error("Erro ao atualizar condição")
    },
  })
}

export function useDeleteCondition() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/conditions/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conditions'] })
      toast.success("Condição removida")
    },
    onError: () => {
      toast.error("Erro ao remover condição")
    },
  })
}

export function useDeleteTreatment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ conditionId, id }: { conditionId: string; id: string }) =>
      api.delete<void>(`/conditions/${conditionId}/treatments/${id}`),
    onSuccess: (_data, { conditionId }) => {
      queryClient.invalidateQueries({ queryKey: ['treatments', conditionId] })
      toast.success("Tratamento removido")
    },
    onError: () => {
      toast.error("Erro ao remover tratamento")
    },
  })
}

export function useCreateTreatment(conditionId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: {
      description: string
      startDate: string
      endDate?: string
      notes?: string
    }) => api.post<Treatment>(`/conditions/${conditionId}/treatments`, body),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['treatments', conditionId] })
      if (data.approvalStatus === 'PENDING') {
        toast.info('Tratamento enviado para aprovação')
      } else {
        toast.success('Tratamento adicionado com sucesso')
      }
    },
    onError: () => {
      toast.error("Erro ao adicionar tratamento")
    },
  })
}
