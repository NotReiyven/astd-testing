import React from "react";
import { LegalDocumentData } from "../../../data/legal";

interface LegalDocumentProps {
  document: LegalDocumentData;
  variant?: "full" | "compact";
}

const URL_SPLIT_REGEX = /(https?:\/\/[^\s)]+)/g;

function renderTextWithLinks(text: string): React.ReactNode {
  const parts = text.split(URL_SPLIT_REGEX);
  if (parts.length === 1) return text;

  return parts.map((part, idx) => {
    if (/^https?:\/\//.test(part)) {
      const cleanUrl = part.replace(/[.,;!?]+$/, "");
      const trailing = part.slice(cleanUrl.length);
      return (
        <React.Fragment key={idx}>
          <a
            href={cleanUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline underline-offset-2 hover:opacity-80 transition-opacity break-all"
          >
            {cleanUrl}
          </a>
          {trailing}
        </React.Fragment>
      );
    }
    return part;
  });
}

export function LegalDocument({
  document,
  variant = "full",
}: LegalDocumentProps) {
  const isCompact = variant === "compact";

  return (
    <div
      className={
        isCompact
          ? "flex flex-col gap-5 text-[13px] text-foreground leading-relaxed"
          : "flex flex-col gap-10"
      }
    >
      <div
        className={
          isCompact
            ? "flex flex-col gap-1.5 border-b border-border pb-4"
            : "flex flex-col gap-4 border-b border-border pb-8"
        }
      >
        <h1
          className={
            isCompact
              ? "text-[18px] font-black text-foreground tracking-tight leading-tight"
              : "text-[32px] md:text-[40px] font-black text-foreground tracking-tight leading-none"
          }
        >
          {document.title}
        </h1>
        <p className="text-[12px] md:text-[13px] font-mono font-bold text-muted-foreground uppercase tracking-widest tabular-nums">
          Last Updated: {document.lastUpdated} • Version {document.version}
        </p>
      </div>

      <div
        className={
          isCompact
            ? "flex flex-col gap-5 text-[12.5px] text-foreground leading-relaxed"
            : "flex flex-col gap-8 text-[14px] md:text-[15px] text-foreground leading-[1.8]"
        }
      >
        {document.sections.map((section) => (
          <section
            key={section.id}
            id={section.id}
            className="flex flex-col gap-2.5 scroll-mt-16"
          >
            <h2
              className={
                isCompact
                  ? "text-[14px] font-bold text-foreground tracking-tight"
                  : "text-[20px] font-bold text-foreground tracking-tight"
              }
            >
              {section.title}
            </h2>
            {section.paragraphs.map((paragraph, idx) => (
              <p key={idx} className="text-muted-foreground font-medium">
                {renderTextWithLinks(paragraph)}
              </p>
            ))}
            {section.bullets && section.bullets.length > 0 && (
              <ul className="list-disc pl-5 text-muted-foreground flex flex-col gap-1.5 mt-1 font-medium">
                {section.bullets.map((bullet, bIdx) => (
                  <li key={bIdx}>{renderTextWithLinks(bullet)}</li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
