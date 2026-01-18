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
  category: string | null
  department: string | null
  attachments: any
  needInfoQuestion: string | null
  approvalComment: string | null
  rejectionReason: string | null
  createdAt: string
  owner: {
    id: string
    email: string
    name: string | null
    department: string | null
  }
  reviewedBy: {
    id: string
    email: string
    name: string | null
  } | null
}

interface Comment {
  id: string
  body: string
  createdAt: string
  author: {
    id: string
    email: string
    name: string | null
  }
}

export default function AdminIdeaDetailsPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [submission, setSubmission] = useState<Submission | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const [selectedAction, setSelectedAction] = useState<string | null>(null)
  const [actionInput, setActionInput] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  const loadData = async () => {
    try {
      const session = await apiClient.auth.session()
      if (!session.user) {
        router.push('/login')
        return
      }

      const sub = await apiClient.submissions.get(params.id)
      setSubmission(sub)
    } catch (err) {
      setError(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [params.id])

  const handleAction = async (action: 'approve' | 'reject' | 'need-info') => {
    if (!actionInput.trim()) {
      setError(new Error('Please provide a reason/comment/question'))
      return
    }

    setActionLoading(true)
    setError(null)

    try {
      const endpoint = `/api/admin/submissions/${params.id}/${action}`
      const fieldName = action === 'approve' ? 'comment' : action === 'reject' ? 'reason' : 'question'
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ [fieldName]: actionInput }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error?.message || 'Action failed')
      }

      setSelectedAction(null)
      setActionInput('')
      await loadData()
    } catch (err) {
      setError(err)
    } finally {
      setActionLoading(false)
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

  const attachments = submission.attachments as any[] | null

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
                <Link href="/admin" className="text-sm font-medium text-gray-600 hover:text-gray-900">
                  Admin Dashboard
                </Link>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link href="/admin" className="text-sm text-blue-600 hover:underline">
            ← Back to Admin Dashboard
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
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Description</h3>
              <p className="text-gray-900 whitespace-pre-wrap">{submission.description}</p>
            </div>

            {submission.category && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-1">Category</h3>
                <p className="text-gray-900">{submission.category}</p>
              </div>
            )}

            {submission.needInfoQuestion && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h3 className="text-sm font-medium text-yellow-800 mb-1">Question Requested</h3>
                <p className="text-yellow-700">{submission.needInfoQuestion}</p>
              </div>
            )}

            {submission.approvalComment && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="text-sm font-medium text-green-800 mb-1">Approval Comment</h3>
                <p className="text-green-700">{submission.approvalComment}</p>
              </div>
            )}

            {submission.rejectionReason && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h3 className="text-sm font-medium text-red-800 mb-1">Rejection Reason</h3>
                <p className="text-red-700">{submission.rejectionReason}</p>
              </div>
            )}

            {attachments && attachments.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Attachments</h3>
                <ul className="space-y-2">
                  {attachments.map((att, idx) => (
                    <li key={idx} className="text-sm text-gray-600">
                      📎 {att.name} ({att.size})
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="pt-4 border-t border-gray-200 grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-1">Submitted By</h3>
                <p className="text-gray-900">
                  {submission.owner.name || submission.owner.email}
                </p>
                {submission.owner.department && (
                  <p className="text-sm text-gray-600">{submission.owner.department}</p>
                )}
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-1">Created</h3>
                <p className="text-gray-900">
                  {new Date(submission.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>

            {!selectedAction && submission.status === 'UNDER_REVIEW' && (
              <div className="pt-4 border-t border-gray-200">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Review Actions</h3>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => setSelectedAction('approve')}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => setSelectedAction('reject')}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => setSelectedAction('need-info')}
                    className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700"
                  >
                    Need More Info
                  </button>
                </div>
              </div>
            )}

            {selectedAction && (
              <div className="pt-4 border-t border-gray-200 space-y-4">
                <h3 className="text-sm font-medium text-gray-700">
                  {selectedAction === 'approve' && 'Approval Comment'}
                  {selectedAction === 'reject' && 'Rejection Reason'}
                  {selectedAction === 'need-info' && 'Question for Submitter'}
                </h3>
                <textarea
                  value={actionInput}
                  onChange={(e) => setActionInput(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={
                    selectedAction === 'approve'
                      ? 'Enter approval comment...'
                      : selectedAction === 'reject'
                      ? 'Enter rejection reason...'
                      : 'Enter your question...'
                  }
                  disabled={actionLoading}
                />
                <div className="flex gap-4">
                  <button
                    onClick={() => handleAction(selectedAction as any)}
                    disabled={actionLoading}
                    className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {actionLoading ? 'Processing...' : 'Confirm'}
                  </button>
                  <button
                    onClick={() => {
                      setSelectedAction(null)
                      setActionInput('')
                    }}
                    disabled={actionLoading}
                    className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
