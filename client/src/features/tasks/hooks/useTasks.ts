import { useQuery } from '@tanstack/react-query'
import { getTasks } from '../api/get-tasks'
import { tasksKeys } from './query-keys'

export function useTasks(teamId: string) {
  return useQuery({
    queryKey: tasksKeys.list(teamId),
    queryFn: () => getTasks(teamId),
    enabled: Boolean(teamId),
  })
}
