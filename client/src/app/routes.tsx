import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { Layout } from './Layout'
import { LoginForm } from '../features/auth/components/LoginForm'

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <div>Sign in to see your teams</div> },
      { path: 'login', element: <LoginForm /> },
    ],
  },
])

export function AppRoutes() {
  return <RouterProvider router={router} />
}
