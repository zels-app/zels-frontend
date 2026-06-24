import { useQuery } from '@tanstack/react-query'

export function useExamFileUrl(examId: string, enabled: boolean) {
  return useQuery({
    queryKey: ['exam', 'file', examId],
    queryFn: async (): Promise<{ fileUrl: string } | null> => {
      const res = await fetch(`/api/proxy/exams/file/${examId}`, {
        credentials: 'include',
      })
      if (res.status === 404) return null
      if (!res.ok) return null
      return { fileUrl: `/api/proxy/exams/file/${examId}` }
    },
    enabled,
    staleTime: 5 * 60 * 1000,
  })
}
