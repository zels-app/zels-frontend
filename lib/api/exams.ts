'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

// ─── Types ────────────────────────────────────────────────────────────────────

export type Biomarker = {
  name: string
  value: number
  unit: string
  referenceRange?: string
  status: 'normal' | 'alto' | 'baixo' | 'atenção'
}

export type ExamExtractedData = {
  biomarkers: Biomarker[]
  extractedAt: string
}

export type Exam = {
  id: string
  healthProfileId: string
  type: string
  fileUrl: string | null
  examDate: string
  extractedData: ExamExtractedData | null
  notes: string | null
  createdAt: string
}

export type ExamFilters = {
  from?: string
  to?: string
  type?: string
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useExams(healthProfileId?: string, filters: ExamFilters = {}) {
  return useQuery({
    queryKey: ['exams', healthProfileId, filters],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filters.from) params.set('from', filters.from)
      if (filters.to)   params.set('to', filters.to)
      if (filters.type) params.set('type', filters.type)
      const query = params.toString()
      const res = await fetch(
        `/api/proxy/exams/${healthProfileId}${query ? `?${query}` : ''}`
      )
      if (!res.ok) throw new Error('Erro ao carregar exames')
      const data = await res.json()
      return (Array.isArray(data) ? data : (data.data ?? [])) as Exam[]
    },
    enabled: !!healthProfileId,
  })
}

export function useCreateExam() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: {
      healthProfileId: string
      type: string
      examDate: string
      notes?: string
    }) => {
      const res = await fetch('/api/proxy/exams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error('Erro ao criar exame')
      return res.json() as Promise<Exam>
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['exams', data.healthProfileId] })
    },
  })
}

export function useUpdateExam() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: {
      id: string
      type?: string
      examDate?: string
      notes?: string
      extractedData?: ExamExtractedData
    }) => {
      const { id, ...rest } = body
      const res = await fetch(`/api/proxy/exams/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rest),
      })
      if (!res.ok) throw new Error('Erro ao atualizar exame')
      return res.json() as Promise<Exam>
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exams'] })
    },
  })
}

export function useDeleteExam() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/proxy/exams/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Erro ao excluir exame')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exams'] })
    },
  })
}

export function useExtractExamBiomarkers() {
  return useMutation({
    mutationFn: async (examId: string) => {
      const res = await fetch(`/api/proxy/exams/${examId}/extract`, {
        method: 'POST',
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { message?: string }
        throw new Error(err.message ?? 'Erro ao extrair biomarcadores')
      }
      return res.json() as Promise<ExamExtractedData>
    },
  })
}
