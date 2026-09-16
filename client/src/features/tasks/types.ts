export type TaskStatus = 'todo' | 'in-progress' | 'done'
export type TaskPriority = 'low' | 'medium' | 'high'

// Matches the raw snake_case DB columns returned by the server's
// TaskRecord (server/src/modules/tasks/repository.ts) — the API response
// shape is NOT the same as the request body shape below, mirroring the
// asymmetry already established by features/teams/types.ts's TeamMember.
export interface Task {
  id: string
  team_id: string
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  assignee_id: string | null
  created_by: string | null
  due_date: string | null
  created_at: string
  updated_at: string
}

// Matches server/src/modules/tasks/schema.ts's createTaskSchema (camelCase
// request body). assigneeId/dueDate are omittable but not nullable here —
// clearing them is only meaningful on update.
export interface CreateTaskInput {
  title: string
  description?: string
  assigneeId?: string
  dueDate?: string
  priority?: TaskPriority
  status?: TaskStatus
}

// Matches updateTaskSchema — all fields optional, and assigneeId/dueDate may
// be explicit `null` to clear them.
export interface UpdateTaskInput {
  title?: string
  description?: string
  assigneeId?: string | null
  dueDate?: string | null
  priority?: TaskPriority
  status?: TaskStatus
}
