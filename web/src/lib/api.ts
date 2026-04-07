import axios, { type AxiosError, type AxiosInstance } from 'axios'
import { isMockAuthMode } from '@/config/runtime'
import { getCookie } from '@/lib/cookies'
import { ACCESS_TOKEN_COOKIE } from '@/stores/auth-store'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

function getStoredAccessToken() {
  const cookieValue = getCookie(ACCESS_TOKEN_COOKIE)
  if (!cookieValue) return ''

  try {
    const parsed = JSON.parse(cookieValue)
    return typeof parsed === 'string' ? parsed : ''
  } catch {
    return cookieValue
  }
}

// Create axios instance
export const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
})

api.interceptors.request.use((config) => {
  const token = getStoredAccessToken()

  if (token && !isMockAuthMode) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    return Promise.reject(error)
  }
)

// Hook to get authenticated API client
export function useApi() {
  return api
}

// Generic API request wrappers
export async function get<T>(url: string, params?: Record<string, unknown>) {
  const response = await api.get<T>(url, { params })
  return response.data
}

export async function post<T>(url: string, data?: unknown) {
  const response = await api.post<T>(url, data)
  return response.data
}

export async function put<T>(url: string, data?: unknown) {
  const response = await api.put<T>(url, data)
  return response.data
}

export async function patch<T>(url: string, data?: unknown) {
  const response = await api.patch<T>(url, data)
  return response.data
}

export async function del<T>(url: string) {
  const response = await api.delete<T>(url)
  return response.data
}
