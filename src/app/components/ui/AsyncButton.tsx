import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "./utils";
import {
  MOTION_DURATION_MS,
  MOTION_SCALE,
  MOTION_TRANSITION,
  usePrefersReducedMotion,
} from "../../../lib/motionTokens";
import type { AsyncActionStatus } from "../../../hooks/useAsyncAction";

const asyncButtonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[6px] text-sm font-bold outline-none select-none cursor-pointer touch-manipulation disabled:pointer-events-none disabled:opacity-55 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:ring-offset-background",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-primary/90 border border-primary/20",
        destructive:
          "bg-destructive text-white hover:bg-destructive/90 border border-destructive/30",
        outline:
          "border border-border bg-background text-foreground hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border",
        ghost:
          "text-foreground hover:bg-accent hover:text-accent-foreground",
      },
      size: {
        default: "min-h-[36px] px-4 py-2 text-[13px]",
        sm: "min-h-[30px] px-3 py-1.5 text-[12px] gap-1.5",
        lg: "min-h-[42px] px-6 py-2.5 text-[14px]",
        icon: "min-w-[36px] min-h-[36px] p-2",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface AsyncButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onClick">,
    VariantProps<typeof asyncButtonVariants> {
  /** Click handler; if it returns a Promise, AsyncButton automatically manages loading/success/error states. */
  onClick?: (
    event: React.MouseEvent<HTMLButtonElement>
  ) => void | Promise<unknown>;
  /** Explicit external loading flag. */
  isLoading?: boolean;
  /** Explicit external status override. */
  status?: AsyncActionStatus;
  /** Optional accessible announcement when loading starts. */
  loadingAnnouncement?: string;
}

export const AsyncButton = React.forwardRef<
  HTMLButtonElement,
  AsyncButtonProps
>(
  (
    {
      className,
      variant,
      size,
      disabled,
      isLoading: externalLoading,
      status: externalStatus,
      onClick,
      children,
      style,
      type = "button",
      ...props
    },
    ref
  ) => {
    const reducedMotion = usePrefersReducedMotion();
    const [internalStatus, setInternalStatus] =
      React.useState<AsyncActionStatus>("idle");
    const [isPressed, setIsPressed] = React.useState(false);
    const inFlightRef = React.useRef(false);
    const resetTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(
      null
    );

    React.useEffect(() => {
      return () => {
        if (resetTimerRef.current) {
          clearTimeout(resetTimerRef.current);
        }
      };
    }, []);

    const effectiveStatus: AsyncActionStatus =
      externalStatus ??
      (externalLoading ? "loading" : internalStatus);
    const isBusy = effectiveStatus === "loading";

    const handleClick = async (
      event: React.MouseEvent<HTMLButtonElement>
    ) => {
      if (disabled || isBusy || inFlightRef.current) {
        event.preventDefault();
        return;
      }
      if (!onClick) return;

      const maybePromise = onClick(event);
      if (
        maybePromise &&
        typeof (maybePromise as Promise<unknown>).then === "function"
      ) {
        inFlightRef.current = true;
        if (resetTimerRef.current) {
          clearTimeout(resetTimerRef.current);
          resetTimerRef.current = null;
        }
        setInternalStatus("loading");

        try {
          await maybePromise;
          setInternalStatus("success");
          resetTimerRef.current = setTimeout(() => {
            setInternalStatus("idle");
          }, MOTION_DURATION_MS.statusReset);
        } catch {
          setInternalStatus("error");
          resetTimerRef.current = setTimeout(() => {
            setInternalStatus("idle");
          }, MOTION_DURATION_MS.statusReset);
        } finally {
          inFlightRef.current = false;
        }
      }
    };

    const scaleValue =
      !reducedMotion && isPressed && !disabled && !isBusy
        ? MOTION_SCALE.press
        : MOTION_SCALE.rest;

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isBusy}
        aria-busy={isBusy || undefined}
        onPointerDown={() => setIsPressed(true)}
        onPointerUp={() => setIsPressed(false)}
        onPointerLeave={() => setIsPressed(false)}
        onPointerCancel={() => setIsPressed(false)}
        onClick={handleClick}
        className={cn(asyncButtonVariants({ variant, size, className }))}
        style={{
          transform: reducedMotion ? undefined : `scale(${scaleValue})`,
          transition: reducedMotion
            ? MOTION_TRANSITION.fadeOnly
            : MOTION_TRANSITION.buttonPress,
          ...style,
        }}
        {...props}
      >
        {isBusy && (
          <svg
            aria-hidden="true"
            viewBox="0 0 16 16"
            fill="none"
            className="w-3.5 h-3.5 shrink-0"
          >
            <g
              className={reducedMotion ? "" : "animate-spin"}
              style={{ transformBox: "fill-box", transformOrigin: "center" }}
            >
              <circle
                cx="8"
                cy="8"
                r="6"
                stroke="currentColor"
                strokeWidth="2"
                strokeOpacity="0.28"
              />
              <path
                d="M14 8a6 6 0 0 0-6-6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </g>
          </svg>
        )}
        {effectiveStatus === "success" && !isBusy && (
          <svg
            aria-hidden="true"
            viewBox="0 0 16 16"
            fill="none"
            className="w-3.5 h-3.5 text-success shrink-0"
          >
            <path
              d="M3 8.5L6.5 12L13 4.5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

AsyncButton.displayName = "AsyncButton";
