// ================================================
// FILE: src/app/components/ProfileChannel/ProfileNotFoundView.tsx
// ================================================

import { ErrorState } from "../ui/ErrorState";

export function ProfileNotFoundView({
  targetId,
  onRetry,
}: {
  targetId: string | undefined;
  onRetry: () => void;
}) {
  return (
    <div className="flex-1 w-full h-full font-sans overflow-y-auto custom-scrollbar p-6 md:p-10 bg-background flex flex-col items-center justify-center">
      <ErrorState
        title="Trader Profile Not Found"
        description="We couldn't locate this user's profile. Check the link or return to the trading board."
        onRetry={() => {
          if (targetId) onRetry();
        }}
        secondaryAction={{
          label: "Back to Trading Ads",
          onClick: () => {
            window.document.dispatchEvent(
              new CustomEvent("navigate", { detail: "trading-ads" })
            );
          },
        }}
        className="max-w-md w-full"
      />
    </div>
  );
}