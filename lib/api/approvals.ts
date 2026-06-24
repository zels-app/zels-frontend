import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api/client'

export type PendingItem = {
  id: string
  createdAt: string
}

export type PendingMedication = PendingItem & {
  name: string
  dosage: string
}

export type PendingCondition = PendingItem & {
  name: string
  status: string
}

export type PendingTreatment = PendingItem & {
  description: string
  startDate: string
  condition: {
    id: string
    name: string
  }
}

export type PendingApprovals = {
  total: number
  medications: PendingMedication[]
  conditions: PendingCondition[]
  treatments: PendingTreatment[]
}

export type ReviewDecision = {
  decision: 'approve' | 'reject'
  rejectionReason?: string
}

export function usePendingApprovals(healthProfileId: string | undefined) {
  return useQuery({
    queryKey: ['approvals', 'pending', healthProfileId],
    queryFn: () => api.get<PendingApprovals>(`/approvals/pending/${healthProfileId}`),
    enabled: !!healthProfileId,
  })
}

export function useReviewMedication() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: ReviewDecision }) =>
      api.patch(`/approvals/medications/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvals', 'pending'] })
      queryClient.invalidateQueries({ queryKey: ['medications'] })
    },
  })
}

export function useReviewCondition() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: ReviewDecision }) =>
      api.patch(`/approvals/conditions/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvals', 'pending'] })
      queryClient.invalidateQueries({ queryKey: ['conditions'] })
    },
  })
}

export function useReviewTreatment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: ReviewDecision }) =>
      api.patch(`/approvals/treatments/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvals', 'pending'] })
      queryClient.invalidateQueries({ queryKey: ['conditions'] })
    },
  })
}
