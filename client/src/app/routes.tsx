import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { Layout } from './Layout'
import { TaskBoard } from '../features/tasks/components/TaskBoard'
import { TaskDetail } from '../features/tasks/components/TaskDetail'

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <div>Sign in to see your teams</div> },
      { path: 'teams/:teamId/tasks', element: <TaskBoard /> },
      { path: 'teams/:teamId/tasks/:taskId', element: <TaskDetail /> },
    ],
  },
])

export function AppRoutes() {
  return <RouterProvider router={router} />
}
