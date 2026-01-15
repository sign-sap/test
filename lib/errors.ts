export class ApiError extends Error {
  code: string
  status: number
  details?: any

  constructor(code: string, message: string, status: number, details?: any) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
    this.details = details
  }
}

export interface ApiErrorResponse {
  error: {
    code: string
    message: string
    details?: any
  }
}

export interface ApiSuccessResponse<T = any> {
  ok: true
  data?: T
}

export function errorResponse(error: ApiError): ApiErrorResponse {
  return {
    error: {
      code: error.code,
      message: error.message,
      details: error.details,
    },
  }
}

export function successResponse<T>(data?: T): ApiSuccessResponse<T> {
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
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  INVALID_TRANSITION: 'INVALID_TRANSITION',
  EMAIL_NOT_ALLOWED: 'EMAIL_NOT_ALLOWED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
}

export function unauthorized(message = 'Authentication required'): ApiError {
  return new ApiError(ErrorCodes.UNAUTHORIZED, message, 401)
}

export function forbidden(message = 'Permission denied'): ApiError {
  return new ApiError(ErrorCodes.FORBIDDEN, message, 403)
}

export function notFound(message = 'Resource not found'): ApiError {
  return new ApiError(ErrorCodes.NOT_FOUND, message, 404)
}

export function conflict(message = 'Conflict', details?: any): ApiError {
  return new ApiError(ErrorCodes.CONFLICT, message, 409, details)
}

export function rateLimit(message = 'Too many requests', details?: any): ApiError {
  return new ApiError(ErrorCodes.RATE_LIMIT_EXCEEDED, message, 429, details)
}

export function invalidInput(message = 'Invalid input', details?: any): ApiError {
  return new ApiError(ErrorCodes.INVALID_INPUT, message, 400, details)
}

export function invalidTransition(message = 'Invalid state transition', details?: any): ApiError {
  return new ApiError(ErrorCodes.INVALID_TRANSITION, message, 409, details)
}
