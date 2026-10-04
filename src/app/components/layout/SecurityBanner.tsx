import React, { useEffect, useState } from "react";
import { AlertOctagon, Info } from "lucide-react";
import { supabase } from "../../../lib/supabase";

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
        .single();
        
      if (!error && data) {
        setAlert(data as SecurityAlert);
      }
    };

    fetchAlert();

    // Subscribe to real-time changes so we can broadcast instantly
    const channel = supabase
      .channel("public:global_alerts")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "global_alerts" },
        (payload) => {
          if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
            const newRecord = payload.new as SecurityAlert;
            if (newRecord.is_active) {
              setAlert(newRecord);
            } else if (alert?.id === newRecord.id) {
              setAlert(null); // Alert was deactivated
            }
          } else if (payload.eventType === "DELETE") {
            if (alert?.id === payload.old.id) {
              setAlert(null);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [alert?.id]);

  if (!alert) return null;

  const bgColors = {
    critical: "bg-destructive text-destructive-foreground",
    warning: "bg-[#FAA61A] text-black",
    info: "bg-primary text-primary-foreground",
  };

  const Icon = alert.severity === "info" ? Info : AlertOctagon;

  return (
    <div className={`w-full px-4 py-3 flex items-center justify-center gap-3 shadow-md z-[100] ${bgColors[alert.severity]}`}>
      <Icon className="w-5 h-5 shrink-0 animate-pulse" />
      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
        <p className="text-[13px] sm:text-[14px] font-bold tracking-wide">
          {alert.message}
        </p>
        {alert.link_url && (
          <a 
            href={alert.link_url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-[12px] underline font-black hover:opacity-80 transition-opacity whitespace-nowrap"
          >
            {alert.link_text || "Read More"}
          </a>
        )}
      </div>
    </div>
  );
};
