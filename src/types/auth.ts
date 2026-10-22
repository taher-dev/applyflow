export interface User {
  id: string
  name: string
  email: string
}

export interface AuthResponse {
  user: User
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterCredentials {
  name: string
  email: string
  password: string
}

export interface ApiErrorResponse {
  error: string
  message: string
  details?: Record<string, string[]>
}
