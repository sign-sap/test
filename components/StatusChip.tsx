import React from 'react'

const STATUS_CONFIG: Record
  string,
  {
    label: string
    className: string
    description: string
  }
> = {
  DRAFT: {
    label: 'Draft',
    className: 'bg-gray-100 text-gray-800',
    description: 'Being prepared',
  },
  SUBMITTED: {
    label: 'Submitted',
    className: 'bg-blue-100 text-blue-800',
    description: 'Awaiting review',
  },
  UNDER_REVIEW: {
    label: 'Under Review',
    className: 'bg-orange-100 text-orange-800',
    description: 'Being evaluated',
  },
  NEED_INFO: {
    label: 'Need Info',
    className: 'bg-yellow-100 text-yellow-800',
    description: 'More details needed',
  },
  APPROVED: {
    label: 'Approved',
    className: 'bg-green-100 text-green-800',
    description: 'Approved for implementation',
  },
  REJECTED: {
    label: 'Rejected',
    className: 'bg-red-100 text-red-800',
    description: 'Not moving forward',
  },
  CONVERTED: {
    label: 'Converted',
    className: 'bg-green-200 text-green-900',
    description: 'Converted to initiative',
  },
  ARCHIVED: {
    label: 'Archived',
    className: 'bg-gray-200 text-gray-600',
    description: 'Archived',
  },
}

interface StatusChipProps {
  status: string
  size?: 'sm' | 'md' | 'lg'
  showDescription?: boolean
}

export function StatusChip({
  status,
  size = 'md',
  showDescription = false,
}: StatusChipProps) {
  const config = STATUS_CONFIG[status] || {
    label: status,
    className: 'bg-gray-100 text-gray-800',
    description: '',
  }

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-2 text-base',
  }

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <span
        className={`inline-flex items-center rounded-full font-medium ${config.className} ${sizeClasses[size]}`}
      >
        {config.label}
      </span>
      {showDescription && config.description && (
        <span className="text-xs text-gray-500">{config.description}</span>
      )}
    </div>
  )
}

export function getAllStatuses(): string[] {
  return Object.keys(STATUS_CONFIG)
}

export function getStatusConfig(status: string) {
  return STATUS_CONFIG[status]
}
