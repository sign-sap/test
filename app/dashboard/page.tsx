'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { apiClient } from '@/lib/api-client'
import { ErrorBanner } from '@/components/ErrorBanner'
import { StatusChip } from '@/components/StatusChip'

interface User {
  id: string
  email: string
  name: string | null
  profileCompleted: boolean
}

interface Submission {
  id: string
  title: string
  status: string
  createdAt: string
}

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)

  useEffect(() => {
    const loadData = async () => {
      try {
        const session = await apiClient.auth.session()
        if (!session.user) {
          router.push('/login')
          return
        }
        setUser(session.user)

        const subs = await apiClient.submissions.list()
        setSubmissions(subs)
      } catch (err) {
        setError(err)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [router])

  const handleLogout = async () => {
    try {
      await apiClient.auth.logout()
      router.push('/login')
    } catch (err) {
      console.error('Logout failed:', err)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    )
  }

  const total = submissions.length
  const underReview = submissions.filter((s) => s.status === 'UNDER_REVIEW').length
  const needInfo = submissions.filter((s) => s.status === 'NEED_INFO').length
  const approved = submissions.filter((s) => s.status === 'APPROVED').length
  const latest = submissions.slice(0, 5)

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
                <Link href="/dashboard" className="text-sm font-medium text-gray-900">
                  Dashboard
                </Link>
                <Link href="/ideas" className="text-sm font-medium text-gray-600 hover:text-gray-900">
                  My Ideas
                </Link>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">{user?.email}</span>
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <ErrorBanner error={error} onDismiss={() => setError(null)} className="mb-6" />
        )}

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-2 text-gray-600">Welcome back, {user?.name || user?.email}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-2xl font-bold text-gray-900">{total}</div>
            <div className="text-sm text-gray-600">Total Ideas</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-2xl font-bold text-orange-600">{underReview}</div>
            <div className="text-sm text-gray-600">Under Review</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-2xl font-bold text-yellow-600">{needInfo}</div>
            <div className="text-sm text-gray-600">Need Info</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-2xl font-bold text-green-600">{approved}</div>
            <div className="text-sm text-gray-600">Approved</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">Latest Ideas</h2>
            <Link
              href="/ideas/new"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
            >
              Submit New Idea
            </Link>
          </div>
          {latest.length === 0 ? (
            <div className="px-6 py-12 text-center text-gray-500">
              No ideas yet. Start by submitting your first idea!
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {latest.map((sub) => (
                <Link
                  key={sub.id}
                  href={`/ideas/${sub.id}`}
                  className="block px-6 py-4 hover:bg-gray-50"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-gray-900">{sub.title}</h3>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(sub.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <StatusChip status={sub.status} size="sm" />
                  </div>
                </Link>
              ))}
            </div>
          )}
          {latest.length > 0 && (
            <div className="px-6 py-4 border-t border-gray-200">
              <Link href="/ideas" className="text-sm text-blue-600 hover:underline">
                View all ideas →
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
