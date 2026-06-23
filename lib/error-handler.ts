/**
 * Centralized Error Handling
 * Provides consistent error responses and logging
 */

import toast from "react-hot-toast";

export class AppError extends Error {
  constructor(
    public message: string,
    public status: number = 500,
    public code: string = 'INTERNAL_ERROR'
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 401, 'AUTHENTICATION_ERROR');
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Access denied') {
    super(message, 403, 'AUTHORIZATION_ERROR');
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Resource conflict') {
    super(message, 409, 'CONFLICT');
    this.name = 'ConflictError';
  }
}

export class RateLimitError extends AppError {
  constructor(
    message: string = 'Too many requests',
    public retryAfter?: number
  ) {
    super(message, 429, 'RATE_LIMITED');
    this.name = 'RateLimitError';
  }
}

export interface ErrorResponse {
  error: string;
  code: string;
  status: number;
  message?: string;
  details?: Record<string, any>;
}

/**
 * Format error for API response
 */
export function formatErrorResponse(
  error: unknown,
  includeDetails: boolean = false
): ErrorResponse {
  if (error instanceof AppError) {
    return {
      error: error.name,
      code: error.code,
      status: error.status,
      message: error.message,
    };
  }

  if (error instanceof Error) {
    return {
      error: error.name || 'Error',
      code: 'INTERNAL_ERROR',
      status: 500,
      message: includeDetails ? error.message : 'An error occurred',
      details: includeDetails ? { originalError: error.message } : undefined,
    };
  }

  return {
    error: 'Unknown',
    code: 'INTERNAL_ERROR',
    status: 500,
    message: 'An unexpected error occurred',
  };
}

/**
 * Log error with context
 */
export function logError(
  error: unknown,
  context: Record<string, any> = {}
): void {
  const timestamp = new Date().toISOString();

  if (error instanceof AppError) {
    console.error(`[${timestamp}] [${error.code}]`, {
      message: error.message,
      status: error.status,
      ...context,
    });
  } else if (error instanceof Error) {
    console.error(`[${timestamp}] [ERROR]`, {
      name: error.name,
      message: error.message,
      stack: error.stack,
      ...context,
    });
  } else {
    console.error(`[${timestamp}] [UNKNOWN_ERROR]`, error, context);
  }
}

/**
 * Handle Firebase-specific errors
 */
export function handleFirebaseError(error: any): AppError {
  const message = error?.message || 'Firebase error';

  if (error?.code?.includes('permission-denied')) {
    return new AuthorizationError(
      'Insufficient permissions to perform this operation'
    );
  }

  if (error?.code?.includes('not-found')) {
    return new NotFoundError('Resource not found');
  }

  if (error?.code?.includes('already-exists')) {
    return new ConflictError('Resource already exists');
  }

  if (error?.code?.includes('invalid-argument')) {
    return new ValidationError('Invalid argument provided');
  }

  if (error?.code?.includes('unauthenticated')) {
    return new AuthenticationError();
  }

  return new AppError(`Firebase error: ${message}`, 500, error?.code || 'FIREBASE_ERROR');
}

export function toastError(error: unknown, defaultMessage?: string) {
  if (error instanceof AppError) {
    toast.error(error.message);
  } else if (error instanceof Error) {
    toast.error(defaultMessage || error.message);
  } else {
    toast.error(defaultMessage || 'An error occurred');
  }
}