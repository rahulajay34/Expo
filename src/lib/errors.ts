/**
 * Typed error hierarchy for the application.
 *
 * Every error extends `AppError` which carries a machine-readable `code`
 * string. Consumers can branch on `instanceof` or on `error.code`.
 */

export class AppError extends Error {
  readonly code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
  }
}

export class StorageFullError extends AppError {
  constructor() {
    super(
      'Storage full — please delete old content before saving new items.',
      'STORAGE_FULL',
    );
  }
}

export class TimeoutError extends AppError {
  constructor(message = 'The request timed out. Please try again.') {
    super(message, 'TIMEOUT');
  }
}

export class ParseError extends AppError {
  constructor(message = 'Failed to parse the provided file.') {
    super(message, 'PARSE_ERROR');
  }
}

export class AIProviderError extends AppError {
  readonly status?: number;

  constructor(message: string, status?: number) {
    super(message, 'AI_PROVIDER_ERROR');
    this.status = status;
  }
}

export class RateLimitError extends AppError {
  readonly retryAfter?: number;

  constructor(retryAfter?: number) {
    const msg = retryAfter
      ? `Rate limit exceeded. Try again in ${retryAfter} seconds.`
      : 'Rate limit exceeded. Please wait before trying again.';
    super(msg, 'RATE_LIMITED');
    this.retryAfter = retryAfter;
  }
}
