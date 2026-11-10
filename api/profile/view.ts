import { createClient } from "@supabase/supabase-js";
import { Redis } from "@upstash/redis";
import { apiLogger } from "../../_lib/logger.js";

export const config = {
  maxDuration: 10,
};

const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
const redis = redisUrl && redisToken ? new Redis({ url: redisUrl, token: redisToken }) : null;

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function POST(request: Request) {
  if (!supabaseUrl || !serviceKey) {
    return new Response(JSON.stringify({ error: "Missing configuration" }), { status: 500 });
  }

  try {
    const body = await request.json();
    const { targetUserId, type, sourceUnitId } = body;

    if (!targetUserId || !type) {
      return new Response(JSON.stringify({ error: "Missing parameters" }), { status: 400 });
    }

    const ip = request.headers.get("x-forwarded-for") || "anonymous";
    const redisKey = type === "vault" && sourceUnitId 
      ? `view_vault_${ip}_${targetUserId}_${sourceUnitId}`
      : `view_${type}_${ip}_${targetUserId}`;

    // 1. Rate Limiting (1 view per person, per target, per day)
    if (redis) {
      const isNewView = await redis.set(redisKey, "1", { nx: true, ex: 86400 });
      if (!isNewView) {
        return new Response(JSON.stringify({ success: true, counted: false }), { status: 200 });
      }
    }

    // 2. Update Database
    const supabase = createClient(supabaseUrl, serviceKey);
    
    if (type === "profile") {
      await supabase.rpc('increment_profile_view', { target_id: targetUserId });
    } 
    else if (type === "vault") {
      await supabase.rpc('increment_vault_view', { 
        target_id: targetUserId, 
        unit_id: sourceUnitId || null 
      });
    }

    return new Response(JSON.stringify({ success: true, counted: true }), { status: 200 });

  } catch (error) {
    apiLogger.error({
      route: "/api/profile/view",
      code: "ASTD-VIEW-001",
      message: "Failed to record view",
      error,
    });
    return new Response(JSON.stringify({ error: "Internal error" }), { status: 500 });
  }
}