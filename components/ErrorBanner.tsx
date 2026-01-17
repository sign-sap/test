import React from 'react'
import { ApiClientError } from '@/lib/api-client'

interface ErrorBannerProps {
  error: unknown
  onDismiss?: () => void
  className?: string
}

export function ErrorBanner({ error, onDismiss, className = '' }: ErrorBannerProps) {
  if (!error) return null

  let message = 'An unexpected error occurred'
  let colorClasses = 'bg-red-50 border-red-200 text-red-800'
  
  if (error instanceof ApiClientError) {
    message = error.message
    
    if (error.status === 401 || error.status === 403) {
      colorClasses = 'bg-yellow-50 border-yellow-200 text-yellow-800'
    } else if (error.status === 429) {
      colorClasses = 'bg-orange-50 border-orange-200 text-orange-800'
    }
  } else if (error instanceof Error) {
    message = error.message
  }

  return (
    <div
      role="alert"
      className={`border rounded-lg p-4 ${colorClasses} ${className}`}
    >
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium">{message}</p>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="ml-4 text-current opacity-70 hover:opacity-100"
            aria-label="Dismiss"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}
