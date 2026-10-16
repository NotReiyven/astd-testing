import { useEffect, useRef } from "react";
import { GiCharacter } from "react-icons/gi";
import { useAuthStore } from "../../../store/useAuthStore";
import { triggerHaptic } from "../../../data/helpers";
import { AsyncButton } from "../ui/AsyncButton";

export function LoginRecommendationModal({
  isOpen,
  onClose,
  channelName,
}: {
  isOpen: boolean;
  onClose: () => void;
  channelName: string;
}) {
  const loginWithDiscord = useAuthStore((s) => s.loginWithDiscord);
  const dialogRef = useRef<HTMLDivElement>(null);
  const initialFocusRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    previousFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    const timer = window.setTimeout(() => {
      initialFocusRef.current?.focus();
    }, 20);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        triggerHaptic("light");
        onClose();
        return;
      }

      if (e.key === "Tab" && dialogRef.current) {
        const focusable = Array.from(
          dialogRef.current.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
          )
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (
            document.activeElement === first ||
            !dialogRef.current.contains(document.activeElement)
          ) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (
            document.activeElement === last ||
            !dialogRef.current.contains(document.activeElement)
          ) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("keydown", handleKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const title =
    channelName === "inventory"
      ? "Inventory & Vault Access"
      : "Live Trading Board";
  const desc =
    channelName === "inventory"
      ? "Logging in with Discord allows you to sync your personal unit collection, track your net worth, and manage your wishlist securely."
      : "You can browse active community listings while logged out, but logging in lets you post trades, comment in discussions, and message traders directly.";

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label="Sign In Recommendation"
      aria-labelledby="login-rec-title"
      className="fixed inset-0 z-[1000000] flex items-center justify-center p-4 bg-black/80 animate-fade-in select-none font-sans"
    >
      <div className="bg-card border border-border rounded-xl p-6 max-w-md w-full shadow-2xl flex flex-col relative animate-slide-up">
        <button
          type="button"
          aria-label="Close"
          onClick={() => {
            triggerHaptic("light");
            onClose();
          }}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-md hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer min-w-[28px] min-h-[28px] flex items-center justify-center"
        >
          <svg
            viewBox="0 0 16 16"
            fill="none"
            className="w-4 h-4"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M4 4L12 12M12 4L4 12" />
          </svg>
        </button>

        <div className="flex items-center gap-3.5 mb-4">
          <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
            <GiCharacter className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3
              id="login-rec-title"
              className="text-[15px] font-bold text-foreground tracking-tight"
            >
              Login Recommended
            </h3>
            <p className="text-[12px] text-muted-foreground font-mono">
              {title}
            </p>
          </div>
        </div>

        <p className="text-[13px] text-muted-foreground leading-relaxed mb-6">
          {desc}
        </p>

        <div className="flex items-center justify-end gap-2.5">
          <button
            ref={initialFocusRef}
            type="button"
            onClick={() => {
              triggerHaptic("light");
              onClose();
            }}
            className="px-4 py-2 rounded-lg bg-muted hover:bg-muted/80 text-foreground text-[12px] font-semibold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary min-h-[36px]"
          >
            Continue as Guest
          </button>
          <AsyncButton
            onClick={async () => {
              triggerHaptic("medium");
              await loginWithDiscord();
            }}
            className="px-4 py-2 rounded-lg text-[12px] font-semibold shadow-sm flex items-center gap-2"
          >
            <GiCharacter className="w-4 h-4" />
            <span>Login with Discord</span>
          </AsyncButton>
        </div>
      </div>
    </div>
  );
}


