// ================================================
// FILE: src/app/components/layout/SecurityBanner.tsx
// ================================================

import { useEffect, useState } from "react";
import { AlertOctagon, Info } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { safeOpenExternal } from "../../../store/useExternalLinkStore";

interface SecurityAlert {
  id: string;
  is_active: boolean;
  message: string;
  severity: "info" | "warning" | "critical";
  link_url?: string;
  link_text?: string;
}

export const SecurityBanner = () => {
  const [alert, setAlert] = useState<SecurityAlert | null>(null);

  useEffect(() => {
    // Fetch initial alert state
    const fetchAlert = async () => {
      const { data, error } = await supabase
        .from("global_alerts")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        setAlert(data as SecurityAlert);
      }
    };

    fetchAlert();

    // Subscribe to real-time changes so we can broadcast instantly
    const channelToken = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    let channel: any = null;

    try {
      for (const ch of supabase.getChannels()) {
        if (
          ch.topic.startsWith("realtime:global-alerts-") ||
          ch.topic === "realtime:public:global_alerts"
        ) {
          void supabase.removeChannel(ch);
        }
      }
    } catch {
      // Ignore cleanup error
    }

    try {
      channel = supabase
        .channel(`global-alerts-${channelToken}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "global_alerts" },
          (payload) => {
            if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
              const newRecord = payload.new as SecurityAlert;
              if (newRecord.is_active) {
                setAlert(newRecord);
              } else {
                setAlert((prev) => (prev?.id === newRecord.id ? null : prev));
              }
            } else if (payload.eventType === "DELETE") {
              setAlert((prev) => (prev?.id === payload.old.id ? null : prev));
            }
          }
        )
        .subscribe();
    } catch {
      // Ignore channel subscribe failure
    }

    return () => {
      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, []);

  if (!alert) return null;

  const bgColors = {
    critical: "bg-destructive text-destructive-foreground",
    warning: "bg-[#FAA61A] text-black",
    info: "bg-primary text-primary-foreground",
  };

  const Icon = alert.severity === "info" ? Info : AlertOctagon;

  // Strict URL protocol validation to prevent javascript: or data: XSS injection
  const getSafeUrl = (url: string | undefined): string | null => {
    if (!url) return null;
    try {
      const parsed = new URL(url);
      if (parsed.protocol === "http:" || parsed.protocol === "https:") {
        return parsed.href;
      }
      return null;
    } catch {
      return null;
    }
  };

  const safeUrl = getSafeUrl(alert.link_url);

  return (
    <div className={`w-full px-4 py-3 flex items-center justify-center gap-3 shadow-md z-[100] ${bgColors[alert.severity]}`}>
      <Icon className="w-5 h-5 shrink-0 animate-pulse" />
      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
        <p className="text-[13px] sm:text-[14px] font-bold tracking-wide">
          {alert.message}
        </p>
        {safeUrl && (
          <a
            href={safeUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => {
              e.preventDefault();
              safeOpenExternal(safeUrl);
            }}
            className="text-[12px] underline font-black hover:opacity-80 transition-opacity whitespace-nowrap cursor-pointer"
          >
            {alert.link_text || "Read More"}
          </a>
        )}
      </div>
    </div>
  );
};
