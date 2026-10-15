import React, { memo } from "react";

export const STANDARD_ROLE_COLORS: Record<string, string> = {
  master: "#eab308",            // Gold / Master
  admin: "#ef4444",             // Red / Admin
  mod: "#5865F2",               // Discord Blurple / Moderator
  moderator: "#5865F2",         // Discord Blurple
  "value-list-team": "#22c55e", // Discord Green / Value List Team
  valuelistteam: "#22c55e",
  owner: "#f59e0b",             // Amber / Owner
  tester: "#06b6d4",            // Cyan / Tester
  asa: "#a855f7",               // Purple / ASA
  raven: "#ec4899",             // Pink / Raven
  vip: "#8b5cf6",               // Violet / VIP
  banned: "#f43f5e",            // Rose / Banned
  user: "#94a3b8",              // Slate / Member
  trader: "#94a3b8",
};

export function formatRoleLabel(roleName: string): string {
  if (!roleName) return "Member";
  const lower = roleName.trim().toLowerCase();
  switch (lower) {
    case "master":
      return "Master";
    case "admin":
      return "Admin";
    case "mod":
    case "moderator":
      return "Moderator";
    case "value-list-team":
    case "valuelistteam":
      return "Value List Team";
    case "owner":
      return "Owner";
    case "tester":
      return "Tester";
    case "asa":
      return "ASA";
    case "raven":
      return "Raven";
    case "banned":
      return "Banned";
    case "user":
      return "Trader";
    default:
      return roleName
        .split(/[-_\s]+/)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(" ");
  }
}

export function getStandardRoleColor(roleName: string): string {
  if (!roleName) return "#94a3b8";
  const lower = roleName.trim().toLowerCase();
  return STANDARD_ROLE_COLORS[lower] || "#38bdf8";
}

export function getStandardRoleRank(roleName: string): number {
  const lower = roleName.trim().toLowerCase();
  if (lower === "master") return 0;
  if (lower === "admin") return 1;
  if (lower === "mod" || lower === "moderator") return 2;
  if (lower === "value-list-team" || lower === "valuelistteam") return 3;
  if (lower === "owner") return 4;
  if (lower === "tester") return 5;
  if (lower === "asa") return 6;
  if (lower === "raven") return 7;
  if (lower === "banned") return 99;
  return 10;
}

export interface DiscordRolePillProps {
  name: string;
  label?: string;
  color?: string;
  className?: string;
  size?: "sm" | "md";
  showDot?: boolean;
  title?: string;
  onClick?: (e: React.MouseEvent) => void;
}

export const DiscordRolePill = memo(function DiscordRolePill({
  name,
  label,
  color,
  className = "",
  size = "md",
  showDot = true,
  title,
  onClick,
}: DiscordRolePillProps) {
  const resolvedLabel = label || formatRoleLabel(name);
  const resolvedColor = color || getStandardRoleColor(name);

  const isSmall = size === "sm";

  return (
    <span
      onClick={onClick}
      title={title || `Role: ${resolvedLabel}`}
      className={`inline-flex items-center gap-1.5 rounded-[4px] bg-[#2b2d31] hover:bg-[#35373c] border border-[#35373c] text-[#dbdee1] font-medium select-none shadow-xs transition-colors ${
        isSmall ? "px-1.5 py-0.5 text-[10.5px]" : "px-2.5 py-1 text-[11.5px]"
      } ${onClick ? "cursor-pointer" : "cursor-default"} ${className}`}
    >
      {showDot && (
        <span
          className={`rounded-full shrink-0 ${isSmall ? "w-2 h-2" : "w-2.5 h-2.5"}`}
          style={{ backgroundColor: resolvedColor }}
          aria-hidden="true"
        />
      )}
      <span className="truncate max-w-[160px] tracking-tight">{resolvedLabel}</span>
    </span>
  );
});
