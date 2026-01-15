import { SubmissionStatus } from '@prisma/client'
import { hasPermission } from './permissions'

interface Submission {
  id: string
  status: SubmissionStatus
  ownerId: string
}

interface TransitionDefinition {
  from: SubmissionStatus
  to: SubmissionStatus
  action: string
  requiredPermission: string
  ownerOnly?: boolean
}

const transitions: TransitionDefinition[] = [
  {
    from: 'DRAFT',
    to: 'SUBMITTED',
    action: 'submit',
    requiredPermission: 'submissions:transition:submit',
    ownerOnly: true,
  },
  {
    from: 'SUBMITTED',
    to: 'UNDER_REVIEW',
    action: 'review',
    requiredPermission: 'submissions:transition:review',
  },
  {
    from: 'UNDER_REVIEW',
    to: 'NEED_INFO',
    action: 'need_info',
    requiredPermission: 'submissions:transition:need_info',
  },
  {
    from: 'UNDER_REVIEW',
    to: 'APPROVED',
    action: 'approve',
    requiredPermission: 'submissions:transition:approve',
  },
  {
    from: 'UNDER_REVIEW',
    to: 'REJECTED',
    action: 'reject',
    requiredPermission: 'submissions:transition:reject',
  },
  {
    from: 'NEED_INFO',
    to: 'UNDER_REVIEW',
    action: 'resubmit',
    requiredPermission: 'submissions:transition:resubmit',
    ownerOnly: true,
  },
  {
    from: 'APPROVED',
    to: 'CONVERTED',
    action: 'convert',
    requiredPermission: 'submissions:transition:convert',
  },
  {
    from: 'REJECTED',
    to: 'ARCHIVED',
    action: 'archive',
    requiredPermission: 'submissions:transition:archive',
  },
  {
    from: 'CONVERTED',
    to: 'ARCHIVED',
    action: 'archive',
    requiredPermission: 'submissions:transition:archive',
  },
]

export async function getValidActions(params: {
  submission: Submission
  userId: string
}): Promise<string[]> {
  const { submission, userId } = params
  const validActions: string[] = []

  const availableTransitions = transitions.filter(
    (t) => t.from === submission.status
  )

  for (const transition of availableTransitions) {
    if (transition.ownerOnly && submission.ownerId !== userId) {
      continue
    }

    const hasPermissionCheck = await hasPermission(
      userId,
      transition.requiredPermission
    )

    if (hasPermissionCheck) {
      validActions.push(transition.action)
    }
  }

  return validActions
}

export async function applyTransition(params: {
  submission: Submission
  userId: string
  action: string
  comment?: string
  metadata?: any
}): Promise<{
  success: boolean
  newStatus?: SubmissionStatus
  error?: {
    code: string
    message: string
    details?: any
  }
}> {
  const { submission, userId, action } = params

  const transition = transitions.find(
    (t) => t.from === submission.status && t.action === action
  )

  if (!transition) {
    const validActionsForState = transitions
      .filter((t) => t.from === submission.status)
      .map((t) => t.action)

    return {
      success: false,
      error: {
        code: 'INVALID_TRANSITION',
        message: `Invalid transition: ${action} from ${submission.status}`,
        details: {
          currentStatus: submission.status,
          actionAttempted: action,
          allowedActions: validActionsForState,
        },
      },
    }
  }

  if (transition.ownerOnly && submission.ownerId !== userId) {
    return {
      success: false,
      error: {
        code: 'PERMISSION_DENIED',
        message: 'Only the submission owner can perform this action',
        details: {
          currentStatus: submission.status,
          actionAttempted: action,
        },
      },
    }
  }

  const hasPermissionCheck = await hasPermission(
    userId,
    transition.requiredPermission
  )

  if (!hasPermissionCheck) {
    return {
      success: false,
      error: {
        code: 'PERMISSION_DENIED',
        message: 'You do not have permission to perform this action',
        details: {
          currentStatus: submission.status,
          actionAttempted: action,
          requiredPermission: transition.requiredPermission,
        },
      },
    }
  }

  return {
    success: true,
    newStatus: transition.to,
  }
}
