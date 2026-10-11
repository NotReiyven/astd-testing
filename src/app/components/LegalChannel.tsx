// ================================================
// FILE: src/app/components/LegalChannel.tsx
// ================================================

import React from "react";
import { PRIVACY_POLICY, TERMS_OF_SERVICE } from "../../data/legal";
import { LegalDocument } from "./shared/LegalDocument";

export function LegalChannel({ type }: { type: "tos" | "privacy" }) {
  const document = type === "tos" ? TERMS_OF_SERVICE : PRIVACY_POLICY;

  return (
    <div className="flex-1 flex flex-col overflow-y-auto custom-scrollbar h-full font-sans selection:bg-primary/30 relative bg-background">
      <div className="w-full bg-card border-b border-border p-3 flex items-center sticky top-0 z-50 shadow-sm md:hidden">
        <button
          type="button"
          onClick={() =>
            window.document.dispatchEvent(
              new CustomEvent("navigate", { detail: "home" })
            )
          }
          className="flex items-center gap-1.5 px-3 py-1.5 bg-muted hover:bg-border text-muted-foreground hover:text-foreground border border-transparent hover:border-border rounded-[4px] text-[12px] font-bold uppercase tracking-wider transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
        >
          <svg
            viewBox="0 0 16 16"
            fill="none"
            className="w-4 h-4"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M13 8H3M7 4L3 8L7 12" />
          </svg>
          Return Home
        </button>
      </div>

      <div className="max-w-3xl mx-auto w-full px-6 py-12 md:py-20 flex flex-col gap-10 pb-24 relative z-10">
        <LegalDocument document={document} variant="full" />
      </div>
    </div>
  );
}
