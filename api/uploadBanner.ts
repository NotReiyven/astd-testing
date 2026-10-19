// ================================================
// FILE: api/uploadBanner.ts
// ================================================

import { createClient } from "@supabase/supabase-js";
import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";
import { apiLogger } from "./lib/logger.js";

export const config = {
  maxDuration: 15,
};

// Top-level tunables & configuration
const MAX_UPLOADS_PER_WINDOW = 5;
const UPLOAD_WINDOW = "10 m";
const MAX_PAYLOAD_BYTES = 5 * 1024 * 1024; // 5 MB

let ratelimit: Ratelimit | null = null;
if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
  ratelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(MAX_UPLOADS_PER_WINDOW, UPLOAD_WINDOW),
  });
}

function jsonResponse(status: number, body: Record<string, any>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

/**
 * Validates actual binary file signatures (magic bytes) to prevent extension spoofing.
 */
function verifyMagicBytes(buffer: Buffer, claimedMimeType: string): boolean {
  if (claimedMimeType === "image/png") {
    return (
      buffer.length >= 8 &&
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47
    );
  }
  if (claimedMimeType === "image/jpeg") {
    return (
      buffer.length >= 3 &&
      buffer[0] === 0xff &&
      buffer[1] === 0xd8 &&
      buffer[2] === 0xff
    );
  }
  if (claimedMimeType === "image/webp") {
    return (
      buffer.length >= 12 &&
      buffer[0] === 0x52 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x46 &&
      buffer[3] === 0x46 && // "RIFF"
      buffer[8] === 0x57 &&
      buffer[9] === 0x45 &&
      buffer[10] === 0x42 &&
      buffer[11] === 0x50 // "WEBP"
    );
  }
  return false;
}

export async function POST(request: Request) {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return jsonResponse(500, { error: "Storage configuration unavailable." });
  }

  // 1. Auth Gate — User must present valid Supabase JWT session token
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return jsonResponse(401, { error: "Authentication required to upload banners." });
  }

  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) {
    return jsonResponse(401, { error: "Invalid authorization header." });
  }

  const adminClient = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Verify token cryptographically via Supabase Auth
  const {
    data: { user },
    error: authError,
  } = await adminClient.auth.getUser(token);

  if (authError || !user) {
    return jsonResponse(401, { error: "Unauthorized or expired session." });
  }

  // 2. Upstash Rate Limiting Gate (per authenticated user ID)
  if (ratelimit) {
    try {
      const { success } = await ratelimit.limit(`upload_banner_${user.id}`);
      if (!success) {
        return jsonResponse(429, {
          error: "Upload rate limit exceeded. Maximum 5 banner uploads per 10 minutes allowed.",
        });
      }
    } catch (rlError) {
      apiLogger.warn({
        route: "/api/uploadBanner",
        code: "ASTD-UP-001",
        message: "Upstash rate limiter unavailable or failed",
        meta: { userId: user.id },
        error: rlError,
      });
      // Allow gracefully based on policy; here we log and proceed safely
    }
  }

  try {
    let body: any;
    try {
      body = await request.json();
    } catch {
      return jsonResponse(400, { error: "Invalid JSON request body." });
    }

    const { imageBase64 } = body;

    if (!imageBase64 || typeof imageBase64 !== "string") {
      return jsonResponse(400, { error: "Missing or invalid imageBase64 data." });
    }

    // Validate MIME prefix
    const match = imageBase64.match(/^data:(image\/(webp|png|jpeg|jpg));base64,(.+)$/i);
    if (!match) {
      return jsonResponse(400, { error: "Unsupported image format. Allowed: WebP, PNG, JPEG." });
    }

    const mimeType = match[1].toLowerCase() === "image/jpg" ? "image/jpeg" : match[1].toLowerCase();
    const rawData = match[3];

    // Decode base64 to buffer
    const buffer = Buffer.from(rawData, "base64");

    // Enforce max payload limit
    if (buffer.length > MAX_PAYLOAD_BYTES) {
      return jsonResponse(400, { error: `Image exceeds ${MAX_PAYLOAD_BYTES / (1024 * 1024)} MB limit.` });
    }

    // 3. Binary Magic Bytes Verification
    if (!verifyMagicBytes(buffer, mimeType)) {
      return jsonResponse(400, {
        error: "File signature mismatch: binary header does not match claimed MIME type.",
      });
    }

    const extension = mimeType === "image/png" ? "png" : mimeType === "image/jpeg" ? "jpg" : "webp";
    const filePath = `${user.id}/banner-${Date.now()}.${extension}`;

    // Upload to banners storage bucket using service role
    const { error: uploadError } = await adminClient.storage
      .from("banners")
      .upload(filePath, buffer, {
        contentType: mimeType,
        upsert: true,
      });

    if (uploadError) {
      apiLogger.error({
        route: "/api/uploadBanner",
        code: "ASTD-UP-002",
        message: "Supabase storage upload failed",
        meta: { userId: user.id, filePath, mimeType },
        error: uploadError,
      });
      return jsonResponse(500, { error: "Failed to upload banner to storage." });
    }

    const { data: pubData } = adminClient.storage
      .from("banners")
      .getPublicUrl(filePath);

    // Opportunistically prune old banners for this user to keep storage clean
    try {
      const { data: existingFiles, error: listError } = await adminClient.storage
        .from("banners")
        .list(user.id);

      if (!listError && Array.isArray(existingFiles) && existingFiles.length > 1) {
        const toDelete = existingFiles
          .filter((f) => f.name !== `banner-${filePath.split("/").pop()}` && f.name !== filePath.split("/").pop())
          .map((f) => `${user.id}/${f.name}`);
        if (toDelete.length > 0) {
          await adminClient.storage.from("banners").remove(toDelete);
        }
      }
    } catch (cleanupErr) {
      apiLogger.info({
        route: "/api/uploadBanner",
        code: "ASTD-UP-003",
        message: "Failed to prune previous banners for user",
        meta: { userId: user.id },
        error: cleanupErr,
      });
    }

    return jsonResponse(200, { publicUrl: pubData.publicUrl });
  } catch (err: unknown) {
    apiLogger.error({
      route: "/api/uploadBanner",
      code: "ASTD-UP-004",
      message: "Unexpected error during banner upload execution",
      meta: { userId: user?.id },
      error: err,
    });
    return jsonResponse(500, { error: "An unexpected error occurred during upload." });
  }
}
