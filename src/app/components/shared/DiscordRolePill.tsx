import React, { memo } from "react";

export const STANDARD_ROLE_COLORS: Record<string, string> = {
  master: "#eab308",            // Gold / Master (text-black)
  admin: "#ef4444",             // Red / Admin (text-white)
  mod: "#3b82f6",               // Blue / Moderator (text-white)
  moderator: "#3b82f6",
  "value-list-team": "#22c55e", // Green / Value List Team (text-black)
  valuelistteam: "#22c55e",
  owner: "#f59e0b",             // Amber / Owner (text-black)
  tester: "#06b6d4",            // Cyan / Tester (text-black)
  "game-contributor": "#8b5cf6",// Violet / Contributor
  gamecontributor: "#8b5cf6",
  asa: "#3b82f6",               // Blue / ASA
  raven: "#a855f7",             // Purple / Raven
  vip: "#8b5cf6",               // Violet / VIP
  banned: "#ef4444",            // Red / Banned
  user: "#64748b",              // Slate-500 / Member
  trader: "#64748b",
};

export function getContrastTextColor(hexColor: string): string {
  if (!hexColor) return "#ffffff";
  let hex = hexColor.replace("#", "").trim();
  if (hex.length === 3) {
    hex = hex.split("").map((c) => c + c).join("");
  }
  const r = parseInt(hex.substring(0, 2), 16) / 255 || 0;
  const g = parseInt(hex.substring(2, 4), 16) / 255 || 0;
  const b = parseInt(hex.substring(4, 6), 16) / 255 || 0;

  const toLinear = (c: number) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  const L = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);

  return L > 0.35 ? "#000000" : "#ffffff";
}

export function formatRoleLabel(roleName: string): string {
  if (!roleName) return "USER";
  const lower = roleName.trim().toLowerCase();
  switch (lower) {
    case "master":
      return "MASTER";
    case "admin":
      return "ADMIN";
    case "mod":
    case "moderator":
      return "MOD";
    case "value-list-team":
    case "valuelistteam":
      return "VALUE-LIST-TEAM";
    case "owner":
      return "OWNER";
    case "tester":
      return "TESTER";
    case "asa":
      return "ASA";
    case "raven":
      return "RAVEN";
    case "banned":
      return "BANNED";
    case "user":
      return "USER";
    case "trader":
      return "TRADER";
    default:
      return roleName.toUpperCase();
  }
}

export function getStandardRoleColor(roleName: string): string {
  if (!roleName) return "#64748b";
  const lower = roleName.trim().toLowerCase();
  return STANDARD_ROLE_COLORS[lower] || "#3b82f6";
}

export function getStandardRoleRank(roleName: string): number {
  const lower = roleName.trim().toLowerCase();
  if (lower === "master") return 0;
  if (lower === "admin") return 1;
  if (lower === "mod" || lower === "moderator") return 2;
  if (lower === "owner") return 3;
  if (lower === "value-list-team" || lower === "valuelistteam") return 4;
  if (lower === "game-contributor" || lower === "gamecontributor") return 5;
  if (lower === "tester") return 6;
  if (lower === "raven") return 50;
  if (lower === "asa") return 51;
  if (lower === "banned") return 99;
  return 99;
}

export interface DiscordRolePillProps {
  name: string;
  label?: string;
  color?: string;
  className?: string;
  size?: "xs" | "sm" | "md";
  showDot?: boolean;
  uppercase?: boolean;
  title?: string;
  onClick?: (e: React.MouseEvent) => void;
}

export const DiscordRolePill = memo(function DiscordRolePill({
  name,
  label,
  color,
  className = "",
  size = "sm",
  showDot = false,
  uppercase = true,
  title,
  onClick,
}: DiscordRolePillProps) {
  const rawLabel = label || formatRoleLabel(name);
  const resolvedLabel = uppercase ? rawLabel.toUpperCase() : rawLabel;
  const resolvedColor = color || getStandardRoleColor(name);
  const textColor = getContrastTextColor(resolvedColor);

  const sizeClasses =
    size === "xs"
      ? "px-1.5 py-0.2 text-[9px]"
      : size === "sm"
      ? "px-2 py-0.5 text-[10px]"
      : "px-2.5 py-1 text-[11px]";

  return (
    <span
      onClick={onClick}
      title={title || `Role: ${resolvedLabel}`}
      style={{
        backgroundColor: resolvedColor,
        color: textColor,
        borderColor:
          textColor === "#000000"
            ? "rgba(0, 0, 0, 0.25)"
            : "rgba(255, 255, 255, 0.2)",
      }}
      className={`inline-flex items-center justify-center gap-1 font-bold font-mono tracking-wider rounded-[4px] border select-none shadow-xs shrink-0 transition-transform active:scale-95 ${sizeClasses} ${
        onClick ? "cursor-pointer hover:brightness-105" : "cursor-default"
      } ${className}`}
    >
      {showDot && (
        <span
          className="w-1.5 h-1.5 rounded-full shrink-0"
          style={{ backgroundColor: textColor }}
          aria-hidden="true"
        />
      )}
      <span className="truncate max-w-[160px] leading-tight">{resolvedLabel}</span>
    </span>
  );
});
