import * as React from "react";
import { cn } from "./utils";
import { MOTION_TRANSITION } from "../../../lib/motionTokens";

export type InlineHintVariant = "default" | "warning" | "destructive";

export interface InlineHintProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: InlineHintVariant;
  shortcut?: string;
}

const VARIANT_CLASSES: Record<InlineHintVariant, string> = {
  default: "text-muted-foreground",
  warning: "text-warning",
  destructive: "text-destructive",
};

export function InlineHint({
  variant = "default",
  shortcut,
  className,
  style,
  children,
  ...props
}: InlineHintProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 text-[11px] font-medium leading-snug",
        VARIANT_CLASSES[variant],
        className
      )}
      style={{
        transition: MOTION_TRANSITION.fadeOnly,
        ...style,
      }}
      {...props}
    >
      <span>{children}</span>
      {shortcut && (
        <kbd
          translate="no"
          className="px-1.5 py-0.5 rounded-[4px] border border-border bg-secondary text-foreground font-mono text-[10px] font-bold tracking-tight shrink-0"
        >
          {shortcut}
        </kbd>
      )}
    </div>
  );
}
