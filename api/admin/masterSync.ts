import { createClient } from "@supabase/supabase-js";

export const config = {
  maxDuration: 30,
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

const INVISIBLE_UNICODE_REGEX =
  /[\u0000-\u001F\u007F-\u009F\u00AD\u1680\u180E\u2000-\u200F\u2028-\u202F\u205F-\u206F\u2800\u3000\u3164\uFFA0\uFEFF]/g;

function sanitizeUsername(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const cleaned = raw
    .replace(INVISIBLE_UNICODE_REGEX, "")
    .replace(/\s+/g, " ")
    .trim();
  if (cleaned.length === 0) return null;
  return cleaned.slice(0, 32);
}

const SNOWFLAKE_REGEX = /^\d{17,21}$/;

function extractDiscordId(user: any): string | null {
  if (!user) return null;

  if (Array.isArray(user.identities)) {
    const discordIdentity = user.identities.find(
      (i: any) => i?.provider === "discord"
    );
    if (discordIdentity) {
      if (
        typeof discordIdentity.id === "string" &&
        SNOWFLAKE_REGEX.test(discordIdentity.id.trim())
      ) {
        return discordIdentity.id.trim();
      }
      const sub = discordIdentity.identity_data?.sub;
      if (typeof sub === "string" && SNOWFLAKE_REGEX.test(sub.trim())) {
        return sub.trim();
      }
      const providerId = discordIdentity.identity_data?.provider_id;
      if (
        typeof providerId === "string" &&
        SNOWFLAKE_REGEX.test(providerId.trim())
      ) {
        return providerId.trim();
      }
    }
  }

  const metaProviderId = user.user_metadata?.provider_id;
  if (
    typeof metaProviderId === "string" &&
    SNOWFLAKE_REGEX.test(metaProviderId.trim())
  ) {
    return metaProviderId.trim();
  }

  const metaSub = user.user_metadata?.sub;
  if (typeof metaSub === "string" && SNOWFLAKE_REGEX.test(metaSub.trim())) {
    return metaSub.trim();
  }

  return null;
}

function extractDiscordUsername(user: any): string | null {
  if (!user) return null;

  const discordIdentity = Array.isArray(user.identities)
    ? user.identities.find((i: any) => i?.provider === "discord")
    : null;

  // 1. First, evaluate global_name (optional display name).
  // Must be strictly non-empty after stripping invisible Unicode chars.
  const globalNameCandidates: unknown[] = [
    user.user_metadata?.custom_claims?.global_name,
    discordIdentity?.identity_data?.custom_claims?.global_name,
    user.user_metadata?.global_name,
    discordIdentity?.identity_data?.global_name,
  ];

  for (const candidate of globalNameCandidates) {
    const sanitized = sanitizeUsername(candidate);
    if (sanitized) return sanitized;
  }

  // 2. If global_name is absent, null, empty, or invisible filler,
  // fall back directly to the mandatory unique Discord username.
  const usernameCandidates: unknown[] = [
    user.user_metadata?.username,
    discordIdentity?.identity_data?.username,
    user.user_metadata?.user_name,
    discordIdentity?.identity_data?.user_name,
    user.user_metadata?.preferred_username,
    discordIdentity?.identity_data?.preferred_username,
    user.user_metadata?.full_name,
    discordIdentity?.identity_data?.full_name,
    typeof user.user_metadata?.name === "string"
      ? user.user_metadata.name.replace(/#0$/, "")
      : null,
    typeof discordIdentity?.identity_data?.name === "string"
      ? discordIdentity.identity_data.name.replace(/#0$/, "")
      : null,
    user.email ? user.email.split("@")[0] : null,
  ];

  for (const candidate of usernameCandidates) {
    const sanitized = sanitizeUsername(candidate);
    if (sanitized) return sanitized;
  }

  // 3. Failsafe snowflake fallback
  const dId = extractDiscordId(user);
  if (dId) return `discord_${dId.slice(-6)}`;

  return null;
}

function extractDiscordAvatar(user: any): string | null {
  if (!user) return null;

  const discordIdentity = Array.isArray(user.identities)
    ? user.identities.find((i: any) => i?.provider === "discord")
    : null;

  const candidates: unknown[] = [
    user.user_metadata?.avatar_url,
    user.user_metadata?.picture,
    discordIdentity?.identity_data?.avatar_url,
  ];

  for (const candidate of candidates) {
    if (
      typeof candidate === "string" &&
      (candidate.startsWith("http://") || candidate.startsWith("https://"))
    ) {
      return candidate.trim();
    }
  }

  return null;
}

export async function POST(request: Request) {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return jsonResponse(500, { error: "Database configuration unavailable." });
  }

  // 1. Auth Gate: Validate Bearer token
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return jsonResponse(401, {
      error: "Authentication required to access master tools.",
    });
  }

  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) {
    return jsonResponse(401, { error: "Invalid authorization header." });
  }

  const adminClient = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 2. Cryptographically verify the session token via Supabase Auth
  const {
    data: { user: callerUser },
    error: authError,
  } = await adminClient.auth.getUser(token);

  if (authError || !callerUser) {
    return jsonResponse(401, { error: "Unauthorized or expired session." });
  }

  // 3. Strict Master Role Verification
  const { data: callerProfile, error: profileError } = await adminClient
    .from("profiles")
    .select("role, username")
    .eq("id", callerUser.id)
    .maybeSingle();

  if (profileError || !callerProfile) {
    return jsonResponse(403, { error: "Caller profile not found." });
  }

  if (callerProfile.role !== "master") {
    return jsonResponse(403, {
      error: "Access denied. Master authorization required.",
    });
  }

  // 4. Parse request payload
  let body: any = {};
  try {
    body = await request.json();
  } catch {
    return jsonResponse(400, { error: "Malformed request payload." });
  }

  const { action, targetUserId } = body;
  if (!action) {
    return jsonResponse(400, { error: "Missing required action parameter." });
  }

  try {
    switch (action) {
      case "sync_user": {
        if (!targetUserId) {
          return jsonResponse(400, {
            error: "targetUserId is required for sync_user.",
          });
        }

        const {
          data: { user: targetAuthUser },
          error: targetError,
        } = await adminClient.auth.admin.getUserById(targetUserId);

        if (targetError || !targetAuthUser) {
          return jsonResponse(404, {
            error: `Target user not found in auth database: ${targetError?.message || ""}`,
          });
        }

        const extractedName = extractDiscordUsername(targetAuthUser);
        const extractedAvatar = extractDiscordAvatar(targetAuthUser);
        const extractedDiscordId = extractDiscordId(targetAuthUser);

        const updates: Record<string, any> = {};
        if (extractedName) updates.username = extractedName;
        if (extractedAvatar) updates.avatar_url = extractedAvatar;
        if (extractedDiscordId) updates.discord_id = extractedDiscordId;

        if (Object.keys(updates).length > 0) {
          const { error: updateError } = await adminClient
            .from("profiles")
            .update(updates)
            .eq("id", targetUserId);

          if (updateError) {
            return jsonResponse(500, {
              error: `Failed to update target profile: ${updateError.message}`,
            });
          }
        }

        // Audit log
        await adminClient.from("moderation_logs").insert({
          moderator_id: callerUser.id,
          action: "MASTER_SYNC_USER",
          details: `Manual Discord resync for user ${targetUserId} (${extractedName || "unknown"}). Updated: ${Object.keys(updates).join(", ")}`,
        });

        return jsonResponse(200, {
          success: true,
          message: `Profile successfully synced for ${extractedName || targetUserId}.`,
          updates,
        });
      }

      case "repair_all":
      case "sync_all_avatars":
      case "sync_all_usernames": {
        // Fetch all auth users (handles up to 1000 users)
        const {
          data: { users: allAuthUsers },
          error: listError,
        } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 });

        if (listError || !allAuthUsers) {
          return jsonResponse(500, {
            error: `Failed to list auth users: ${listError?.message || ""}`,
          });
        }

        // Fetch all existing public profiles
        const { data: allProfiles, error: fetchProfilesError } =
          await adminClient
            .from("profiles")
            .select("id, username, avatar_url, discord_id, role");

        if (fetchProfilesError || !allProfiles) {
          return jsonResponse(500, {
            error: `Failed to load profiles: ${fetchProfilesError?.message || ""}`,
          });
        }

        const profileMap = new Map(allProfiles.map((p) => [p.id, p]));
        const updatedRecords: {
          id: string;
          username: string;
          changes: string[];
        }[] = [];

        for (const authUser of allAuthUsers) {
          const existingProfile = profileMap.get(authUser.id);
          const extractedName = extractDiscordUsername(authUser);
          const extractedAvatar = extractDiscordAvatar(authUser);
          const extractedDiscordId = extractDiscordId(authUser);

          const updates: Record<string, any> = {};
          const changes: string[] = [];

          if (existingProfile) {
            // Check username
            const currentSanitized = sanitizeUsername(existingProfile.username);
            const needsUsernameRepair =
              action === "sync_all_usernames" ||
              !currentSanitized ||
              (action === "repair_all" && !existingProfile.username);

            if (needsUsernameRepair && extractedName && extractedName !== existingProfile.username) {
              updates.username = extractedName;
              changes.push(`username: "${existingProfile.username || ""}" -> "${extractedName}"`);
            }

            // Check avatar
            const needsAvatarRepair =
              action === "sync_all_avatars" ||
              (action === "repair_all" && !existingProfile.avatar_url);

            if (needsAvatarRepair && extractedAvatar && extractedAvatar !== existingProfile.avatar_url) {
              updates.avatar_url = extractedAvatar;
              changes.push("avatar updated from Discord");
            }

            // Check discord_id
            if (
              action === "repair_all" &&
              extractedDiscordId &&
              extractedDiscordId !== existingProfile.discord_id
            ) {
              updates.discord_id = extractedDiscordId;
              changes.push(`discord_id: ${extractedDiscordId}`);
            }

            if (Object.keys(updates).length > 0) {
              const { error: updErr } = await adminClient
                .from("profiles")
                .update(updates)
                .eq("id", authUser.id);

              if (!updErr) {
                updatedRecords.push({
                  id: authUser.id,
                  username: updates.username || existingProfile.username || "unknown",
                  changes,
                });
              }
            }
          } else {
            // Profile missing completely: create it
            const defaultRow = {
              id: authUser.id,
              discord_id: extractedDiscordId || "",
              username: extractedName || `Trader #${authUser.id.slice(0, 5)}`,
              avatar_url: extractedAvatar || "",
              role: "user",
              status: "online",
              global_rep: 0,
              bio: "",
              banner_color: "#121214",
              roblox_username: "",
            };

            const { error: insErr } = await adminClient
              .from("profiles")
              .insert(defaultRow);

            if (!insErr) {
              updatedRecords.push({
                id: authUser.id,
                username: defaultRow.username,
                changes: ["profile created from auth metadata"],
              });
            }
          }
        }

        // Audit log
        await adminClient.from("moderation_logs").insert({
          moderator_id: callerUser.id,
          action: `MASTER_PLATFORM_${action.toUpperCase()}`,
          details: `Processed ${allAuthUsers.length} accounts. Updated ${updatedRecords.length} records.`,
        });

        return jsonResponse(200, {
          success: true,
          action,
          totalAccountsChecked: allAuthUsers.length,
          updatedCount: updatedRecords.length,
          updatedRecords: updatedRecords.slice(0, 50),
        });
      }

      default:
        return jsonResponse(400, {
          error: `Unrecognized action "${action}". Valid actions: repair_all, sync_user, sync_all_avatars, sync_all_usernames.`,
        });
    }
  } catch (error: any) {
    console.error("[masterSync] Error:", error);
    return jsonResponse(500, {
      error: `Internal server error during master sync: ${error?.message || String(error)}`,
    });
  }
}
