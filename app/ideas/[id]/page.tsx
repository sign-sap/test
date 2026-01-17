'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { apiClient } from '@/lib/api-client'
import { ErrorBanner } from '@/components/ErrorBanner'
import { StatusChip } from '@/components/StatusChip'

interface Submission {
  id: string
  title: string
  description: string
  status: string
  createdAt: string
  updatedAt: string
  owner: {
    id: string
    email: string
    name: string | null
  }
}

export default function IdeaDetailsPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [submission, setSubmission] = useState<Submission | null>(null)
  const [validActions, setValidActions] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState({ title: '', description: '' })
  const [actionLoading, setActionLoading] = useState(false)

  const loadData = async () => {
    try {
      const session = await apiClient.auth.session()
      if (!session.user) {
        router.push('/login')
        return
      }

      const [sub, actions] = await Promise.all([
        apiClient.submissions.get(params.id),
        apiClient.submissions.getValidActions(params.id),
      ])

      setSubmission(sub)
      setValidActions(actions.validActions)
      setEditData({ title: sub.title, description: sub.description })
    } catch (err) {
      setError(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [params.id, router])

  const handleUpdate = async () => {
    setActionLoading(true)
    setError(null)

    try {
      await apiClient.submissions.update(params.id, editData)
      setIsEditing(false)
      await loadData()
    } catch (err) {
      setError(err)
    } finally {
      setActionLoading(false)
    }
  }

  const handleResubmit = async () => {
    setActionLoading(true)
    setError(null)

    try {
      await apiClient.submissions.transition(params.id, 'resubmit')
      await loadData()
    } catch (err) {
      setError(err)
    } finally {
      setActionLoading(false)
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    )
  }

  if (!submission) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Submission not found</div>
      </div>
    )
  }

  const canEdit = submission.status === 'NEED_INFO'
  const canResubmit = validActions.includes('resubmit')

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

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link href="/ideas" className="text-sm text-blue-600 hover:underline">
            ← Back to My Ideas
          </Link>
        </div>

        {error && (
          <ErrorBanner error={error} onDismiss={() => setError(null)} className="mb-6" />
        )}

        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-gray-900 mb-3">{submission.title}</h1>
                <StatusChip status={submission.status} size="lg" showDescription />
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {canEdit && !isEditing && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  <strong>Action Required:</strong> Additional information has been requested.
                  Please update your submission.
                </p>
              </div>
            )}

            {isEditing ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title
                  </label>
                  <input
                    type="text"
                    value={editData.title}
                    onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={actionLoading}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={editData.description}
                    onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                    rows={8}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={actionLoading}
                  />
                </div>
                <div className="flex gap-4">
                  <button
                    onClick={handleUpdate}
                    disabled={actionLoading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {actionLoading ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    onClick={() => setIsEditing(false)}
                    disabled={actionLoading}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Description</h3>
                  <p className="text-gray-900 whitespace-pre-wrap">{submission.description}</p>
                </div>

                <div className="pt-4 border-t border-gray-200 grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-1">Submitted By</h3>
                    <p className="text-gray-900">
                      {submission.owner.name || submission.owner.email}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-1">Created</h3>
                    <p className="text-gray-900">
                      {new Date(submission.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {canEdit && (
                  <div className="pt-4 border-t border-gray-200 flex gap-4">
                    <button
                      onClick={() => setIsEditing(true)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      Update Submission
                    </button>
                    {canResubmit && (
                      <button
                        onClick={handleResubmit}
                        disabled={actionLoading}
                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                      >
                        {actionLoading ? 'Resubmitting...' : 'Resubmit for Review'}
                      </button>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
