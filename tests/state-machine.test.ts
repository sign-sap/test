import { getValidActions, applyTransition } from '../lib/state-machine'
import { SubmissionStatus } from '@prisma/client'

const mockSubmission = {
  id: 'sub123',
  title: 'Test',
  description: 'Test',
  status: 'DRAFT' as SubmissionStatus,
  createdById: 'user123',
  createdAt: new Date(),
  updatedAt: new Date(),
}

const mockUser = {
  id: 'user123',
  email: 'test@test.com',
  name: 'Test User',
  profileCompleted: true,
  createdAt: new Date(),
  updatedAt: new Date(),
}

jest.mock('../lib/permissions', () => ({
  hasPermission: jest.fn(),
}))

import { hasPermission } from '../lib/permissions'

describe('State Machine', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getValidActions', () => {
    it('should return submit action for DRAFT status when user is owner', async () => {
      const actions = await getValidActions(mockSubmission, mockUser)
      expect(actions).toContain('submit')
    })

    it('should not return submit action for DRAFT status when user is not owner', async () => {
      const otherUser = { ...mockUser, id: 'user456' }
      const actions = await getValidActions(mockSubmission, otherUser)
      expect(actions).not.toContain('submit')
    })

    it('should return start_review action for SUBMITTED status with review permission', async () => {
      const submission = { ...mockSubmission, status: 'SUBMITTED' as SubmissionStatus }
      ;(hasPermission as jest.Mock).mockResolvedValue(true)

      const actions = await getValidActions(submission, mockUser)
      expect(actions).toContain('start_review')
    })

    it('should return approve/reject actions for UNDER_REVIEW with permissions', async () => {
      const submission = { ...mockSubmission, status: 'UNDER_REVIEW' as SubmissionStatus }
      ;(hasPermission as jest.Mock).mockImplementation((userId, perm) => {
        if (perm === 'submissions:approve') return Promise.resolve(true)
        if (perm === 'submissions:reject') return Promise.resolve(true)
        if (perm === 'submissions:review') return Promise.resolve(true)
        return Promise.resolve(false)
      })

      const actions = await getValidActions(submission, mockUser)
      expect(actions).toContain('approve')
      expect(actions).toContain('reject')
      expect(actions).toContain('request_info')
    })
  })

  describe('applyTransition', () => {
    it('should allow valid transition', async () => {
      const result = await applyTransition(mockSubmission, mockUser, 'submit')
      expect(result.valid).toBe(true)
      expect(result.newStatus).toBe('SUBMITTED')
    })

    it('should reject invalid transition', async () => {
      const result = await applyTransition(mockSubmission, mockUser, 'approve')
      expect(result.valid).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('should reject transition when guard fails', async () => {
      const otherUser = { ...mockUser, id: 'user456' }
      const result = await applyTransition(mockSubmission, otherUser, 'submit')
      expect(result.valid).toBe(false)
    })

    it('should reject transition from terminal state', async () => {
      const rejectedSubmission = { ...mockSubmission, status: 'REJECTED' as SubmissionStatus }
      const result = await applyTransition(rejectedSubmission, mockUser, 'submit')
      expect(result.valid).toBe(false)
    })
  })
})
