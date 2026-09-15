import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { Layout } from './Layout'
import { TeamList } from '../features/teams/components/TeamList'

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <div>Sign in to see your teams</div> },
      { path: 'teams', element: <TeamList /> },
    ],
  },
])

export function AppRoutes() {
  return <RouterProvider router={router} />
}
