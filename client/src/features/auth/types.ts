export interface User {
  id: string
  email: string
  name: string
}

export interface AuthSession {
  token: string
  user: User
}
