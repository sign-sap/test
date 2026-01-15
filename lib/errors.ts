export interface ApiError {
  ok: false
  code: string
  message: string
  details?: any
}

export interface ApiSuccess<T = any> {
  ok: true
  data?: T
}

export function errorResponse(
  code: string,
  message: string,
  details?: any
): ApiError {
  return { ok: false, code, message, details }
}

export function successResponse<T>(data?: T): ApiSuccess<T> {
  return { ok: true, data }
}

export const ErrorCodes = {
  INVALID_INPUT: 'INVALID_INPUT',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  INVALID_OTP: 'INVALID_OTP',
  OTP_EXPIRED: 'OTP_EXPIRED',
  OTP_MAX_ATTEMPTS: 'OTP_MAX_ATTEMPTS',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  INVALID_TRANSITION: 'INVALID_TRANSITION',
  EMAIL_NOT_ALLOWED: 'EMAIL_NOT_ALLOWED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
}

export function getErrorStatus(code: string): number {
  switch (code) {
    case ErrorCodes.UNAUTHORIZED:
      return 401
    case ErrorCodes.FORBIDDEN:
    case ErrorCodes.PERMISSION_DENIED:
      return 403
    case ErrorCodes.NOT_FOUND:
      return 404
    case ErrorCodes.CONFLICT:
    case ErrorCodes.INVALID_TRANSITION:
      return 409
    case ErrorCodes.RATE_LIMIT_EXCEEDED:
      return 429
    case ErrorCodes.INVALID_INPUT:
    case ErrorCodes.INVALID_OTP:
    case ErrorCodes.OTP_EXPIRED:
    case ErrorCodes.OTP_MAX_ATTEMPTS:
    case ErrorCodes.EMAIL_NOT_ALLOWED:
      return 400
    default:
      return 500
  }
}
