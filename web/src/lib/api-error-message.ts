import { AxiosError } from 'axios'

type ValidationIssue = {
  path?: string
  message?: string
}

type ErrorPayload = {
  message?: string
  error?: string | ValidationIssue[]
  title?: string
}

export function getApiErrorMessage(error: unknown, fallback = 'Something went wrong') {
  if (error instanceof AxiosError) {
    const payload = error.response?.data as ErrorPayload | undefined

    if (Array.isArray(payload?.error) && payload.error.length) {
      return payload.error.map((item) => item.message || item.path).filter(Boolean).join(', ')
    }

    if (typeof payload?.error === 'string' && payload.error) {
      return payload.error
    }

    if (payload?.message) {
      return payload.message
    }

    if (payload?.title) {
      return payload.title
    }
  }

  if (error instanceof Error && error.message) {
    return error.message
  }

  return fallback
}
