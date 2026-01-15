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
  EMAIL_NOT_ALLOWED: 'EMAIL_NOT_ALLOWED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
}
