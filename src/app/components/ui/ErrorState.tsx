import * as React from "react";
import { cn } from "./utils";
import { AsyncButton } from "./AsyncButton";
import { MOTION_TRANSITION } from "../../../lib/motionTokens";

export interface ErrorStateProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  description: string;
  onRetry?: () => void | Promise<unknown>;
  retryLabel?: string;
  isRetrying?: boolean;
  secondaryAction?: {
    label: string;
    onClick: () => void | Promise<unknown>;
  };
  compact?: boolean;
}

export function ErrorState({
  title = "Something Went Wrong",
  description,
  onRetry,
  retryLabel = "Try Again",
  isRetrying = false,
  secondaryAction,
  compact = false,
  className,
  style,
  ...props
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        "w-full flex flex-col items-center justify-center text-center rounded-[8px] border border-destructive/40 bg-destructive/5",
        compact ? "px-4 py-5 gap-2.5" : "px-6 py-10 gap-3.5",
        className
      )}
      style={{
        transition: MOTION_TRANSITION.fadeOnly,
        ...style,
      }}
      {...props}
    >
      <div
        aria-hidden="true"
        className="w-9 h-9 rounded-[6px] bg-destructive/15 border border-destructive/30 flex items-center justify-center text-destructive shrink-0"
      >
        <svg viewBox="0 0 16 16" fill="none" className="w-4 h-4">
          <path
            d="M8 2.25L14.25 13.25H1.75L8 2.25Z"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinejoin="round"
          />
          <path
            d="M8 6.5V9.25M8 11.25H8.007"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
          />
        </svg>
      </div>

      <div className="max-w-[420px] space-y-1">
        <h3 className="text-[14px] font-extrabold text-foreground tracking-tight">
          {title}
        </h3>
        <p className="text-[12px] text-muted-foreground leading-relaxed">
          {description}
        </p>
      </div>

      {(onRetry || secondaryAction) && (
        <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
          {onRetry && (
            <AsyncButton
              size="sm"
              variant="default"
              isLoading={isRetrying}
              onClick={onRetry}
            >
              {retryLabel}
            </AsyncButton>
          )}
          {secondaryAction && (
            <AsyncButton
              size="sm"
              variant="outline"
              onClick={secondaryAction.onClick}
            >
              {secondaryAction.label}
            </AsyncButton>
          )}
        </div>
      )}
    </div>
  );
}
