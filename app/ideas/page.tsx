'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { apiClient } from '@/lib/api-client'
import { ErrorBanner } from '@/components/ErrorBanner'
import { StatusChip, getAllStatuses } from '@/components/StatusChip'

interface Submission {
  id: string
  title: string
  description: string
  status: string
  createdAt: string
}

export default function IdeasPage() {
  const router = useRouter()
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [filteredSubmissions, setFilteredSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    const loadData = async () => {
      try {
        const session = await apiClient.auth.session()
        if (!session.user) {
          router.push('/login')
          return
        }

        const subs = await apiClient.submissions.list()
        setSubmissions(subs)
        setFilteredSubmissions(subs)
      } catch (err) {
        setError(err)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [router])

  useEffect(() => {
    let filtered = submissions

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (s) =>
          s.title.toLowerCase().includes(query) ||
          s.description.toLowerCase().includes(query)
      )
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter((s) => s.status === statusFilter)
    }

    setFilteredSubmissions(filtered)
  }, [submissions, searchQuery, statusFilter])

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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <ErrorBanner error={error} onDismiss={() => setError(null)} className="mb-6" />
        )}

        <div className="mb-6 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">My Ideas</h1>
          <Link
            href="/ideas/new"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Submit New Idea
          </Link>
        </div>

        <div className="mb-6 flex gap-4">
          <input
            type="text"
            placeholder="Search ideas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Statuses</option>
            {getAllStatuses().map((status) => (
              <option key={status} value={status}>
                {status.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
        </div>

        {filteredSubmissions.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
            {submissions.length === 0
              ? 'No ideas yet. Submit your first idea!'
              : 'No ideas match your search.'}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow divide-y divide-gray-200">
            {filteredSubmissions.map((sub) => (
              <Link
                key={sub.id}
                href={`/ideas/${sub.id}`}
                className="block px-6 py-4 hover:bg-gray-50"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-medium text-gray-900 truncate">
                      {sub.title}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                      {sub.description}
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      {new Date(sub.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <StatusChip status={sub.status} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
