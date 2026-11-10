// ============================================================================
// Serverless Structured Diagnostic Logger (Vercel Runtime)
// Outputs JSON logs with timestamp, level, route, code, message, durationMs, and meta.
// ============================================================================

export type ApiLogLevel = "info" | "warn" | "error" | "fatal";

export interface ApiLogEntry {
  route: string;
  code: string;
  message: string;
  durationMs?: number;
  meta?: Record<string, unknown>;
  error?: unknown;
}

export function emitApiLog(level: ApiLogLevel, entry: ApiLogEntry) {
  const payload = {
    timestamp: new Date().toISOString(),
    level,
    route: entry.route,
    code: entry.code,
    message: entry.message,
    ...(typeof entry.durationMs === "number" ? { durationMs: entry.durationMs } : {}),
    ...(entry.meta ? { meta: entry.meta } : {}),
    ...(entry.error
      ? {
          error:
            entry.error instanceof Error
              ? { name: entry.error.name, message: entry.error.message, stack: entry.error.stack }
              : entry.error,
        }
      : {}),
  };

  const line = JSON.stringify(payload);
  if (level === "error" || level === "fatal") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export const apiLogger = {
  info: (entry: ApiLogEntry) => emitApiLog("info", entry),
  warn: (entry: ApiLogEntry) => emitApiLog("warn", entry),
  error: (entry: ApiLogEntry) => emitApiLog("error", entry),
  fatal: (entry: ApiLogEntry) => emitApiLog("fatal", entry),
};
