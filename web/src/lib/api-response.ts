export type ApiEnvelope<T> = {
  success: boolean
  data?: T
  message?: string
  error?: string
  total?: number
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export function unwrapApiData<T>(payload: ApiEnvelope<T>): T {
  if (!payload.success || payload.data === undefined) {
    throw new Error(payload.error || payload.message || 'Request failed')
  }

  return payload.data
}

