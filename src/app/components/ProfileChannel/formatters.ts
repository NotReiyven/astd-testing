// ================================================
// FILE: src/app/components/ProfileChannel/formatters.ts
// ================================================

export const getReputationRank = (rep: number) => {
  if (rep < 0)
    return {
      label: "Exiled",
      color: "#ffffff",
      border: "rgba(255, 255, 255, 0.2)",
      bg: "#ef4444",
      next: 0,
      min: -100,
    };
  if (rep < 10)
    return {
      label: "Unranked",
      color: "#ffffff",
      border: "rgba(255, 255, 255, 0.2)",
      bg: "#475569",
      next: 10,
      min: 0,
    };
  if (rep < 50)
    return {
      label: "Apprentice",
      color: "#ffffff",
      border: "rgba(255, 255, 255, 0.2)",
      bg: "#d97706",
      next: 50,
      min: 10,
    };
  if (rep < 150)
    return {
      label: "Recognized",
      color: "#ffffff",
      border: "rgba(255, 255, 255, 0.2)",
      bg: "#475569",
      next: 150,
      min: 50,
    };
  if (rep < 300)
    return {
      label: "Trusted Merchant",
      color: "#000000",
      border: "rgba(0, 0, 0, 0.2)",
      bg: "#eab308",
      next: 300,
      min: 150,
    };
  if (rep < 500)
    return {
      label: "Elite Broker",
      color: "#ffffff",
      border: "rgba(255, 255, 255, 0.2)",
      bg: "#0284c7",
      next: 500,
      min: 300,
    };
  if (rep < 1000)
    return {
      label: "Vanguard",
      color: "#ffffff",
      border: "rgba(255, 255, 255, 0.2)",
      bg: "#2563eb",
      next: 1000,
      min: 500,
    };
  return {
    label: "Legend",
    color: "#ffffff",
    border: "rgba(255, 255, 255, 0.2)",
    bg: "#9333ea",
    next: 1000,
    min: 1000,
  };
};

export function formatTimeAgo(dateStr: string): string {
  const ts = new Date(dateStr).getTime();
  if (Number.isNaN(ts)) return "";
  const diffSec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (diffSec < 60) return "Just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 30) return `${diffDay}d ago`;
  return new Date(dateStr).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function formatRemainingTime(expiresStr: string): string | null {
  const exp = new Date(expiresStr).getTime();
  const diffMs = exp - Date.now();
  if (Number.isNaN(exp) || diffMs <= 0) return null;
  const hrs = Math.floor(diffMs / 3_600_000);
  const mins = Math.floor((diffMs % 3_600_000) / 60_000);
  if (hrs > 0) return `${hrs}h ${mins}m left`;
  return `${Math.max(1, mins)}m left`;
}