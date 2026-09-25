// ================================================
// FILE: src/app/components/LegalChannel.tsx
// ================================================

import { ArrowLeft } from "lucide-react";

export function LegalChannel({ type }: { type: "tos" | "privacy" }) {
  const isTos = type === "tos";

  return (
    <div className="flex-1 flex flex-col overflow-y-auto custom-scrollbar h-full font-sans selection:bg-primary/30 relative bg-background">
      <div className="w-full bg-card border-b border-border p-3 flex items-center sticky top-0 z-50 shadow-sm md:hidden">
        <button
          onClick={() =>
            window.document.dispatchEvent(
              new CustomEvent("navigate", { detail: "home" })
            )
          }
          className="flex items-center gap-1.5 px-3 py-1.5 bg-muted hover:bg-border text-muted-foreground hover:text-foreground border border-transparent hover:border-border rounded-[4px] text-[12px] font-bold uppercase tracking-wider transition-colors focus-visible:outline-none cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Return Home
        </button>
      </div>

      <div className="max-w-3xl mx-auto w-full px-6 py-12 md:py-20 flex flex-col gap-10 pb-24 relative z-10">
        <div className="flex flex-col gap-4 border-b border-border pb-8">
          <h1 className="text-[32px] md:text-[40px] font-black text-foreground tracking-tight leading-none">
            {isTos ? "Terms of Service" : "Privacy Policy"}
          </h1>
          <p className="text-[13px] font-mono font-bold text-muted-foreground uppercase tracking-widest">
            Last Updated: September 4, 2026
          </p>
        </div>

        {isTos ? (
          <div className="flex flex-col gap-8 text-[14px] md:text-[15px] text-foreground leading-[1.8]">
            <section className="flex flex-col gap-3">
              <h2 className="text-[20px] font-bold text-foreground tracking-tight">
                1. Acceptance of Terms
              </h2>
              <p className="text-muted-foreground font-medium">
                By accessing and using the ASTD Value List ("Service"), you
                agree to be bound by these Terms of Service. If you do not agree
                with any part of these terms, you may not use our Service.
              </p>
            </section>

            <section className="flex flex-col gap-3">
              <h2 className="text-[20px] font-bold text-foreground tracking-tight">
                2. Disclaimers & Non-Affiliation
              </h2>
              <p className="text-muted-foreground font-medium">
                ASTD Value List is a community-driven resource. We are{" "}
                <strong className="text-foreground">
                  not affiliated, associated, authorized, endorsed by, or in any
                  way officially connected with Roblox Corporation
                </strong>
                , the creators of All Star Tower Defense, or any of their
                subsidiaries or affiliates.
              </p>
              <ul className="list-disc pl-5 text-muted-foreground flex flex-col gap-2 mt-2 font-medium">
                <li>
                  All unit values, demand ratings, and status tags are community
                  estimates and are provided for informational purposes only.
                </li>
                <li>
                  We are not responsible for any "bad trades," loss of digital
                  assets, or fluctuations in in-game economies resulting from
                  the use of this Service.
                </li>
                <li>
                  Trade at your own risk and always exercise personal judgment.
                </li>
              </ul>
            </section>

            <section className="flex flex-col gap-3">
              <h2 className="text-[20px] font-bold text-foreground tracking-tight">
                3. Acceptable Use & API Rate Limiting
              </h2>
              <p className="text-muted-foreground font-medium">
                Our service utilizes serverless functions to fetch live market
                data. To protect the integrity and performance of the Service:
              </p>
              <ul className="list-disc pl-5 text-muted-foreground flex flex-col gap-2 mt-2 font-medium">
                <li>
                  You agree not to use automated scripts, bots, or scrapers to
                  continuously ping our API endpoints.
                </li>
                <li>
                  We utilize strict Redis-based rate-limiting. Excessive
                  requests will result in a temporary or permanent block of your
                  IP address.
                </li>
                <li>
                  Reverse engineering or attempting to exploit the backend
                  architecture is strictly prohibited and will result in a
                  permanent ban.
                </li>
              </ul>
            </section>

            <section className="flex flex-col gap-3">
              <h2 className="text-[20px] font-bold text-foreground tracking-tight">
                4. Changes to Terms
              </h2>
              <p className="text-muted-foreground font-medium">
                We reserve the right to modify these terms at any time. Your
                continued use of the Service after any such changes constitutes
                your acceptance of the new Terms of Service.
              </p>
            </section>
          </div>
        ) : (
          <div className="flex flex-col gap-8 text-[14px] md:text-[15px] text-foreground leading-[1.8]">
            <section className="flex flex-col gap-3">
              <h2 className="text-[20px] font-bold text-foreground tracking-tight">
                1. Data We Do Not Collect
              </h2>
              <p className="text-muted-foreground font-medium">
                We believe in privacy by design. ASTD Value List operates
                primarily as a client-side application.
              </p>
              <ul className="list-disc pl-5 text-muted-foreground flex flex-col gap-2 mt-2 font-medium">
                <li>
                  We <strong className="text-foreground">do not</strong> require
                  account creation or login for core features (Calculator,
                  Parsing, Search).
                </li>
                <li>
                  We <strong className="text-foreground">do not</strong> ask for
                  your Roblox password or any sensitive personal data (PII).
                </li>
                <li>
                  Your active trade configurations, custom dictionary slang, and
                  UI preferences are stored locally on your device using{" "}
                  <code>localStorage</code> and IndexedDB.
                </li>
              </ul>
            </section>

            <section className="flex flex-col gap-3">
              <h2 className="text-[20px] font-bold text-foreground tracking-tight">
                2. Analytics & Cookies
              </h2>
              <p className="text-muted-foreground font-medium">
                To understand how our platform is used and to improve
                performance, we use Google Analytics.
              </p>
              <ul className="list-disc pl-5 text-muted-foreground flex flex-col gap-2 mt-2 font-medium">
                <li>
                  We implement Google Consent Mode v2. By default, tracking
                  cookies are disabled.
                </li>
                <li>
                  If you click "Accept All" on our cookie banner, Google
                  Analytics places a cookie on your device to track page views
                  and engagement time.
                </li>
                <li>
                  If you decline, we only send anonymous, cookieless pings that
                  do not track your session history.
                </li>
              </ul>
            </section>

            <section className="flex flex-col gap-3">
              <h2 className="text-[20px] font-bold text-foreground tracking-tight">
                3. Server Logs & Rate Limiting
              </h2>
              <p className="text-muted-foreground font-medium">
                When you access our live data, your request passes through our
                serverless edge functions.
              </p>
              <ul className="list-disc pl-5 text-muted-foreground flex flex-col gap-2 mt-2 font-medium">
                <li>
                  We utilize Redis to monitor request frequencies to prevent
                  DDoS attacks and server abuse.
                </li>
                <li>
                  Your IP address is temporarily processed in a sliding window
                  memory solely for rate-limiting. It is not permanently stored
                  or linked to a personal profile.
                </li>
              </ul>
            </section>

            <section className="flex flex-col gap-3">
              <h2 className="text-[20px] font-bold text-foreground tracking-tight">
                4. Third-Party Links
              </h2>
              <p className="text-muted-foreground font-medium">
                Our Service contains links to third-party platforms,
                specifically Discord. We are not responsible for the privacy
                practices or content of these external sites. Please review
                their privacy policies when leaving our platform.
              </p>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
