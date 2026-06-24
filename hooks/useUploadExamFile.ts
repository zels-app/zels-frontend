import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { type Exam } from '@/lib/api/exams'
import { ApiError } from '@/lib/api/client'

interface UploadArgs {
  examId: string
  file: File
  healthProfileId: string
}

export function useUploadExamFile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ examId, file }: UploadArgs): Promise<Exam> => {
      const form = new FormData()
      form.append('file', file)

      const res = await fetch(`/api/proxy/exams/${examId}/upload`, {
        method: 'POST',
        credentials: 'include',
        body: form,
        // Content-Type omitido — o browser define multipart/form-data com o boundary correto
      })

      if (!res.ok) {
        const errorBody = await res.json().catch(() => ({ message: res.statusText }))
        throw new ApiError(res.status, errorBody.message ?? res.statusText)
      }

      return res.json() as Promise<Exam>
    },
    onSuccess: (_data, { healthProfileId }) => {
      queryClient.invalidateQueries({ queryKey: ['exams', healthProfileId] })
      toast.success('Arquivo anexado com sucesso')
    },
    onError: () => {
      toast.error('Erro ao anexar arquivo. Tente novamente.')
    },
  })
}
