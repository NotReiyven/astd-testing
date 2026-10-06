# ASTD Value List - Security Audit Report

## 1. Executive Summary

A comprehensive architectural and security audit has been performed on the ASTD Value List repository. The application employs a modern Vite/React frontend deployed on Vercel, utilizing Supabase (BaaS) for direct client-to-database interactions, authentication, and real-time features. Vercel API routes are used for administrative and scheduled tasks (e.g., syncing Google Sheets).

**Primary Discoveries:**
1. **Critical Secret Leakage**: The backend authorization secret used to protect the Google Sheets sync API is currently bundled into the public frontend bundle, rendering the API completely unprotected against targeted abuse.
2. **Missing Rate Limiting for Mutations**: Because the frontend communicates directly with Supabase, there is no application-layer rate limiting for database writes (e.g., creating ads, comments, votes, profile updates).
3. **Unverified Authorization Boundaries (RLS)**: The security of the entire application relies strictly on Supabase Row Level Security (RLS) policies and RPC definitions, which are not present in the repository and must be verified in the deployed database.
4. **XSS / Session Theft Vector**: If RLS allows unauthorized insertions into the `global_alerts` table, a persistent XSS payload can be injected into the site's Security Banner, allowing attackers to steal Discord OAuth provider tokens from `localStorage`.

No broad rewrites or immediate infrastructure changes (like adding Cloudflare or new backend servers) are recommended. The current architecture can be adequately secured through environment variable hygiene, RLS verification, and targeted input validation.

---

## 2. Architecture Diagram

```text
Browser (React / Zustand)
  │
  ├── [Direct BaaS Connection]
  │     ├── Supabase Auth (Discord OAuth)
  │     ├── Supabase Data API (Reads, Inserts, Updates, Deletes)
  │     └── Supabase Realtime (WebSockets)
  │
  └── [HTTP APIs]
        └── Vercel Serverless/API Routes (/api/syncSheet, /api/cronHistory, /api/admin/notifyBreach)
              │
              ├── Upstash Redis (Rate Limiting)
              ├── Google Sheets API (Data Source)
              └── Resend API (Mass Emailing)
```

**Key Data Flows:**
- **Browser → Supabase directly**: Mutates state (`user_inventory`, `trading_ads`, `global_alerts`, `roles`, etc.) using the `VITE_SUPABASE_PUBLISHABLE_KEY`.
- **Browser → Vercel**: `fetch("/api/syncSheet")` triggered by the client.
- **Vercel → External APIs**: Communicates with Google Sheets, Discord Webhooks, and Resend using backend-only environment variables.

---

## 3. Verified Security Findings

### F-01: Critical Secret Bundled into Frontend
**Severity**: CRITICAL
**Status**: VERIFIED
- **File**: `.env`, `src/context/UnitContext.tsx`, `api/syncSheet.ts`
- **Reference**: `const syncSecret = import.meta.env.VITE_SYNC_SECRET;`
- **Why it matters**: `api/syncSheet.ts` uses `process.env.SYNC_SECRET` to ensure only authorized clients can trigger the Google Sheets sync (preventing API quota exhaustion). However, `.env` defines `VITE_SYNC_SECRET` identically to `SYNC_SECRET`. By prefixing it with `VITE_`, Vite automatically bundles this secret into the public JavaScript output.
- **Exploit Scenario**: An attacker extracts the secret from the browser's DevTools and calls `/api/syncSheet` directly, bypassing intended UI restrictions and burning Google Sheets API quota or causing excessive Supabase DB load.
- **Minimal Fix**: 
  1. Remove `VITE_SYNC_SECRET` from `.env`.
  2. Remove the `Authorization` header logic in `src/context/UnitContext.tsx`.
  3. Instead of a shared secret, protect `/api/syncSheet` strictly using Upstash Rate Limiting and origin checking (or move the trigger entirely to a cron job).

### F-02: Stored Cross-Site Scripting (XSS) in Security Banner
**Severity**: HIGH
**Status**: VERIFIED
- **File**: `src/app/components/layout/SecurityBanner.tsx` (Lines 82-89)
- **Reference**: `<a href={alert.link_url} ...>`
- **Why it matters**: The application retrieves alerts from the `global_alerts` table and binds `link_url` directly to an anchor tag's `href` attribute without sanitizing the protocol. 
- **Exploit Scenario**: If an attacker bypasses the UI and manages to insert a record into `global_alerts` (e.g., if RLS is improperly configured) with `link_url: "javascript:alert(localStorage.getItem('sb-qgnnpogyvblspxayxuya-auth-token'))"`, clicking the link will execute arbitrary JavaScript. This leads to complete session theft, including Discord provider tokens.
- **Minimal Fix**: Validate the URL protocol before rendering.
  ```tsx
  const isSafeUrl = alert.link_url?.startsWith("http://") || alert.link_url?.startsWith("https://");
  {isSafeUrl && <a href={alert.link_url}>...</a>}
  ```

### F-03: No Application-Layer Rate Limiting on Database Mutations
**Severity**: MEDIUM
**Status**: VERIFIED
- **File**: Entire `src/store/` directory and `src/hooks/useAdminIntel.ts`
- **Reference**: `supabase.from("trading_ads").insert(payload)`
- **Why it matters**: The frontend talks directly to the Supabase Postgres database. Vercel's WAF and Upstash Rate Limiting cannot intercept these requests.
- **Exploit Scenario**: A malicious authenticated user writes a script to insert 100,000 spam records into `ad_comments` or `trading_ads` per minute.
- **Minimal Fix**: Application-level rate limiting for direct-to-database architectures requires Postgres triggers. (See Architecture Options below).

---

## 4. Likely Findings

### L-01: Discord OAuth Provider Token Leakage via LocalStorage
**Severity**: HIGH
**Status**: LIKELY (Depends on Supabase project configuration)
- **File**: `src/lib/supabase.ts` and `src/store/useAuthStore.ts`
- **Reference**: `persistSession: true`
- **Context**: The auth store attempts to sanitize the session state (`delete safeSession.provider_token;`). However, the Supabase JS client automatically persists the full raw session to `localStorage` when `persistSession: true` is configured. If `provider_token` is returned by Supabase Auth, it is written to disk before Zustand sanitizes it in memory.
- **Exploit Scenario**: An XSS vulnerability allows an attacker to dump `localStorage`, retrieving the user's Discord OAuth access token, leading to potential account takeover on Discord.
- **Verification**: Open DevTools -> Application -> Local Storage. Check if `sb-...-auth-token` contains `provider_token`.
- **Remediation**: Ensure Supabase Auth is NOT configured to return the provider token unless specifically required by the application. If it is required, a BFF (Backend-for-Frontend) architecture using HttpOnly cookies is necessary.

---

## 5. Unverified Findings Requiring Runtime/Database Verification

### U-01: Row Level Security (RLS) Completeness
**Severity**: CRITICAL
**Status**: UNVERIFIED
- **File**: Database schema (not in repository)
- **Context**: The frontend issues direct administrative queries (e.g., `supabase.from("roles").delete().eq("name", name)` and `supabase.from("global_alerts").insert(payload)`). 
- **Verification Steps**: Check the Supabase Dashboard -> Authentication -> Policies. Ensure that tables like `roles`, `global_alerts`, `moderation_logs`, and `unit_value_snapshots` have strict RLS policies restricting INSERT/UPDATE/DELETE to verified admin UUIDs. If RLS is missing or misconfigured, the entire application can be compromised by any authenticated user.

### U-02: Security Definer RPC Protections
**Severity**: HIGH
**Status**: UNVERIFIED
- **File**: Database functions (not in repository)
- **Context**: The frontend calls `supabase.rpc("admin_nuke_account")` and `supabase.rpc("admin_assign_role")`.
- **Verification Steps**: Check these functions in the Supabase Dashboard. Ensure they verify `auth.uid()` against an admin table *inside* the function body. Do not rely on the client hiding the button.

---

## 6. False Alarms / Things That Are Actually Fine

- **Exposed `VITE_SUPABASE_PUBLISHABLE_KEY`**: This is NOT a vulnerability. Supabase is designed for the publishable key to be distributed to clients. Security is enforced by RLS, not by hiding this key.
- **DOMPurify in Zustand**: While `useTradingAdsStore.ts` uses DOMPurify to sanitize text before sending it to the database, React intrinsically escapes text when rendering (except in `dangerouslySetInnerHTML`). The XSS risk from user text is extremely low, making this extra sanitization benign but largely redundant.

---

## 7. Secret Inventory

| Variable | Classification | Exposed to Browser? | Notes |
|----------|----------------|---------------------|-------|
| `VITE_SUPABASE_URL` | PUBLIC | Yes | Required for BaaS connection. |
| `VITE_SUPABASE_PUBLISHABLE_KEY`| PUBLIC | Yes | Required for BaaS connection. |
| `SYNC_SECRET` | PRIVILEGED SECRET| No (Intended) | Used to authenticate `/api/syncSheet`. |
| `VITE_SYNC_SECRET` | PRIVILEGED SECRET| **YES (CRITICAL)** | Same value as `SYNC_SECRET`, bundled by Vite. |
| `SUPABASE_SERVICE_ROLE_KEY` | PRIVILEGED SECRET| No | Used in `/api/admin/notifyBreach`. |
| `ADMIN_SECRET` | PRIVILEGED SECRET| No | Used to authenticate mass emails. |
| `CRON_SECRET` | SECRET | No | Handled by Vercel Cron. |
| `GOOGLE_SHEETS_API_KEY` | SECRET | No | |
| `RESEND_API_KEY` | SECRET | No | |
| `UPSTASH_REDIS_REST_TOKEN` | SECRET | No | |

---

## 8. Supabase / RLS Audit Matrix

| Table / RPC | Operation | Client Access | Authorization Source | Risk | Verified? |
|-------------|-----------|---------------|----------------------|------|-----------|
| `global_alerts` | INSERT | Direct | RLS | Persistent XSS | NO |
| `roles` | DELETE | Direct | RLS | Privilege Escalation | NO |
| `moderation_logs`| INSERT | Direct | RLS | Log Forging | NO |
| `trading_ads` | INSERT/DEL| Direct | RLS | Spam / Mutation | NO |
| `user_inventory`| UPDATE | Direct | RLS | Fraudulent values | NO |
| `admin_nuke_account`| RPC | Direct | Function Body | Account Deletion | NO |

---

## 9. Rate-Limit Matrix

| Operation | Current Protection | Gap | Recommendation |
|-----------|--------------------|-----|----------------|
| `syncSheet` API | Upstash IP Limit (15/min) | Auth secret leaked | Fix secret leak; IP limit is sufficient. |
| Post Ad | None (Direct to DB) | No velocity control | Postgres Trigger (e.g. max 5 ads per 10 mins per UUID). |
| Post Comment | None (Direct to DB) | No velocity control | Postgres Trigger (e.g. max 10 comments per min per UUID). |
| Public Reads | None (Direct to DB) | Scraping | Acceptable risk; ensure queries are indexed. |

---

## 10. Scraper / Bot Risk Assessment

**Data Confidentiality vs. Abuse:**
Trading data is intentionally public. Hiding it from scrapers is impossible in a browser-based SPA without breaking UX. The genuine risk is **infrastructure abuse** (burning Supabase read quota or ballooning table sizes).

**Mitigation (Without changing architecture):**
- Ensure all public-facing queries utilize `.limit(x)` and `.range(x, y)`.
- If bots abuse Realtime WebSockets, utilize Supabase Realtime quotas.
- Accept that casual scraping of values is part of running a public value list.

---

## 11. DNS / CDN / WAF / Infrastructure Assessment

**Current Architecture**: Vercel (Frontend/API) + Supabase (Database/Auth).

### Option A — Keep Current Architecture (RECOMMENDED)
- **What it entails**: Fix the secret leak, validate URLs to prevent XSS, and strictly enforce Supabase RLS policies and Postgres Triggers for rate limiting.
- **Why it fits**: It's cost-effective, maintainable, and directly addresses the identified threats without adding moving parts.

### Option B — Add Cloudflare (WAF/CDN)
- **What it accomplishes**: Protects the Vercel APIs and static assets from DDoS.
- **Why it falls short**: The browser talks *directly* to `qgnnpogyvblspxayxuya.supabase.co`. A Cloudflare WAF on your custom domain will **not** inspect or protect the database traffic. Attackers will bypass it.

### Option C — Introduce a Backend / BFF (Node.js/Go)
- **What it accomplishes**: Moves all Supabase queries to a secure backend. Enables HttpOnly cookies (preventing token theft via XSS) and robust in-memory/Redis rate limiting.
- **Why it falls short**: Requires a massive rewrite of the entire application state management, dropping Supabase's real-time capabilities from the client, and drastically increasing operational complexity and hosting costs.

**Conclusion**: Stick with Option A. Do not over-engineer.

---

## 12. Prioritized Remediation Roadmap

| Phase | Task | Severity | Implementation Complexity |
|-------|------|----------|---------------------------|
| 1 | Remove `VITE_SYNC_SECRET` from `.env` and `UnitContext.tsx`. | CRITICAL | Very Low |
| 2 | Validate URL protocols in `SecurityBanner.tsx` to prevent `javascript:` XSS. | HIGH | Very Low |
| 3 | Verify RLS policies in the Supabase Dashboard for all admin-related tables (`roles`, `global_alerts`). | CRITICAL | Low (Requires DB access) |
| 4 | Ensure Supabase Auth is not returning Discord provider tokens to the client (check Dashboard config). | HIGH | Low (Dashboard config) |
| 5 | Implement Postgres Triggers on `trading_ads` and `ad_comments` to enforce rate limiting on database inserts. | MEDIUM | Medium (SQL scripting) |

---
*Audit complete. Awaiting instructions on which remediation phase to begin.*
