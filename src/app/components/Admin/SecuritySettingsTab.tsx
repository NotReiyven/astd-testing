import React, { useState, useEffect } from "react";
import { AlertOctagon, ShieldAlert, Send, StopCircle, RefreshCw } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { useNotificationStore } from "../../../store/useNotificationStore";

interface SecurityAlert {
  id: string;
  is_active: boolean;
  message: string;
  severity: "info" | "warning" | "critical";
  link_url?: string;
  link_text?: string;
}

export const SecuritySettingsTab = () => {
  const [activeAlert, setActiveAlert] = useState<SecurityAlert | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const addToast = useNotificationStore((s) => s.addToast);

  const [message, setMessage] = useState("");
  const [severity, setSeverity] = useState<"info" | "warning" | "critical">("critical");
  const [linkUrl, setLinkUrl] = useState("");
  const [linkText, setLinkText] = useState("");

  const fetchCurrentAlert = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("global_alerts")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!error && data) {
      setActiveAlert(data as SecurityAlert);
    } else {
      setActiveAlert(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCurrentAlert();
  }, []);

  const handleBroadcast = async () => {
    if (!message.trim()) {
      addToast("Please enter a message for the alert.", "error");
      return;
    }

    // Safety confirmation for critical alerts
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
      // If there's an existing active alert, deactivate it first
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
      await fetchCurrentAlert();
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

      addToast("Alert deactivated.", "success");
      await fetchCurrentAlert();
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
      </div>
    </div>
  );
};
