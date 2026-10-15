/*
 * src/lib/errors.ts
 * Central error handling for ASTD Value List.
 * Implements AppError class, error catalog, and normalization helper.
 */

export type Severity = 'info' | 'warn' | 'error' | 'fatal';

// Domains used throughout the app. Keep in sync with docs/error-codes.md.
export const Domains = {
  AUTH: 'AUTH',
  PROFILE: 'PROFILE',
  PRESENCE: 'PRESENCE',
  STATUS: 'STATUS',
  INVENTORY: 'INVENTORY',
  WISHLIST: 'WISHLIST',
  ADS: 'ADS',
  TRADE: 'TRADE',
  SYNC: 'SYNC',
  VALUES: 'VALUES',
  IMG: 'IMG',
  LEGAL: 'LEGAL',
  ACADEMY: 'ACADEMY',
  STORAGE: 'STORAGE',
  NET: 'NET',
  PARSER: 'PARSER',
  API: 'API',
  UI: 'UI',
  ENV: 'ENV',
} as const;
export type Domain = keyof typeof Domains;

/**
 * Structured application error.
 * code format: ASTD-<DOMAIN>-<NNN> (e.g. ASTD-AUTH-001)
 */
export class AppError extends Error {
  public readonly code: string;
  public readonly domain: Domain;
  public readonly userMessage: string;
  public readonly technical?: string;
  public readonly severity: Severity;
  public readonly retryable: boolean;
  public readonly cause?: unknown;
  public readonly context?: Record<string, unknown>;

  constructor(options: {
    code: string;
    domain: Domain;
    userMessage: string;
    technical?: string;
    severity?: Severity;
    retryable?: boolean;
    cause?: unknown;
    context?: Record<string, unknown>;
  }) {
    super(options.userMessage);
    this.name = 'AppError';
    this.code = options.code;
    this.domain = options.domain;
    this.userMessage = options.userMessage;
    this.technical = options.technical;
    this.severity = options.severity ?? 'error';
    this.retryable = options.retryable ?? false;
    this.cause = options.cause;
    this.context = options.context;
  }
}

/**
 * Central catalog of known error codes.
 * Populate with entries as they are introduced.
 */
export const ERROR_CATALOG: Record<
  string,
  { userMessage: string; severity: Severity; retryable: boolean }
> = {
  // Example entry – replace with real catalog entries.
  'ASTD-ENV-001': {
    userMessage: 'Environment configuration missing. The app is running in limited guest mode.',
    severity: 'fatal',
    retryable: false,
  },
};

/**
 * Normalizes any thrown value into an AppError.
 * @param err – unknown value caught from a try/catch.
 * @param fallbackCode – code to use when the error cannot be mapped.
 */
export function normalizeError(err: unknown, fallbackCode: string): AppError {
  // Direct AppError – just return.
  if (err instanceof AppError) {
    return err;
  }

  // Supabase/PostgREST error shape (PostgrestError from '@supabase/supabase-js')
  // { status: number, message: string, details?: string, hint?: string }
  const maybePostgrest = err as any;
  if (maybePostgrest && typeof maybePostgrest.status === 'number') {
    const status = maybePostgrest.status as number;
    // Map known status codes to domains.
    let domain: Domain = 'NET';
    if (status >= 400 && status < 500) domain = 'API';
    if (status >= 500) domain = 'NET';
    const code = `ASTD-${domain}-${String(status).padStart(3, '0')}`;
    const catalog = ERROR_CATALOG[code];
    return new AppError({
      code,
      domain,
      userMessage: catalog?.userMessage ?? maybePostgrest.message ?? 'An error occurred.',
      technical: maybePostgrest.details ?? maybePostgrest.hint,
      severity: catalog?.severity ?? 'error',
      retryable: catalog?.retryable ?? (status >= 500 || status === 429),
      cause: err,
    });
  }

  // Generic Error instance.
  if (err instanceof Error) {
    const code = fallbackCode;
    const catalog = ERROR_CATALOG[code];
    return new AppError({
      code,
      domain: code.split('-')[1] as Domain,
      userMessage: catalog?.userMessage ?? err.message,
      technical: err.stack,
      severity: catalog?.severity ?? 'error',
      retryable: catalog?.retryable ?? false,
      cause: err,
    });
  }

  // Fallback – unknown primitive or object.
  const code = fallbackCode;
  const catalog = ERROR_CATALOG[code];
  return new AppError({
    code,
    domain: code.split('-')[1] as Domain,
    userMessage: catalog?.userMessage ?? String(err),
    technical: typeof err === 'object' ? JSON.stringify(err) : undefined,
    severity: catalog?.severity ?? 'error',
    retryable: catalog?.retryable ?? false,
    cause: err,
  });
}
