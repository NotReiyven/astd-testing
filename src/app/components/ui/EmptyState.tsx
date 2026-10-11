import * as React from "react";
import { cn } from "./utils";
import { AsyncButton } from "./AsyncButton";
import { MOTION_TRANSITION } from "../../../lib/motionTokens";

export interface EmptyStateAction {
  label: string;
  onClick: () => void | Promise<unknown>;
  variant?: "default" | "secondary" | "outline" | "ghost";
}

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: EmptyStateAction;
  secondaryAction?: EmptyStateAction;
  compact?: boolean;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  compact = false,
  className,
  style,
  children,
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "w-full flex flex-col items-center justify-center text-center rounded-[8px] border border-dashed border-border bg-card/50",
        compact ? "px-4 py-6 gap-2.5" : "px-6 py-12 gap-3.5",
        className
      )}
      style={{
        transition: MOTION_TRANSITION.fadeOnly,
        ...style,
      }}
      {...props}
    >
      {icon && (
        <div
          aria-hidden="true"
          className="w-10 h-10 rounded-[6px] bg-secondary border border-border flex items-center justify-center text-muted-foreground shrink-0"
        >
          {icon}
        </div>
      )}

      <div className="max-w-[420px] space-y-1">
        <h3 className="text-[15px] font-extrabold text-foreground tracking-tight">
          {title}
        </h3>
        {description && (
          <p className="text-[13px] text-muted-foreground leading-relaxed">
            {description}
          </p>
        )}
      </div>

      {(action || secondaryAction || children) && (
        <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
          {action && (
            <AsyncButton
              size="sm"
              variant={action.variant ?? "default"}
              onClick={action.onClick}
            >
              {action.label}
            </AsyncButton>
          )}
          {secondaryAction && (
            <AsyncButton
              size="sm"
              variant={secondaryAction.variant ?? "outline"}
              onClick={secondaryAction.onClick}
            >
              {secondaryAction.label}
            </AsyncButton>
          )}
          {children}
        </div>
      )}
    </div>
  );
}
