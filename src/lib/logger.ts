/*
 * src/lib/logger.ts
 * Structured logger with an in‑memory ring buffer, token redaction, and a debug helper.
 */

import type { Severity } from './errors';
import { AppError } from './errors';

/**
 * Maximum number of log entries kept in memory.
 */
const BUFFER_CAPACITY = 100;

/**
 * Log entry stored in the ring buffer.
 */
interface LogEntry {
  timestamp: string; // ISO string
  code: string; // e.g. ASTD-ENV-001
  severity: Severity;
  message: string;
  context?: Record<string, unknown>;
}

/**
 * Simple ring buffer implementation.
 */
class RingBuffer {
  private buffer: LogEntry[] = [];

  add(entry: LogEntry) {
    if (this.buffer.length >= BUFFER_CAPACITY) {
      // Remove oldest entry (shift).
      this.buffer.shift();
    }
    this.buffer.push(entry);
  }

  getAll(): LogEntry[] {
    // Return a shallow copy to avoid external mutation.
    return [...this.buffer];
  }
}

const logBuffer = new RingBuffer();

/**
 * Redact sensitive keys/values from a context object.
 * Keys that match these patterns will have their values replaced with "[REDACTED]".
 */
function redactContext(context?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!context) return undefined;
  const redacted: Record<string, unknown> = {};
  const REDACT_KEYS = /token|jwt|apikey|email|password|secret|auth|signature/i;
  for (const [k, v] of Object.entries(context)) {
    if (REDACT_KEYS.test(k)) {
      redacted[k] = '[REDACTED]';
    } else if (typeof v === 'object' && v !== null) {
      // Recursively redact nested objects (shallow copy).
      redacted[k] = redactContext(v as Record<string, unknown>);
    } else {
      redacted[k] = v;
    }
  }
  return redacted;
}

/**
 * Core log function.
 * @param code – error or event code (e.g. ASTD-UI-001).
 * @param message – human readable message.
 * @param context – optional additional data (will be redacted).
 * @param severity – optional, defaults to "error".
 */
export function log(
  code: string,
  message: string,
  context?: Record<string, unknown>,
  severity: Severity = 'error'
) {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    code,
    severity,
    message,
    context: redactContext(context),
  };
  // Add to buffer.
  logBuffer.add(entry);

  // Also output to console for developers (respecting severity).
  const consoleMethod =
    severity === 'fatal' || severity === 'error'
      ? console.error
      : severity === 'warn'
      ? console.warn
      : console.info;
  consoleMethod(`[ASTD][${code}] ${message}`, entry.context);

  // Optionally, could integrate with toast UI elsewhere.
}

/**
 * Helper that turns the buffer into a pretty‑printed JSON string.
 */
function formatReport(): string {
  const entries = logBuffer.getAll();
  return JSON.stringify(entries, null, 2);
}

/**
 * Expose a debug helper on the window object (dev only).
 */
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
        // Fallback – create temporary textarea.
        const el = document.createElement('textarea');
        el.value = report;
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
      });
    },
    // Simulate throws only in development.
    simulate:
      import.meta.env?.DEV === true
        ? (code: string) => {
            // Find a catalog entry to construct an error.
            // For simplicity, we just throw a generic AppError.
            throw new AppError({
              code,
              domain: code.split('-')[1] as any,
              userMessage: `Simulated error for ${code}`,
              severity: 'error',
              retryable: false,
            });
          }
        : undefined,
  };
}

/**
 * Convenience wrappers for each severity level.
 */
export const logger = {
  info: (code: string, msg: string, ctx?: Record<string, unknown>) => log(code, msg, ctx, 'info'),
  warn: (code: string, msg: string, ctx?: Record<string, unknown>) => log(code, msg, ctx, 'warn'),
  error: (code: string, msg: string, ctx?: Record<string, unknown>) => log(code, msg, ctx, 'error'),
  fatal: (code: string, msg: string, ctx?: Record<string, unknown>) => log(code, msg, ctx, 'fatal'),
};
