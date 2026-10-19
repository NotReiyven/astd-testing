/*
 * src/lib/logger.ts
 * Structured diagnostic logger with an in‑memory ring buffer, token redaction,
 * color-coded development tracing, and production Sentry routing.
 */

import * as Sentry from '@sentry/react';
import type { Severity } from './errors';
import { AppError } from './errors';

/**
 * Maximum number of log entries kept in memory.
 */
const BUFFER_CAPACITY = 100;

export interface LogContext {
  code?: string;
  scope?: string;
  action?: string;
  durationMs?: number;
  metadata?: Record<string, unknown>;
  error?: unknown;
  [key: string]: unknown;
}

export interface LogEntry {
  timestamp: string; // ISO string
  code: string; // e.g. ASTD-ENV-001
  severity: Severity;
  message: string;
  scope?: string;
  action?: string;
  durationMs?: number;
  context?: Record<string, unknown>;
}

/**
 * Simple ring buffer implementation.
 */
class RingBuffer {
  private buffer: LogEntry[] = [];

  add(entry: LogEntry) {
    if (this.buffer.length >= BUFFER_CAPACITY) {
      this.buffer.shift();
    }
    this.buffer.push(entry);
  }

  getAll(): LogEntry[] {
    return [...this.buffer];
  }
}

const logBuffer = new RingBuffer();

/**
 * Redact sensitive keys/values from a context object.
 * Keys that match these patterns will have their values replaced with "[REDACTED]".
 */
function redactContext(
  context?: Record<string, unknown>,
  depth = 0,
  seen = new WeakSet<object>()
): Record<string, unknown> | undefined {
  if (!context || typeof context !== 'object' || depth > 3) return undefined;
  if (seen.has(context)) return { circular: '[CIRCULAR]' };
  seen.add(context);

  const redacted: Record<string, unknown> = {};
  const REDACT_KEYS = /token|jwt|apikey|email|password|secret|auth|signature|cookie/i;
  try {
    for (const [k, v] of Object.entries(context)) {
      if (REDACT_KEYS.test(k)) {
        redacted[k] = '[REDACTED]';
      } else if (typeof v === 'object' && v !== null) {
        if (v instanceof Error) {
          redacted[k] = { name: v.name, message: v.message, stack: v.stack };
        } else if (seen.has(v)) {
          redacted[k] = '[CIRCULAR]';
        } else {
          redacted[k] = redactContext(v as Record<string, unknown>, depth + 1, seen);
        }
      } else {
        redacted[k] = v;
      }
    }
  } catch {
    return { error: 'Failed to serialize context' };
  }
  return redacted;
}

/**
 * Core log function.
 */
export function log(
  code: string,
  message: string,
  context?: LogContext,
  severity: Severity = 'error'
) {
  const scope = context?.scope ? String(context.scope) : undefined;
  const action = context?.action ? String(context.action) : undefined;
  const durationMs = typeof context?.durationMs === 'number' ? context.durationMs : undefined;

  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    code,
    severity,
    message,
    scope,
    action,
    durationMs,
    context: redactContext(context),
  };

  logBuffer.add(entry);

  // Development: Rich color-coded console group
  if (import.meta.env?.DEV) {
    const badgeStyle =
      severity === 'fatal' || severity === 'error'
        ? 'background: #EF4444; color: white; padding: 2px 5px; border-radius: 3px; font-weight: bold;'
        : severity === 'warn'
        ? 'background: #F59E0B; color: black; padding: 2px 5px; border-radius: 3px; font-weight: bold;'
        : 'background: #3B82F6; color: white; padding: 2px 5px; border-radius: 3px; font-weight: bold;';

    const timingText = durationMs !== undefined ? ` (${durationMs.toFixed(1)}ms)` : '';
    const scopeLabel = scope ? ` [${scope}${action ? `::${action}` : ''}]` : '';

    console.groupCollapsed(
      `%c${code}%c${scopeLabel} ${message}${timingText}`,
      badgeStyle,
      'font-weight: 500; margin-left: 6px;'
    );
    if (scope || action) {
      console.log('%cScope / Action:', 'font-weight: bold; color: #64748B;', `${scope ?? '-'} :: ${action ?? '-'}`);
    }
    if (entry.context) {
      console.log('%cStructured Context:', 'font-weight: bold; color: #64748B;', entry.context);
    }
    if (context?.error) {
      console.error('%cError Details:', 'font-weight: bold; color: #EF4444;', context.error);
    }
    console.groupEnd();
  } else {
    // Production: Route warnings and errors to Sentry with structured tags
    if (severity === 'error' || severity === 'fatal') {
      Sentry.withScope((sentryScope) => {
        sentryScope.setTag('code', code);
        if (scope) sentryScope.setTag('scope', scope);
        if (action) sentryScope.setTag('action', action);
        if (entry.context) sentryScope.setContext('logger_context', entry.context);

        if (context?.error instanceof Error) {
          Sentry.captureException(context.error);
        } else {
          Sentry.captureMessage(`[${code}] ${message}`, severity === 'fatal' ? 'fatal' : 'error');
        }
      });
    } else if (severity === 'warn') {
      Sentry.withScope((sentryScope) => {
        sentryScope.setTag('code', code);
        if (scope) sentryScope.setTag('scope', scope);
        if (action) sentryScope.setTag('action', action);
        if (entry.context) sentryScope.setContext('logger_context', entry.context);
        Sentry.captureMessage(`[${code}] ${message}`, 'warning');
      });
    }
  }
}

/**
 * Turns the buffer into a pretty‑printed JSON string.
 */
function formatReport(): string {
  const entries = logBuffer.getAll();
  return JSON.stringify(entries, null, 2);
}

declare global {
  interface Window {
    __ASTD_DEBUG__?: {
      buffer: LogEntry[];
      copyReport: () => void;
      simulate?: (code: string) => void;
    };
  }
}

if (typeof window !== 'undefined') {
  window.__ASTD_DEBUG__ = {
    buffer: logBuffer.getAll(),
    copyReport: () => {
      const report = formatReport();
      navigator.clipboard.writeText(report).catch(() => {
        const el = document.createElement('textarea');
        el.value = report;
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
      });
    },
    simulate:
      import.meta.env?.DEV === true
        ? (code: string) => {
            throw new AppError({
              code,
              domain: (code.split('-')[1] as any) || 'UI',
              userMessage: `Simulated error for ${code}`,
              severity: 'error',
              retryable: false,
            });
          }
        : undefined,
  };
}

/**
 * Convenience structured logging interface.
 */
export const logger = {
  info: (code: string, msg: string, ctx?: LogContext) => log(code, msg, ctx, 'info'),
  warn: (code: string, msg: string, ctx?: LogContext) => log(code, msg, ctx, 'warn'),
  error: (code: string, msg: string, ctx?: LogContext) => log(code, msg, ctx, 'error'),
  fatal: (code: string, msg: string, ctx?: LogContext) => log(code, msg, ctx, 'fatal'),
};
