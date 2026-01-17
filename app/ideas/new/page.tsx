'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { apiClient } from '@/lib/api-client'
import { ErrorBanner } from '@/components/ErrorBanner'

export default function NewIdeaPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
  })

  useEffect(() => {
    const checkSession = async () => {
      try {
        const session = await apiClient.auth.session()
        if (!session.user) {
          router.push('/login')
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
      const submission = await apiClient.submissions.create(formData)
      router.push(`/ideas/${submission.id}`)
    } catch (err) {
      setError(err)
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      await apiClient.auth.logout()
      router.push('/login')
    } catch (err) {
      console.error('Logout failed:', err)
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
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-8">
              <Link href="/dashboard" className="text-xl font-bold text-gray-900">
                Innovation Portal
              </Link>
              <div className="hidden md:flex gap-4">
                <Link href="/dashboard" className="text-sm font-medium text-gray-600 hover:text-gray-900">
                  Dashboard
                </Link>
                <Link href="/ideas" className="text-sm font-medium text-gray-900">
                  My Ideas
                </Link>
              </div>
            </div>
            <div className="flex items-center">
              <button
                onClick={handleLogout}
                className="text-sm text-gray-700 hover:text-gray-900"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link href="/ideas" className="text-sm text-blue-600 hover:underline">
            ← Back to My Ideas
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">Submit New Idea</h1>
          </div>

          <div className="p-6">
            {error && (
              <ErrorBanner error={error} onDismiss={() => setError(null)} className="mb-6" />
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  id="title"
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Brief, descriptive title"
                  required
                  minLength={5}
                  maxLength={200}
                  disabled={loading}
                />
                <p className="text-xs text-gray-500 mt-1">5-200 characters</p>
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Describe your idea in detail..."
                  rows={8}
                  required
                  minLength={20}
                  disabled={loading}
                />
                <p className="text-xs text-gray-500 mt-1">Minimum 20 characters</p>
              </div>

              <div className="flex gap-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Submitting...' : 'Submit Idea'}
                </button>
                <Link
                  href="/ideas"
                  className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </Link>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  )
}
