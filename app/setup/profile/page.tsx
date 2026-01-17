'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { apiClient } from '@/lib/api-client'
import { ErrorBanner } from '@/components/ErrorBanner'

export default function SetupProfilePage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [error, setError] = useState<unknown>(null)

  useEffect(() => {
    const checkSession = async () => {
      try {
        const session = await apiClient.auth.session()
        if (!session.user) {
          router.push('/login')
          return
        }
        if (session.user.profileCompleted) {
          router.push('/dashboard')
          return
        }
        setChecking(false)
      } catch (err) {
        router.push('/login')
      }
    }

    checkSession()
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      await apiClient.auth.completeProfile(name)
      router.push('/dashboard')
    } catch (err) {
      setError(err)
      setLoading(false)
    }
  }

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        <h1 className="text-2xl font-bold text-center mb-2 text-gray-900">
          Complete Your Profile
        </h1>
        <p className="text-sm text-gray-600 text-center mb-6">
          Please provide your name to continue
        </p>

        {error && (
          <ErrorBanner error={error} onDismiss={() => setError(null)} className="mb-4" />
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Full Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="John Doe"
              required
              minLength={2}
              maxLength={100}
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Saving...' : 'Continue'}
          </button>
        </form>
      </div>
    </div>
  )
}
