export interface LegalSection {
  id: string;
  title: string;
  paragraphs: string[];
  bullets?: string[];
}

export interface LegalDocumentData {
  type: "tos" | "privacy";
  title: string;
  version: string;
  lastUpdated: string;
  summaryPoints: {
    title: string;
    description: string;
  }[];
  sections: LegalSection[];
}

export const LEGAL_VERSION = "2026-10-12";
export const WELCOME_VERSION_STORAGE_KEY = "astd_welcome_version";
export const WELCOME_ACK_STORAGE_KEY = "astd_welcome_acknowledged";

export function hasAcceptedCurrentLegalVersion(): boolean {
  try {
    return (
      localStorage.getItem(WELCOME_ACK_STORAGE_KEY) === "true" &&
      localStorage.getItem(WELCOME_VERSION_STORAGE_KEY) === LEGAL_VERSION
    );
  } catch {
    return false;
  }
}

export const TERMS_OF_SERVICE: LegalDocumentData = {
  type: "tos",
  title: "Terms of Service",
  version: LEGAL_VERSION,
  lastUpdated: "October 12, 2026",
  summaryPoints: [
    {
      title: "1. Community-Run Numbers",
      description:
        "We are an independent fan project, not the official game developers. Unit prices, demand scores, and status tags come from community trade observations.",
    },
    {
      title: "2. Check Demand, Not Just Value",
      description:
        "Values shift whenever a game update drops. A unit with high paper value but low demand or a Dropping tag can be difficult to trade away.",
    },
    {
      title: "3. Your Trades Are Your Call",
      description:
        "Our calculator and market board help you evaluate deals, but once you click Accept inside Roblox, that trade is final.",
    },
  ],
  sections: [
    {
      id: "acceptance",
      title: "1. Acceptance of Terms",
      paragraphs: [
        "By accessing or using ASTD Value List (the \"Service\"), you agree to be bound by these Terms of Service (\"Terms\"). If you do not agree to all of these Terms, do not access or use the Service.",
        "When we make material updates to these Terms, we increment the document version and may prompt you to review and accept the updated Terms before continuing to use personalized or community features.",
      ],
    },
    {
      id: "eligibility",
      title: "2. Eligibility",
      paragraphs: [
        "Core read-only tools (Value List, Trade Calculator, Smart Parser, and Academy tutorials) are available without an account. To sign in or post community content, you must have a valid Discord account and meet Discord's minimum age requirement (at least 13 years old, or the minimum age of digital consent in your country).",
      ],
    },
    {
      id: "accounts",
      title: "3. Accounts & Discord Sign-In",
      paragraphs: [
        "Authentication is handled through Discord OAuth 2.0 via Supabase Auth. We never ask for or store your Discord password or your Roblox password.",
      ],
      bullets: [
        "You are responsible for maintaining the security of your Discord account and any actions taken under your profile on the Service.",
        "Your public profile displays your Discord username, Discord avatar, optional bio, optional Roblox username, trading stance, reputation score, and any inventory, wishlist, or trade history sections you choose to leave public.",
        "You may set your status preference to Online, Do Not Disturb, or Invisible at any time.",
      ],
    },
    {
      id: "non-affiliation",
      title: "4. Disclaimers & Roblox Non-Affiliation",
      paragraphs: [
        "ASTD Value List is an independent, fan-made community resource. We are not affiliated, associated, authorized, endorsed by, or in any way officially connected with Roblox Corporation, the developers or publishers of All Star Tower Defense (ASTD), or any of their subsidiaries or affiliates.",
        "All game-related unit names, character references, and trademarks belong to their respective owners and are used strictly for informational and identification purposes.",
      ],
    },
    {
      id: "estimates-disclaimer",
      title: "5. Value Estimates Are Not Financial or Trading Advice",
      paragraphs: [
        "All unit values, tier placements, demand ratings, and status tags (such as Rising, Stable, Dropping, or Overpaid) are informal community estimates synced from our community value sheet and historical snapshots.",
      ],
      bullets: [
        "Nothing on the Service constitutes financial, investment, or binding trading advice.",
        "In-game digital items have no guaranteed real-world monetary value, and in-game market demand can change without notice.",
        "You are solely responsible for verifying every trade inside Roblox before accepting. We are not liable for bad trades, scams, or lost in-game items.",
      ],
    },
    {
      id: "user-content",
      title: "6. User Content, Trading Ads & Community Conduct",
      paragraphs: [
        "Signed-in users whose accounts are in good standing may publish Trading Ads, post comments on ads, vote on ads or comments, and maintain cloud-synced unit inventories and wishlists.",
      ],
      bullets: [
        "Trading Ads expire automatically based on the duration selected at creation (between 1 and 24 hours) and may be closed or deleted earlier by the author.",
        "To protect users from phishing and scam links, URLs in Trading Ad notes and comments are automatically filtered. Only whitelisted Discord invite links (discord.gg or discord.com/invite) are permitted where links are allowed.",
        "You must not post real-money trading (RMT) offers, cross-trading offers that violate Roblox rules, scam links, harassment, hate speech, impersonation, or spam.",
        "You grant ASTD Value List a non-exclusive, worldwide, royalty-free license to host, display, and distribute the content you submit solely to operate and improve the Service.",
      ],
    },
    {
      id: "acceptable-use",
      title: "7. Acceptable Use & API Rate Limiting",
      paragraphs: [
        "Our Service uses serverless API endpoints and database queries to synchronize unit values, historical logs, and community posts. You agree not to misuse or overload our infrastructure:",
      ],
      bullets: [
        "Do not use automated bots, scrapers, or scripts to flood our API endpoints (/api/syncSheet, /api/cronHistory) or database tables.",
        "We enforce sliding-window IP rate limiting via Upstash Redis. Excessive requests will result in temporary or permanent HTTP 429 blocks.",
        "Do not attempt to bypass Row-Level Security (RLS), spoof Realtime Presence identities, manipulate reputation scores through multi-accounting, or reverse-engineer backend services.",
      ],
    },
    {
      id: "moderation",
      title: "8. Moderation, Bans & Termination",
      paragraphs: [
        "To keep the trading community safe, authorized staff roles (mod, admin, and master) may review reports and moderate user content.",
      ],
      bullets: [
        "Moderators and administrators may remove Trading Ads or comments, adjust reputation scores in cases of verified abuse, or restrict accounts by assigning the banned role.",
        "Banned accounts cannot publish Trading Ads, post comments, or cast votes.",
        "Moderation actions are recorded in our internal moderation audit log (actor ID, target ID, action type, reason, and timestamp).",
        "We reserve the right to suspend or terminate access to the Service at any time for violations of these Terms.",
      ],
    },
    {
      id: "intellectual-property",
      title: "9. Intellectual Property",
      paragraphs: [
        "The Service's interface design, original code, custom visual layout, trade analyzer logic, and curated educational guides are owned by ASTD Value List and its contributors. Underlying game assets and character likenesses remain the property of their respective copyright and trademark holders.",
      ],
    },
    {
      id: "no-warranty",
      title: "10. No Warranty (\"As Is\")",
      paragraphs: [
        "THE SERVICE IS PROVIDED ON AN \"AS IS\" AND \"AS AVAILABLE\" BASIS WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF ACCURACY, MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE, VALUE SYNCING, OR OFFLINE QUEUES WILL BE UNINTERRUPTED OR ERROR-FREE.",
      ],
    },
    {
      id: "limitation-of-liability",
      title: "11. Limitation of Liability",
      paragraphs: [
        "TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, ASTD VALUE LIST AND ITS OPERATORS, CONTRIBUTORS, AND MODERATORS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR EXEMPLARY DAMAGES, INCLUDING LOSS OF VIRTUAL ITEMS, IN-GAME VALUE, DATA, OR GOODWILL, ARISING OUT OF OR IN CONNECTION WITH YOUR USE OF (OR INABILITY TO USE) THE SERVICE.",
      ],
    },
    {
      id: "governing-law",
      title: "12. Governing Law",
      paragraphs: [
        "These Terms shall be governed by and construed in accordance with the laws of the State of Delaware, United States, without regard to its conflict of law provisions.",
      ],
    },
    {
      id: "changes",
      title: "13. Changes to Terms",
      paragraphs: [
        "We may revise these Terms from time to time. The \"Last Updated\" date and version identifier at the top of this page indicate when the Terms were last revised. Continued use of the Service after changes become effective constitutes acceptance of the revised Terms.",
      ],
    },
    {
      id: "contact",
      title: "14. Contact Information",
      paragraphs: [
        "For questions about these Terms, moderation appeals, or legal notices, please contact us via our official Discord support server at https://discord.gg/aS6RH9nav.",
      ],
    },
  ],
};

export const PRIVACY_POLICY: LegalDocumentData = {
  type: "privacy",
  title: "Privacy Policy",
  version: LEGAL_VERSION,
  lastUpdated: "October 12, 2026",
  summaryPoints: [
    {
      title: "1. No Passwords Collected",
      description:
        "Core calculator and value list tools require no login. Optional sign-in uses Discord OAuth via Supabase, and we immediately scrub raw Discord OAuth tokens from browser storage.",
    },
    {
      title: "2. Local-First Storage",
      description:
        "Your theme, layout preferences, trade calculator slots, Academy progress, and offline sync queues are stored locally in your browser via localStorage and IndexedDB.",
    },
    {
      title: "3. Opt-In Analytics",
      description:
        "Google Analytics runs in Consent Mode v2 with storage denied by default until you explicitly accept analytics cookies.",
    },
  ],
  sections: [
    {
      id: "data-collected",
      title: "1. Data We Collect & What Works Without an Account",
      paragraphs: [
        "You can browse the Value List, run the Trade Calculator, use the Smart Parser, and complete the Trading Academy without creating an account. Depending on how you use the Service, we process the following categories of data:",
      ],
      bullets: [
        "Discord Account & Profile Data (Signed-In Users): When you sign in with Discord via Supabase Auth, we store a record in our profiles table containing your Supabase user UUID (id), Discord user ID (discord_id), Discord username (username), Discord avatar URL (avatar_url), account creation timestamp (created_at), role (user, mod, admin, master, or banned), status preference (online, dnd, or invisible), global reputation score (global_rep), optional bio, optional Roblox username (roblox_username), and profile display settings packed in banner_color (accent color, banner style, trading stance, visibility toggles for ad history, wishlist, and stats, and up to 6 pinned unit IDs).",
        "Inventory & Wishlist Data (Signed-In Users): Units and quantities you add to your Vault (user_inventory) or Wishlist (user_wishlist) are stored in Supabase linked to your user ID.",
        "Trading Ads, Comments & Votes (Signed-In Users): When you post a Trading Ad (trading_ads), comment on an ad (ad_comments), or vote on ads/comments (ad_votes, ad_comment_votes), that content and your user ID are stored and displayed to other users, and may generate in-app notifications (notifications).",
        "Live Presence Data (All Visitors): We use a Supabase Realtime Presence channel (online-users) to show live active user counts. If you are signed in and not set to Invisible, your user ID is broadcast so your avatar and effective status can be resolved from your profile. If you are a guest, a random per-tab identifier (guest:<uuid> in sessionStorage) is used solely to count anonymous visitors.",
        "Moderation Audit Logs: If a moderator or administrator performs an action on an account or post, we record the actor ID, target ID, action type, reason, metadata, and timestamp in moderation_logs.",
      ],
    },
    {
      id: "purpose",
      title: "2. How We Use Your Data",
      paragraphs: [
        "We process the data described above strictly to operate, secure, and improve the Service:",
      ],
      bullets: [
        "To authenticate your session and sync your unit inventory, wishlist, and profile customizations across devices.",
        "To display public Trading Ads, comments, reputation scores, and live online/DND indicators to the community.",
        "To protect the platform against spam, phishing links, rate abuse, and unauthorized access.",
        "To measure aggregate feature usage when you opt into analytics.",
      ],
    },
    {
      id: "third-parties",
      title: "3. Third-Party Processors & External Links",
      paragraphs: [
        "We do not sell your personal data. We rely on the following infrastructure providers to deliver the Service:",
      ],
      bullets: [
        "Supabase: Provides PostgreSQL database hosting, Discord OAuth authentication, and Realtime WebSocket presence.",
        "Vercel: Hosts the web application and executes serverless API routes (/api/syncSheet and /api/cronHistory).",
        "Upstash Redis: Processes client IP addresses in a temporary sliding-window counter solely to enforce API rate limits on /api/syncSheet and /api/cronHistory.",
        "Google Sheets: Used as an upstream, read-only data source by our server functions to synchronize community unit values and tier changes. No user personal data is sent to Google Sheets.",
        "Discord (OAuth & CDN): Authenticates your identity on login and serves user avatar images from cdn.discordapp.com / media.discordapp.net.",
        "Google Analytics (Google Consent Mode v2): Collects usage telemetry only in accordance with your cookie consent choice.",
        "External Links: Outbound links clicked within the app are intercepted by our external-link warning modal before opening. If you choose to trust a domain, that preference is saved locally in your browser (astd_trusted_domains). We are not responsible for the privacy practices of external sites.",
      ],
    },
    {
      id: "cookies-storage",
      title: "4. Cookies, Local Storage & IndexedDB",
      paragraphs: [
        "We use browser storage so the app works quickly, remembers your setup, and queues changes if your connection drops:",
      ],
      bullets: [
        "localStorage Keys: We store your interface settings (astd_layout_storage), calculator slots and presets (astd_trade_storage), slang cache (astd_slang_cache), trusted external domains (astd_trusted_domains), onboarding and legal version acknowledgement (astd_welcome_acknowledged, astd_welcome_completed, astd_welcome_version), cookie choice (astd_cookie_consent), Academy checklist and tour state (astd_completed_guides, astd_active_guide), pinned announcements (astd_pinned_notices), and your Supabase session token.",
        "sessionStorage Keys: We store an ephemeral guest presence ID (astd_guest_presence_id) that clears when you close the tab.",
        "IndexedDB (idb-keyval): We cache the unit database and value history locally for fast startup and maintain offline sync queues (astd_offline_inventory_queue, astd_offline_wishlist_queue, astd_offline_profile_queue) that replay pending changes when your network connection returns.",
        "Analytics Cookies (Consent Mode v2): By default, analytics_storage is set to denied. If you click \"Accept\" on our cookie banner, Google Analytics sets cookies to measure page views and session engagement. If you decline, only cookieless pings are sent.",
      ],
    },
    {
      id: "retention",
      title: "5. Data Retention",
      paragraphs: [
        "We retain data only for as long as necessary to provide the Service:",
      ],
      bullets: [
        "Trading Ads automatically expire after their chosen 1 to 24 hour window and can be deleted earlier by the user or moderators.",
        "Profile, inventory, and wishlist records remain stored while your account is active so your vault persists between visits.",
        "Rate-limiting IP counters in Upstash Redis expire automatically after the short sliding-window interval (60 seconds).",
        "Browser localStorage and IndexedDB data remain on your device until you clear your browser data, sign out (which clears offline sync queues), or reset your preferences in the app.",
      ],
    },
    {
      id: "user-rights",
      title: "6. Your Rights (Access, Correction & Deletion)",
      paragraphs: [
        "Depending on your location, you may have the right to access, export, correct, or request deletion of your personal data.",
      ],
      bullets: [
        "In-App Controls: You can edit your bio, Roblox username, status preference, and profile privacy toggles (hiding your wishlist, ad history, or stats) directly in the Profile channel. You can also clear your inventory, wishlist, and active ads at any time.",
        "Cookie & Storage Controls: You can clear browser storage or withdraw cookie consent by clearing site data in your browser settings.",
        "Account Deletion Requests: To request full deletion of your Supabase profile and associated database records, contact us using the details in Section 10.",
      ],
    },
    {
      id: "children",
      title: "7. Children's Privacy",
      paragraphs: [
        "Account sign-in requires a Discord account and is not directed to children under the age of 13 (or the higher minimum age required by Discord in your jurisdiction). We do not knowingly collect personal information from children under 13. If you believe a child under 13 has provided personal data to us, please contact us so we can delete the account.",
      ],
    },
    {
      id: "security",
      title: "8. Security & Token Scrubbing",
      paragraphs: [
        "We use HTTPS/TLS encryption, Content-Security-Policy (CSP) headers, and Supabase Row-Level Security (RLS) policies to protect your data. Immediately after Discord OAuth sign-in, our client code scrubs raw Discord provider tokens (provider_token and provider_refresh_token) from both in-memory session state and browser localStorage so third-party OAuth tokens do not linger on your device.",
      ],
    },
    {
      id: "changes",
      title: "9. Changes to This Privacy Policy",
      paragraphs: [
        "We may update this Privacy Policy from time to time. When we make material changes, we update the \"Last Updated\" date and version identifier (`" +
          LEGAL_VERSION +
          "`) and may re-prompt you in the app.",
      ],
    },
    {
      id: "contact",
      title: "10. Contact Us",
      paragraphs: [
        "For privacy inquiries, data access requests, or account deletion requests, please contact us via our official Discord support server at https://discord.gg/aS6RH9nav.",
      ],
    },
  ],
};
