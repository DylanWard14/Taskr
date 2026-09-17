import { useMutation, useQueryClient } from '@tanstack/react-query'
import { uploadMedia } from '../api/upload-media'
import { mediaKeys } from './query-keys'
import type { MediaTarget } from '../types'

export function useUploadMedia(target: MediaTarget) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (file: File) => uploadMedia({ ...target, file }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mediaKeys.list(target) })
    },
  })
}
