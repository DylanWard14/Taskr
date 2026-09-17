import { useMutation, useQueryClient } from '@tanstack/react-query'
import { deleteMedia } from '../api/delete-media'
import { mediaKeys } from './query-keys'
import type { MediaTarget } from '../types'

export function useDeleteMedia(target: MediaTarget) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (mediaId: string) => deleteMedia(mediaId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mediaKeys.list(target) })
    },
  })
}
