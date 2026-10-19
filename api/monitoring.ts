// ================================================
// FILE: api/monitoring.ts
// ================================================

import { apiLogger } from "./lib/logger.js";

export const config = {
  maxDuration: 15,
};

// Central tunables
const MAX_PAYLOAD_BYTES = 262144; // 256 KB

export async function POST(request: Request) {
  // 1. Strict Payload Size Check (Header level)
  const contentLengthHeader = request.headers.get("content-length");
  if (contentLengthHeader) {
    const parsedLength = parseInt(contentLengthHeader, 10);
    if (!isNaN(parsedLength) && parsedLength > MAX_PAYLOAD_BYTES) {
      return new Response(JSON.stringify({ error: "Payload too large. Max 256 KB allowed." }), {
        status: 413,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  // 2. Validate DSN Configuration
  const configuredDsn = process.env.SENTRY_DSN || process.env.VITE_SENTRY_DSN;
  if (!configuredDsn) {
    return new Response(
      JSON.stringify({ error: "Monitoring service unavailable (DSN unconfigured)." }),
      {
        status: 503,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  let allowedHost: string;
  let allowedProjectId: string;
  try {
    const configuredUrl = new URL(configuredDsn);
    allowedHost = configuredUrl.host;
    allowedProjectId = configuredUrl.pathname.replace(/^\//, "");
  } catch {
    return new Response(JSON.stringify({ error: "Monitoring service misconfigured." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    // 3. Read envelope body and verify byte length
    const envelope = await request.text();
    if (!envelope) {
      return new Response(JSON.stringify({ error: "Empty envelope" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const byteLength = new TextEncoder().encode(envelope).length;
    if (byteLength > MAX_PAYLOAD_BYTES) {
      return new Response(JSON.stringify({ error: "Payload too large. Max 256 KB allowed." }), {
        status: 413,
        headers: { "Content-Type": "application/json" },
      });
    }

    const firstLine = envelope.split(/\r?\n/)[0]?.trim();
    if (!firstLine) {
      return new Response(JSON.stringify({ error: "Invalid envelope format" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    let header: { dsn?: string } = {};
    try {
      header = JSON.parse(firstLine);
    } catch {
      return new Response(JSON.stringify({ error: "Malformed envelope header" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const dsnStr = header.dsn || configuredDsn;
    let dsnUrl: URL;
    try {
      dsnUrl = new URL(dsnStr);
    } catch {
      return new Response(JSON.stringify({ error: "Malformed DSN format in envelope" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const projectId = dsnUrl.pathname.replace(/^\//, "");

    // Verify target matches authorized project & host
    if (dsnUrl.host !== allowedHost || projectId !== allowedProjectId) {
      return new Response(JSON.stringify({ error: "Unauthorized target DSN" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    const upstreamUrl = `https://${dsnUrl.host}/api/${projectId}/envelope/`;
    const upstreamRes = await fetch(upstreamUrl, {
      method: "POST",
      body: envelope,
      headers: {
        "Content-Type": "application/x-sentry-envelope",
      },
    });

    return new Response(upstreamRes.body, {
      status: upstreamRes.status,
      headers: {
        "Content-Type": upstreamRes.headers.get("content-type") || "application/json",
      },
    });
  } catch (err: unknown) {
    apiLogger.error({
      route: "/api/monitoring",
      code: "ASTD-MON-001",
      message: "Monitoring envelope tunnel failure",
      error: err,
    });
    const errorMsg = err instanceof Error ? err.message : "Internal tunnel error";
    return new Response(JSON.stringify({ error: errorMsg }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
