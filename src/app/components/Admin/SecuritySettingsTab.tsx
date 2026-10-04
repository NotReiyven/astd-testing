import React, { useState, useEffect } from "react";
import { AlertOctagon, ShieldAlert, Send, StopCircle, RefreshCw, History, CheckCircle2 } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { useNotificationStore } from "../../../store/useNotificationStore";
import { z } from "zod";

interface SecurityAlert {
  id: string;
  is_active: boolean;
  message: string;
  severity: "info" | "warning" | "critical";
  link_url?: string;
  link_text?: string;
  created_at: string;
}

export const SecuritySettingsTab = () => {
  const [activeAlert, setActiveAlert] = useState<SecurityAlert | null>(null);
  const [history, setHistory] = useState<SecurityAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const addToast = useNotificationStore((s) => s.addToast);

  const [message, setMessage] = useState("");
  const [severity, setSeverity] = useState<"info" | "warning" | "critical">("critical");
  const [linkUrl, setLinkUrl] = useState("");
  const [linkText, setLinkText] = useState("");

  const fetchAlerts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("global_alerts")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      const active = data.find((a: SecurityAlert) => a.is_active);
      setActiveAlert(active || null);
      setHistory(data as SecurityAlert[]);
    } else {
      setActiveAlert(null);
      setHistory([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const alertSchema = z.object({
    message: z.string().min(5, "Message is too short").max(1000, "Message is too long"),
    severity: z.enum(["info", "warning", "critical"]),
    link_url: z.union([z.string().url("Invalid URL format").max(500), z.literal(""), z.null()]),
    link_text: z.string().max(50).nullable().optional(),
  });

  const handleBroadcast = async () => {
    // 1. Validate Input (Prevents Injection/Form tampering)
    const validationResult = alertSchema.safeParse({
      message: message.trim(),
      severity,
      link_url: linkUrl.trim() || null,
      link_text: linkText.trim() || null,
    });

    if (!validationResult.success) {
      addToast(validationResult.error.errors[0].message, "error");
      return;
    }

    if (
      severity === "critical" &&
      !window.confirm(
        "WARNING: You are about to broadcast a CRITICAL security alert to ALL active users instantly. Proceed?"
      )
    ) {
      return;
    }

    setSubmitting(true);
    try {
      if (activeAlert) {
        await supabase
          .from("global_alerts")
          .update({ is_active: false })
          .eq("id", activeAlert.id);
      }

      const payload = {
        message: message.trim(),
        severity,
        is_active: true,
        link_url: linkUrl.trim() || null,
        link_text: linkText.trim() || null,
      };

      const { error } = await supabase.from("global_alerts").insert(payload);

      if (error) throw error;

      addToast("Emergency alert broadcasted globally.", "success");
      setMessage("");
      setLinkUrl("");
      setLinkText("");
      await fetchAlerts();
    } catch (err: any) {
      addToast("Failed to broadcast alert. Check permissions.", "error");
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivate = async () => {
    if (!activeAlert) return;

    if (!window.confirm("Are you sure you want to disable the active security alert?")) {
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("global_alerts")
        .update({ is_active: false })
        .eq("id", activeAlert.id);

      if (error) throw error;

      // Optimistically clear the active alert to instantly update UI
      setActiveAlert(null); 
      addToast("Alert deactivated.", "success");
      
      // Fetch latest to update history list
      await fetchAlerts();
    } catch (err: any) {
      addToast("Failed to deactivate alert.", "error");
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 p-[var(--page-p)] flex justify-center items-center">
        <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const getSeverityColor = (sev: string) => {
    if (sev === "critical") return "text-destructive border-destructive bg-destructive/10";
    if (sev === "warning") return "text-[#FAA61A] border-[#FAA61A] bg-[#FAA61A]/10";
    return "text-primary border-primary bg-primary/10";
  };

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar p-[var(--page-p)] animate-fade-in bg-transparent z-10">
      <div className="max-w-3xl mx-auto flex flex-col gap-[var(--gap-lg)]">
        <div className="flex items-center gap-3.5 mb-2">
          <ShieldAlert className="w-8 h-8 text-destructive drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
          <div>
            <h1 className="text-[20px] font-black uppercase tracking-tight text-foreground leading-tight">
              Emergency Broadcast System
            </h1>
            <p className="text-[var(--ui-text-sm)] text-muted-foreground font-medium uppercase tracking-widest mt-0.5">
              Master Clearance Required
            </p>
          </div>
        </div>

        {activeAlert && (
          <div className="bg-destructive/10 border-2 border-destructive rounded-lg p-5">
            <h2 className="text-destructive font-bold uppercase tracking-wider mb-2 flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-destructive"></span>
              </span>
              Active Global Alert
            </h2>
            <p className="text-foreground font-medium mb-4">{activeAlert.message}</p>
            <button
              onClick={handleDeactivate}
              disabled={submitting}
              className="bg-destructive text-destructive-foreground px-4 py-2 rounded font-bold uppercase tracking-wider text-[var(--ui-text-sm)] hover:bg-destructive/90 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <StopCircle className="w-4 h-4" /> Kill Alert
            </button>
          </div>
        )}

        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <h2 className="text-[16px] font-bold uppercase text-foreground mb-4">
            Broadcast New Alert
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-[var(--ui-text-xs)] font-bold text-muted-foreground uppercase tracking-widest mb-1.5">
                Severity Level
              </label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value as any)}
                className="w-full bg-background border border-border rounded-md px-3 py-2 text-[var(--ui-text-sm)] text-foreground focus:outline-none focus:border-primary transition-colors"
              >
                <option value="info">Info (Blue - General Notice)</option>
                <option value="warning">Warning (Yellow - Important)</option>
                <option value="critical">Critical (Red - Security/Breach)</option>
              </select>
            </div>

            <div>
              <label className="block text-[var(--ui-text-xs)] font-bold text-muted-foreground uppercase tracking-widest mb-1.5">
                Broadcast Message
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Enter emergency message..."
                className="w-full h-24 bg-background border border-border rounded-md px-3 py-2 text-[var(--ui-text-sm)] text-foreground focus:outline-none focus:border-primary transition-colors resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[var(--ui-text-xs)] font-bold text-muted-foreground uppercase tracking-widest mb-1.5">
                  Link URL (Optional)
                </label>
                <input
                  type="url"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full bg-background border border-border rounded-md px-3 py-2 text-[var(--ui-text-sm)] text-foreground focus:outline-none focus:border-primary transition-colors"
                />
              </div>
              <div>
                <label className="block text-[var(--ui-text-xs)] font-bold text-muted-foreground uppercase tracking-widest mb-1.5">
                  Link Text (Optional)
                </label>
                <input
                  type="text"
                  value={linkText}
                  onChange={(e) => setLinkText(e.target.value)}
                  placeholder="e.g., Read Incident Report"
                  className="w-full bg-background border border-border rounded-md px-3 py-2 text-[var(--ui-text-sm)] text-foreground focus:outline-none focus:border-primary transition-colors"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-border mt-6">
              <button
                onClick={handleBroadcast}
                disabled={submitting || !message.trim()}
                className="w-full bg-primary text-primary-foreground font-bold uppercase tracking-wider py-3 rounded-md flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {submitting ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Send className="w-5 h-5" /> Broadcast Now
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* History Log */}
        {history.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm mb-12">
            <h2 className="text-[16px] font-bold uppercase text-foreground mb-4 flex items-center gap-2">
              <History className="w-5 h-5" /> Broadcast History Log
            </h2>
            <div className="space-y-3">
              {history.map((alert) => (
                <div key={alert.id} className="p-4 bg-background border border-border rounded-md flex flex-col sm:flex-row gap-4 justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${getSeverityColor(alert.severity)}`}>
                        {alert.severity}
                      </span>
                      {alert.is_active ? (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-green-500 bg-green-500/10 px-2 py-0.5 rounded flex items-center gap-1">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                          </span>
                          Active
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted/50 px-2 py-0.5 rounded flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Concluded
                        </span>
                      )}
                      <span className="text-[11px] text-muted-foreground font-medium">
                        {new Date(alert.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-[var(--ui-text-sm)] text-foreground font-medium">{alert.message}</p>
                    {alert.link_url && (
                      <a href={alert.link_url} target="_blank" rel="noopener noreferrer" className="text-[12px] text-primary hover:underline mt-1 inline-block">
                        {alert.link_text || "Attached Link"}
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
