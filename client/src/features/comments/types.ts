export interface Comment {
  id: string
  taskId: string
  authorId: string
  body: string
  createdAt: string
}

export interface CreateCommentInput {
  body: string
  mediaIds?: string[]
}
