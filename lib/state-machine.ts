import { SubmissionStatus, User, Submission } from '@prisma/client'
import { hasPermission } from './permissions'

interface TransitionDefinition {
  from: SubmissionStatus
  to: SubmissionStatus
  action: string
  guard: (submission: Submission, actor: User) => Promise<boolean>
}

const transitions: TransitionDefinition[] = [
  {
    from: 'DRAFT',
    to: 'SUBMITTED',
    action: 'submit',
    guard: async (submission, actor) => {
      return submission.createdById === actor.id
    },
  },
  {
    from: 'SUBMITTED',
    to: 'UNDER_REVIEW',
    action: 'start_review',
    guard: async (submission, actor) => {
      return await hasPermission(actor.id, 'submissions:review')
    },
  },
  {
    from: 'UNDER_REVIEW',
    to: 'NEED_INFO',
    action: 'request_info',
    guard: async (submission, actor) => {
      return await hasPermission(actor.id, 'submissions:review')
    },
  },
  {
    from: 'NEED_INFO',
    to: 'UNDER_REVIEW',
    action: 'resubmit',
    guard: async (submission, actor) => {
      const isOwner = submission.createdById === actor.id
      const hasUpdatePermission = await hasPermission(
        actor.id,
        'submissions:update:own',
        { resourceOwnerId: submission.createdById }
      )
      return isOwner && hasUpdatePermission
    },
  },
  {
    from: 'UNDER_REVIEW',
    to: 'APPROVED',
    action: 'approve',
    guard: async (submission, actor) => {
      return await hasPermission(actor.id, 'submissions:approve')
    },
  },
  {
    from: 'UNDER_REVIEW',
    to: 'REJECTED',
    action: 'reject',
    guard: async (submission, actor) => {
      return await hasPermission(actor.id, 'submissions:reject')
    },
  },
  {
    from: 'APPROVED',
    to: 'CONVERTED',
    action: 'convert',
    guard: async (submission, actor) => {
      return await hasPermission(actor.id, 'initiatives:create')
    },
  },
  {
    from: 'CONVERTED',
    to: 'ARCHIVED',
    action: 'archive',
    guard: async (submission, actor) => {
      return await hasPermission(actor.id, 'submissions:archive')
    },
  },
  {
    from: 'REJECTED',
    to: 'ARCHIVED',
    action: 'archive',
    guard: async (submission, actor) => {
      return await hasPermission(actor.id, 'submissions:archive')
    },
  },
]

export async function getValidActions(
  submission: Submission,
  actor: User
): Promise<string[]> {
  const validActions: string[] = []

  const availableTransitions = transitions.filter(
    (t) => t.from === submission.status
  )

  for (const transition of availableTransitions) {
    try {
      const allowed = await transition.guard(submission, actor)
      if (allowed) {
        validActions.push(transition.action)
      }
    } catch (error) {
      // Guard failed, skip this action
      continue
    }
  }

  return validActions
}

export async function applyTransition(
  submission: Submission,
  actor: User,
  action: string
): Promise<{ valid: boolean; newStatus?: SubmissionStatus; error?: string }> {
  const transition = transitions.find(
    (t) => t.from === submission.status && t.action === action
  )

  if (!transition) {
    return {
      valid: false,
      error: `Invalid transition: ${action} from ${submission.status}`,
    }
  }

  try {
    const allowed = await transition.guard(submission, actor)
    if (!allowed) {
      return {
        valid: false,
        error: 'Permission denied for this transition',
      }
    }
  } catch (error) {
    return {
      valid: false,
      error: 'Guard check failed',
    }
  }

  return {
    valid: true,
    newStatus: transition.to,
  }
}
