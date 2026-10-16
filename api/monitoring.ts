export const config = {
  maxDuration: 15,
};

const ALLOWED_PROJECT_IDS = new Set(["4512197612929024"]);
const ALLOWED_HOSTS = new Set(["o4512197595955200.ingest.us.sentry.io", "o4512197595955200.ingest.sentry.io"]);

export async function POST(request: Request) {
  try {
    const envelope = await request.text();
    if (!envelope) {
      return new Response(JSON.stringify({ error: "Empty envelope" }), {
        status: 400,
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

    const defaultDsn =
      process.env.VITE_SENTRY_DSN ||
      process.env.SENTRY_DSN ||
      "https://de6547fe1a8afdb5b219a62958ffc844@o4512197595955200.ingest.us.sentry.io/4512197612929024";

    const dsnStr = header.dsn || defaultDsn;
    const dsnUrl = new URL(dsnStr);
    const projectId = dsnUrl.pathname.replace(/^\//, "");

    if (!ALLOWED_HOSTS.has(dsnUrl.host) || !ALLOWED_PROJECT_IDS.has(projectId)) {
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
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || "Internal tunnel error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
