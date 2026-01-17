class ApiClientError extends Error {
  status: number
  code: string
  details?: any

  constructor(status: number, code: string, message: string, details?: any) {
    super(message)
    this.name = 'ApiClientError'
    this.status = status
    this.code = code
    this.details = details
  }
}

async function fetchApi<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  const data = await response.json()

  if (!response.ok) {
    if (data.error) {
      throw new ApiClientError(
        response.status,
        data.error.code || 'UNKNOWN_ERROR',
        data.error.message || 'An error occurred',
        data.error.details
      )
    }
    throw new ApiClientError(
      response.status,
      'UNKNOWN_ERROR',
      'An error occurred'
    )
  }

  return data.data || data
}

export function getUserFriendlyError(error: unknown): string {
  if (error instanceof ApiClientError) {
    return error.message
  }
  if (error instanceof Error) {
    return error.message
  }
  return 'An unexpected error occurred'
}

export const apiClient = {
  auth: {
    async requestOtp(email: string) {
      return fetchApi('/api/auth/request-otp', {
        method: 'POST',
        body: JSON.stringify({ email }),
      })
    },

    async verifyOtp(email: string, code: string) {
      return fetchApi<{ user: any }>('/api/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({ email, code }),
      })
    },

    async logout() {
      return fetchApi('/api/auth/logout', {
        method: 'POST',
      })
    },

    async session() {
      return fetchApi<{ user: any | null }>('/api/auth/session')
    },

    async completeProfile(name: string) {
      return fetchApi('/api/auth/complete-profile', {
        method: 'POST',
        body: JSON.stringify({ name }),
      })
    },
  },

  submissions: {
    async list() {
      return fetchApi<any[]>('/api/submissions')
    },

    async get(id: string) {
      return fetchApi<any>(`/api/submissions/${id}`)
    },

    async create(data: { title: string; description: string }) {
      return fetchApi<any>('/api/submissions', {
        method: 'POST',
        body: JSON.stringify(data),
      })
    },

    async update(id: string, data: { title?: string; description?: string }) {
      return fetchApi<any>(`/api/submissions/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      })
    },

    async delete(id: string) {
      return fetchApi<any>(`/api/submissions/${id}`, {
        method: 'DELETE',
      })
    },

    async getValidActions(id: string) {
      return fetchApi<{ status: string; validActions: string[] }>(
        `/api/submissions/${id}/transition`
      )
    },

    async transition(
      id: string,
      action: string,
      comment?: string,
      metadata?: any
    ) {
      return fetchApi<{ submission: any; validActions: string[] }>(
        `/api/submissions/${id}/transition`,
        {
          method: 'POST',
          body: JSON.stringify({ action, comment, metadata }),
        }
      )
    },
  },
}

export { ApiClientError }
