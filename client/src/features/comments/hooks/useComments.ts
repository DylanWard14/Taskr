import { useCallback, useEffect, useState } from 'react'
import { createComment } from '../api/create-comment'
import { deleteComment } from '../api/delete-comment'
import { getComments } from '../api/get-comments'
import type { Comment, CreateCommentInput } from '../types'

export interface UseCommentsResult {
  comments: Comment[]
  loading: boolean
  error: string | null
  addComment: (input: CreateCommentInput) => Promise<void>
  removeComment: (commentId: string) => Promise<void>
  refresh: () => Promise<void>
}

export function useComments(taskId: string): UseCommentsResult {
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getComments(taskId)
      setComments(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load comments')
    } finally {
      setLoading(false)
    }
  }, [taskId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const addComment = useCallback(
    async (input: CreateCommentInput) => {
      const comment = await createComment(taskId, input)
      setComments((prev) => [...prev, comment])
    },
    [taskId]
  )

  const removeComment = useCallback(async (commentId: string) => {
    await deleteComment(taskId, commentId)
    setComments((prev) => prev.filter((comment) => comment.id !== commentId))
  }, [taskId])

  return { comments, loading, error, addComment, removeComment, refresh }
}
