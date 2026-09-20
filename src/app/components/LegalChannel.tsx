import { Shield, FileText, Scale, Lock, Server, Cookie, Globe } from "lucide-react";

export function LegalChannel({ type }: { type: "tos" | "privacy" }) {
  const isTos = type === "tos";

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-background h-full select-none font-sans">
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: var(--card); }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: var(--popover); border-radius: 3px; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>

      {/* Unified Discord-Style Header */}
      <div className="flex-shrink-0 px-5 py-4 bg-card border-b border-border shadow-sm z-10 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[8px] bg-popover border border-border flex items-center justify-center shadow-inner shrink-0">
            {isTos ? <FileText className="w-5 h-5 text-primary" /> : <Shield className="w-5 h-5 text-[#23a559]" />}
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Platform Governance</span>
            <h2 className="text-[17px] font-black text-foreground tracking-tight">{isTos ? "Terms of Service" : "Privacy Policy"}</h2>
          </div>
        </div>

        <span className="text-[11px] font-mono font-bold text-muted-foreground bg-popover px-2.5 py-1 rounded-[4px] border border-border shrink-0">
          Updated: Sep 4, 2026
        </span>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-5 md:p-8 flex flex-col gap-5 max-w-4xl mx-auto w-full animate-fade-in pb-12">
        
        {isTos ? (
          <>
            {/* Section 1 */}
            <div className="bg-card border border-border border-l-4 border-l-primary rounded-r-[8px] p-5 shadow-sm flex flex-col gap-3">
              <div className="flex items-center gap-2.5 border-b border-border pb-3">
                <Scale className="w-4 h-4 text-primary" />
                <h3 className="text-[14px] font-black text-foreground uppercase tracking-wider">1. Acceptance of Terms</h3>
              </div>
              <p className="text-[13px] text-card-foreground leading-[1.7]">
                By accessing and using the ASTD Value List ("Service"), you agree to be bound by these Terms of Service. If you do not agree with any part of these terms, you may not use our Service.
              </p>
            </div>

            {/* Section 2 */}
            <div className="bg-card border border-border border-l-4 border-l-destructive rounded-r-[8px] p-5 shadow-sm flex flex-col gap-3">
              <div className="flex items-center gap-2.5 border-b border-border pb-3">
                <Globe className="w-4 h-4 text-destructive" />
                <h3 className="text-[14px] font-black text-foreground uppercase tracking-wider">2. Disclaimers & Non-Affiliation</h3>
              </div>
              <p className="text-[13px] text-card-foreground leading-[1.7]">
                ASTD Value List is a community-driven resource. We are <strong>not affiliated, associated, authorized, endorsed by, or in any way officially connected with Roblox Corporation</strong>, the creators of All Star Tower Defense, or any of their subsidiaries or affiliates.
              </p>
              <ul className="flex flex-col gap-2 mt-1 pl-2 text-[13px] text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">•</span>
                  <span>All unit values, demand ratings, and status tags are community estimates and are provided for informational purposes only.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">•</span>
                  <span>We are not responsible for any "bad trades," loss of digital assets, or fluctuations in in-game economies resulting from the use of this Service.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">•</span>
                  <span>Trade at your own risk and always exercise personal judgment.</span>
                </li>
              </ul>
            </div>

            {/* Section 3 */}
            <div className="bg-card border border-border border-l-4 border-l-[#FAA61A] rounded-r-[8px] p-5 shadow-sm flex flex-col gap-3">
              <div className="flex items-center gap-2.5 border-b border-border pb-3">
                <Server className="w-4 h-4 text-[#FAA61A]" />
                <h3 className="text-[14px] font-black text-foreground uppercase tracking-wider">3. Acceptable Use & API Rate Limiting</h3>
              </div>
              <p className="text-[13px] text-card-foreground leading-[1.7]">
                Our service utilizes serverless functions to fetch live market data. To protect the integrity and performance of the Service:
              </p>
              <ul className="flex flex-col gap-2 mt-1 pl-2 text-[13px] text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-[#FAA61A] font-bold">•</span>
                  <span>You agree not to use automated scripts, bots, or scrapers to continuously ping our Netlify endpoints.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#FAA61A] font-bold">•</span>
                  <span>We utilize Upstash Redis for strict rate-limiting. Excessive requests will result in a temporary or permanent block of your IP address.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#FAA61A] font-bold">•</span>
                  <span>Reverse engineering or attempting to exploit the backend architecture is strictly prohibited.</span>
                </li>
              </ul>
            </div>

            {/* Section 4 */}
            <div className="bg-card border border-border border-l-4 border-l-muted-foreground rounded-r-[8px] p-5 shadow-sm flex flex-col gap-3">
              <div className="flex items-center gap-2.5 border-b border-border pb-3">
                <FileText className="w-4 h-4 text-muted-foreground" />
                <h3 className="text-[14px] font-black text-foreground uppercase tracking-wider">4. Changes to Terms</h3>
              </div>
              <p className="text-[13px] text-card-foreground leading-[1.7]">
                We reserve the right to modify these terms at any time. Your continued use of the Service after any such changes constitutes your acceptance of the new Terms of Service.
              </p>
            </div>
          </>
        ) : (
          <>
            {/* Section 1 */}
            <div className="bg-card border border-border border-l-4 border-l-[#23a559] rounded-r-[8px] p-5 shadow-sm flex flex-col gap-3">
              <div className="flex items-center gap-2.5 border-b border-border pb-3">
                <Lock className="w-4 h-4 text-[#23a559]" />
                <h3 className="text-[14px] font-black text-foreground uppercase tracking-wider">1. Data We Do Not Collect</h3>
              </div>
              <p className="text-[13px] text-card-foreground leading-[1.7]">
                We believe in privacy by design. ASTD Value List operates primarily as a client-side application.
              </p>
              <ul className="flex flex-col gap-2 mt-1 pl-2 text-[13px] text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-[#23a559] font-bold">•</span>
                  <span>We <strong>do not</strong> require account creation or login for core features.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#23a559] font-bold">•</span>
                  <span>We <strong>do not</strong> ask for your Roblox password or any sensitive personal data (PII).</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#23a559] font-bold">•</span>
                  <span>Your active trade configurations, custom dictionary slang, and UI preferences are stored locally on your device using <code>localStorage</code> and IndexedDB.</span>
                </li>
              </ul>
            </div>

            {/* Section 2 */}
            <div className="bg-card border border-border border-l-4 border-l-primary rounded-r-[8px] p-5 shadow-sm flex flex-col gap-3">
              <div className="flex items-center gap-2.5 border-b border-border pb-3">
                <Cookie className="w-4 h-4 text-primary" />
                <h3 className="text-[14px] font-black text-foreground uppercase tracking-wider">2. Analytics & Cookies</h3>
              </div>
              <p className="text-[13px] text-card-foreground leading-[1.7]">
                To understand how our platform is used and to improve performance, we use Google Analytics.
              </p>
              <ul className="flex flex-col gap-2 mt-1 pl-2 text-[13px] text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">•</span>
                  <span>We implement Google Consent Mode v2. By default, tracking cookies are disabled.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">•</span>
                  <span>If you click "Accept All" on our cookie banner, Google Analytics places a cookie on your device to track page views and engagement time.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-bold">•</span>
                  <span>If you decline, we only send anonymous, cookieless pings that do not track your session history.</span>
                </li>
              </ul>
            </div>

            {/* Section 3 */}
            <div className="bg-card border border-border border-l-4 border-l-[#FAA61A] rounded-r-[8px] p-5 shadow-sm flex flex-col gap-3">
              <div className="flex items-center gap-2.5 border-b border-border pb-3">
                <Server className="w-4 h-4 text-[#FAA61A]" />
                <h3 className="text-[14px] font-black text-foreground uppercase tracking-wider">3. Server Logs & Rate Limiting</h3>
              </div>
              <p className="text-[13px] text-card-foreground leading-[1.7]">
                When you access our live data, your request passes through our serverless functions.
              </p>
              <ul className="flex flex-col gap-2 mt-1 pl-2 text-[13px] text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-[#FAA61A] font-bold">•</span>
                  <span>We utilize Upstash Redis to monitor request frequencies to prevent DDoS attacks and server abuse.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#FAA61A] font-bold">•</span>
                  <span>Your IP address is temporarily processed in a sliding window memory solely for rate-limiting. It is not permanently stored or linked to a personal profile.</span>
                </li>
              </ul>
            </div>

            {/* Section 4 */}
            <div className="bg-card border border-border border-l-4 border-l-muted-foreground rounded-r-[8px] p-5 shadow-sm flex flex-col gap-3">
              <div className="flex items-center gap-2.5 border-b border-border pb-3">
                <Globe className="w-4 h-4 text-muted-foreground" />
                <h3 className="text-[14px] font-black text-foreground uppercase tracking-wider">4. Third-Party Links</h3>
              </div>
              <p className="text-[13px] text-card-foreground leading-[1.7]">
                Our Service contains links to third-party platforms, specifically Discord. We are not responsible for the privacy practices or content of these external sites. Please review their privacy policies when leaving our platform.
              </p>
            </div>
          </>
        )}

      </div>
    </div>
  );
}