import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { Layout } from './Layout'

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <div>Sign in to see your teams</div> },
    ],
  },
])

export function AppRoutes() {
  return <RouterProvider router={router} />
}
