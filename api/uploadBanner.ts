import { createClient } from "@supabase/supabase-js";

export const config = {
  maxDuration: 15,
};

function jsonResponse(status: number, body: Record<string, any>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "X-Content-Type-Options": "nosniff",
    },
  });
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

  try {
    const body = await request.json();
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

    // Enforce 5 MB max payload
    if (buffer.length > 5 * 1024 * 1024) {
      return jsonResponse(400, { error: "Image exceeds 5 MB limit." });
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
      console.error("[uploadBanner] Storage upload failed:", uploadError);
      return jsonResponse(500, { error: "Failed to upload banner to storage." });
    }

    const { data: pubData } = adminClient.storage
      .from("banners")
      .getPublicUrl(filePath);

    // Opportunistically prune old banners for this user to keep storage clean
    try {
      const { data: existingFiles } = await adminClient.storage
        .from("banners")
        .list(user.id);
      if (Array.isArray(existingFiles) && existingFiles.length > 1) {
        const toDelete = existingFiles
          .filter((f) => f.name !== `banner-${filePath.split("/").pop()}` && f.name !== filePath.split("/").pop())
          .map((f) => `${user.id}/${f.name}`);
        if (toDelete.length > 0) {
          await adminClient.storage.from("banners").remove(toDelete);
        }
      }
    } catch {
      // Non-critical cleanup failure, ignore
    }

    return jsonResponse(200, { publicUrl: pubData.publicUrl });
  } catch (err: unknown) {
    console.error("[uploadBanner] Exception:", err);
    return jsonResponse(500, { error: "An unexpected error occurred during upload." });
  }
}
