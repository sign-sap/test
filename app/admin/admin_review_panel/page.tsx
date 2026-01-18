import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSessionUser } from '@/lib/session'
import { getUserRoles } from '@/lib/admin-auth'
import prisma from '@/lib/prisma'
import { StatusChip } from '@/components/StatusChip'

export default async function AdminReviewPanelPage({
  searchParams,
}: {
  searchParams: { category?: string; status?: string; department?: string; search?: string }
}) {
  const user = await getSessionUser()
  
  if (!user) {
    redirect('/login')
  }

  const roles = await getUserRoles(user.id)
  const hasAccess = roles.includes('owner') || roles.includes('admin') || roles.includes('reviewer')

  if (!hasAccess) {
    redirect('/dashboard')
  }

  const where: any = {}
  if (searchParams.category) {
    where.category = searchParams.category
  }
  if (searchParams.status) {
    where.status = searchParams.status
  }
  if (searchParams.department) {
    where.department = searchParams.department
  }
  if (searchParams.search) {
    where.OR = [
      { title: { contains: searchParams.search, mode: 'insensitive' } },
      { description: { contains: searchParams.search, mode: 'insensitive' } },
    ]
  }

  const [submissions, categories, departments] = await Promise.all([
    prisma.submission.findMany({
      where,
      include: {
        owner: {
          select: {
            id: true,
            email: true,
            name: true,
            department: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    }),
    prisma.submission.findMany({
      where: { category: { not: null } },
      select: { category: true },
      distinct: ['category'],
    }),
    prisma.submission.findMany({
      where: { department: { not: null } },
      select: { department: true },
      distinct: ['department'],
    }),
  ])

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
                <Link href="/admin/admin_review_panel" className="text-sm font-medium text-gray-900">
                  Review Panel
                </Link>
                <Link href="/admin/users" className="text-sm font-medium text-gray-600 hover:text-gray-900">
                  Users
                </Link>
              </div>
            </div>
            <div className="flex items-center">
              <span className="text-sm text-gray-600">{user.email}</span>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Review Panel</h1>
          <p className="mt-2 text-gray-600">Review and manage all submissions</p>
        </div>

        <div className="bg-white rounded-lg shadow mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
          </div>
          <div className="p-6">
            <form method="get" className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <input
                type="text"
                name="search"
                placeholder="Search submissions..."
                defaultValue={searchParams.search}
                className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select
                name="category"
                defaultValue={searchParams.category || ''}
                className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Categories</option>
                {categories.map((c) => (
                  <option key={c.category} value={c.category || ''}>
                    {c.category}
                  </option>
                ))}
              </select>
              <select
                name="status"
                defaultValue={searchParams.status || ''}
                className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Statuses</option>
                <option value="DRAFT">Draft</option>
                <option value="SUBMITTED">Submitted</option>
                <option value="UNDER_REVIEW">Under Review</option>
                <option value="NEED_INFO">Need Info</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
              </select>
              <select
                name="department"
                defaultValue={searchParams.department || ''}
                className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Departments</option>
                {departments.map((d) => (
                  <option key={d.department} value={d.department || ''}>
                    {d.department}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="md:col-span-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Apply Filters
              </button>
            </form>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          {submissions.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              No submissions match your filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Title
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Submitter
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Department
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Created
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {submissions.map((sub) => (
                    <tr key={sub.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{sub.title}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {sub.owner.name || sub.owner.email}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-600">
                          {sub.department || sub.owner.department || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <StatusChip status={sub.status} size="sm" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-500">
                          {new Date(sub.createdAt).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          href={`/admin/ideas/${sub.id}`}
                          className="text-sm text-blue-600 hover:underline"
                        >
                          Review →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
