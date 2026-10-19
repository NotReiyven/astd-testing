import React, { useState, useEffect, useCallback } from "react";
import {
  GiLockedFortress,
  GiShieldEchoes,
  GiPadlock,
  GiKey,
  GiScrollUnfurled,
  GiRadarSweep,
} from "react-icons/gi";
import { supabase } from "../../../lib/supabase";
import { useAuthStore } from "../../../store/useAuthStore";
import { useToastStore } from "../../../store/useToastStore";
import { logger } from "../../../lib/logger";
import { triggerHaptic } from "../../../data/helpers";
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

const ALERT_PRESETS: {
  label: string;
  severity: "info" | "warning" | "critical";
  message: string;
}[] = [
  {
    label: "Sheet Sync",
    severity: "info",
    message:
      "Market values and unit tiers are syncing with the latest update log.",
  },
  {
    label: "Maintenance",
    severity: "warning",
    message:
      "Trading Ads & Vault sync are undergoing scheduled maintenance.",
  },
  {
    label: "Scam Warning",
    severity: "critical",
    message:
      "SECURITY ALERT: Never click external links or Discord server invites sent via trade notes.",
  },
];

const alertSchema = z.object({
  message: z
    .string()
    .min(5, "Message must be at least 5 characters.")
    .max(1000, "Message cannot exceed 1,000 characters."),
  severity: z.enum(["info", "warning", "critical"]),
  link_url: z.union([
    z.string().url("Enter a valid https:// URL.").max(500),
    z.literal(""),
    z.null(),
  ]),
  link_text: z.string().max(50).nullable().optional(),
});

export const SecuritySettingsTab = () => {
  const { profile } = useAuthStore();
  const addToast = useToastStore((s) => s.addToast);

  const [clearanceStep, setClearanceStep] = useState<
    "locked" | "verifying" | "challenge" | "unlocked"
  >("locked");
  const [challengeInput, setChallengeInput] = useState("");
  const [ackChecked, setAckChecked] = useState(false);
  const [unlockExpiresAt, setUnlockExpiresAt] = useState<number | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);

  const [activeAlert, setActiveAlert] = useState<SecurityAlert | null>(null);
  const [history, setHistory] = useState<SecurityAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [confirmingCritical, setConfirmingCritical] = useState(false);

  const [message, setMessage] = useState("");
  const [severity, setSeverity] = useState<"info" | "warning" | "critical">(
    "critical"
  );
  const [linkUrl, setLinkUrl] = useState("");
  const [linkText, setLinkText] = useState("");

  const isMasterClient = profile?.role?.toLowerCase() === "master";

  const fetchAlerts = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  useEffect(() => {
    if (clearanceStep !== "unlocked" || !unlockExpiresAt) return;
    const updateTimer = () => {
      const left = Math.max(
        0,
        Math.floor((unlockExpiresAt - Date.now()) / 1000)
      );
      setRemainingSeconds(left);
      if (left <= 0) {
        setClearanceStep("locked");
        setChallengeInput("");
        setAckChecked(false);
        addToast("Security terminal locked (session timeout).", "info");
      }
    };
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [clearanceStep, unlockExpiresAt, addToast]);

  const handleBeginHandshake = async () => {
    triggerHaptic("medium");
    setClearanceStep("verifying");

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      setClearanceStep("locked");
      addToast("No active session found.", "error");
      return;
    }

    const { data: liveRow, error } = await supabase
      .from("profiles")
      .select("id, role, username")
      .eq("id", session.user.id)
      .single();

    if (error || liveRow?.role?.toLowerCase() !== "master") {
      setClearanceStep("locked");
      addToast("Master clearance required.", "error");
      return;
    }

    setClearanceStep("challenge");
  };

  const handleUnlockTerminal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isMasterClient) {
      setClearanceStep("locked");
      return;
    }
    if (challengeInput.trim().toUpperCase() !== "MASTER-UNLOCK") {
      addToast("Enter MASTER-UNLOCK or click Auto-fill to unlock.", "error");
      return;
    }

    triggerHaptic("heavy");
    setAckChecked(true);
    setUnlockExpiresAt(Date.now() + 10 * 60 * 1000);
    setClearanceStep("unlocked");
    addToast("Security terminal unlocked (10m).", "success");
  };

  const handleLockTerminal = () => {
    triggerHaptic("light");
    setClearanceStep("locked");
    setChallengeInput("");
    setAckChecked(false);
    setConfirmingCritical(false);
    setUnlockExpiresAt(null);
  };

  const verifyLiveMasterBeforeWrite = async (): Promise<boolean> => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user) return false;
    const { data } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", session.user.id)
      .single();
    return data?.role?.toLowerCase() === "master";
  };

  const handleBroadcast = async () => {
    const validationResult = alertSchema.safeParse({
      message: message.trim(),
      severity,
      link_url: linkUrl.trim() || null,
      link_text: linkText.trim() || null,
    });

    if (!validationResult.success) {
      addToast(validationResult.error.issues[0].message, "error");
      return;
    }

    if (severity === "critical" && !confirmingCritical) {
      setConfirmingCritical(true);
      return;
    }

    setSubmitting(true);
    try {
      const stillMaster = await verifyLiveMasterBeforeWrite();
      if (!stillMaster) {
        addToast("Master verification failed.", "error");
        setClearanceStep("locked");
        return;
      }

      if (activeAlert) {
        await supabase
          .from("global_alerts")
          .update({ is_active: false })
          .eq("id", activeAlert.id);
      }

      const { error } = await supabase.from("global_alerts").insert({
        message: message.trim(),
        severity,
        is_active: true,
        link_url: linkUrl.trim() || null,
        link_text: linkText.trim() || null,
      });

      if (error) throw error;

      triggerHaptic("heavy");
      addToast("Broadcast deployed.", "success");
      setMessage("");
      setLinkUrl("");
      setLinkText("");
      setConfirmingCritical(false);
      await fetchAlerts();
    } catch (err) {
      addToast("Broadcast failed.", "error");
      logger.error('ASTD-UI-010', 'Broadcast failed', { err });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivate = async () => {
    if (!activeAlert) return;
    setSubmitting(true);
    try {
      const stillMaster = await verifyLiveMasterBeforeWrite();
      if (!stillMaster) {
        setClearanceStep("locked");
        return;
      }

      const { error } = await supabase
        .from("global_alerts")
        .update({ is_active: false })
        .eq("id", activeAlert.id);

      if (error) throw error;

      setActiveAlert(null);
      triggerHaptic("medium");
      addToast("Alert terminated.", "success");
      await fetchAlerts();
    } catch (err) {
      addToast("Failed to terminate alert.", "error");
      logger.error('ASTD-UI-011', 'Alert termination failed', { err });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteHistoryItem = async (id: string) => {
    const stillMaster = await verifyLiveMasterBeforeWrite();
    if (!stillMaster) return;

    const { error } = await supabase
      .from("global_alerts")
      .delete()
      .eq("id", id);
    if (!error) {
      setHistory((prev) => prev.filter((item) => item.id !== id));
      if (activeAlert?.id === id) setActiveAlert(null);
    }
  };

  const getSeverityBadgeStyle = (sev: string) => {
    if (sev === "critical")
      return "text-destructive border-destructive/50 bg-destructive/15";
    if (sev === "warning")
      return "text-[#FAA61A] border-[#FAA61A]/50 bg-[#FAA61A]/15";
    return "text-primary border-primary/50 bg-primary/15";
  };

  if (!isMasterClient) {
    return (
      <div className="flex-1 p-6 flex items-center justify-center text-center">
        <div className="bg-card border border-destructive/40 rounded-[6px] p-6 max-w-sm flex flex-col items-center gap-2">
          <GiPadlock className="w-8 h-8 text-destructive" />
          <h2 className="text-[14px] text-foreground">Master Only</h2>
        </div>
      </div>
    );
  }

  if (clearanceStep !== "unlocked") {
    return (
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 flex items-center justify-center animate-fade-in">
        <div className="max-w-md w-full bg-card border border-border rounded-[6px] p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2.5">
              <GiLockedFortress className="w-5 h-5 text-destructive" />
              <span className="text-[14px] text-foreground">
                Security Clearance
              </span>
            </div>
            <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded bg-destructive/15 text-destructive border border-destructive/40">
              Locked
            </span>
          </div>

          <div className="bg-input/60 border border-border rounded-[5px] p-3 flex items-center justify-between gap-2 font-mono text-[11px]">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  activeAlert ? "bg-destructive animate-ping" : "bg-[#23a559]"
                }`}
              />
              <span className="text-foreground truncate">
                {loading
                  ? "Checking…"
                  : activeAlert
                  ? `ACTIVE: ${activeAlert.message}`
                  : "No Active Alert"}
              </span>
            </div>
            <span className="text-muted-foreground shrink-0">
              {history.length} logs
            </span>
          </div>

          {clearanceStep === "locked" && (
            <button
              type="button"
              onClick={handleBeginHandshake}
              className="w-full h-9 rounded-[5px] bg-primary hover:bg-primary/90 text-primary-foreground text-[12px] font-mono flex items-center justify-center gap-2 cursor-pointer"
            >
              <GiKey className="w-3.5 h-3.5" />
              Verify Master Session
            </button>
          )}

          {clearanceStep === "verifying" && (
            <div className="py-4 flex items-center justify-center gap-2 text-[11px] font-mono text-muted-foreground">
              <GiRadarSweep className="w-4 h-4 animate-spin text-primary" />
              <span>Verifying session…</span>
            </div>
          )}

          {clearanceStep === "challenge" && (
            <form
              onSubmit={handleUnlockTerminal}
              className="flex flex-col gap-3 font-mono"
            >
              <button
                type="button"
                onClick={() => setAckChecked((prev) => !prev)}
                className={`flex items-center gap-2.5 p-2.5 rounded-[5px] border cursor-pointer text-[11px] text-left transition-colors ${
                  ackChecked
                    ? "bg-[#23a559]/15 border-[#23a559]/50 text-foreground"
                    : "bg-input/50 border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                <span
                  className={`w-4 h-4 rounded-[3px] border flex items-center justify-center text-[10px] shrink-0 ${
                    ackChecked
                      ? "bg-[#23a559] border-[#23a559] text-white"
                      : "bg-card border-border text-transparent"
                  }`}
                >
                  ✓
                </span>
                <span>Confirm global broadcast responsibility</span>
              </button>

              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-muted-foreground">
                    TYPE: <strong className="text-foreground">MASTER-UNLOCK</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setChallengeInput("MASTER-UNLOCK");
                      setAckChecked(true);
                    }}
                    className="text-primary hover:underline cursor-pointer"
                  >
                    Auto-fill
                  </button>
                </div>
                <input
                  id="security-unlock-challenge-input"
                  name="unlock_challenge"
                  type="text"
                  autoFocus
                  value={challengeInput}
                  onChange={(e) => {
                    setChallengeInput(e.target.value);
                    if (e.target.value.trim().toUpperCase() === "MASTER-UNLOCK") {
                      setAckChecked(true);
                    }
                  }}
                  placeholder="Enter passphrase…"
                  aria-label="Passphrase to unlock maintenance control"
                  autoComplete="off"
                  spellCheck={false}
                  className="w-full h-8 bg-input border border-border rounded-[4px] px-2.5 text-[11px] text-foreground focus:outline-none focus:border-primary"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setClearanceStep("locked");
                    setChallengeInput("");
                    setAckChecked(false);
                  }}
                  className="px-3 h-8 rounded-[4px] bg-muted text-foreground text-[11px] border border-border cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 h-8 rounded-[4px] bg-destructive hover:bg-destructive/90 text-white text-[11px] cursor-pointer transition-colors"
                >
                  Unlock Terminal
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    );
  }

  const minsLeft = Math.floor(remainingSeconds / 60);
  const secsLeft = remainingSeconds % 60;

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar p-3 sm:p-5 animate-fade-in">
      <div className="max-w-4xl mx-auto flex flex-col gap-4 pb-8">
        <div className="bg-card border border-border rounded-[6px] p-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <GiShieldEchoes className="w-4 h-4 text-destructive" />
            <span className="text-[13px] text-foreground">
              Emergency Broadcast
            </span>
            <span className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-[#23a559]/15 text-[#23a559] border border-[#23a559]/40">
              {minsLeft}:{secsLeft.toString().padStart(2, "0")}
            </span>
          </div>

          <button
            type="button"
            onClick={handleLockTerminal}
            className="h-7 px-2.5 rounded-[4px] bg-destructive/15 hover:bg-destructive text-destructive hover:text-white border border-destructive/40 text-[10.5px] font-mono flex items-center gap-1 cursor-pointer"
          >
            <GiPadlock className="w-3 h-3" />
            Lock
          </button>
        </div>

        {activeAlert && (
          <div className="bg-destructive/10 border border-destructive rounded-[6px] p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono">
            <div className="min-w-0">
              <div className="text-[10px] uppercase text-destructive font-bold">
                LIVE ({activeAlert.severity})
              </div>
              <div className="text-[12px] text-foreground break-words mt-0.5">
                {activeAlert.message}
              </div>
            </div>
            <button
              type="button"
              onClick={handleDeactivate}
              disabled={submitting}
              className="bg-destructive text-white px-3 py-1.5 rounded-[4px] text-[11px] shrink-0 cursor-pointer disabled:opacity-50"
            >
              Kill Alert
            </button>
          </div>
        )}

        <div className="bg-card border border-border rounded-[6px] p-4 flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2">
            <span className="text-[12px] text-foreground">New Alert</span>
            <div className="flex flex-wrap gap-1">
              {ALERT_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => {
                    triggerHaptic("light");
                    setSeverity(preset.severity);
                    setMessage(preset.message);
                    setConfirmingCritical(false);
                  }}
                  className="px-2 py-0.5 rounded bg-input hover:bg-muted border border-border text-[10px] font-mono text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 font-mono">
            {(["info", "warning", "critical"] as const).map((sev) => (
              <button
                key={sev}
                type="button"
                onClick={() => {
                  setSeverity(sev);
                  setConfirmingCritical(false);
                }}
                className={`h-8 rounded-[4px] border text-[11px] uppercase cursor-pointer ${
                  severity === sev
                    ? getSeverityBadgeStyle(sev)
                    : "bg-input border-border text-muted-foreground"
                }`}
              >
                {sev}
              </button>
            ))}
          </div>

          <textarea
            id="security-broadcast-message"
            name="broadcast_message"
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              setConfirmingCritical(false);
            }}
            placeholder="Broadcast message…"
            aria-label="Broadcast message"
            className="w-full h-20 bg-input border border-border rounded-[4px] p-2.5 text-[12px] font-mono text-foreground focus:outline-none focus:border-primary resize-none"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono">
            <input
              id="security-broadcast-link-url"
              name="broadcast_link_url"
              type="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="Link URL (optional)…"
              aria-label="Broadcast link URL (optional)"
              className="h-8 bg-input border border-border rounded-[4px] px-2.5 text-[11px] text-foreground focus:outline-none focus:border-primary"
            />
            <input
              id="security-broadcast-link-text"
              name="broadcast_link_text"
              type="text"
              value={linkText}
              onChange={(e) => setLinkText(e.target.value)}
              placeholder="Link label (optional)…"
              aria-label="Broadcast link label (optional)"
              className="h-8 bg-input border border-border rounded-[4px] px-2.5 text-[11px] text-foreground focus:outline-none focus:border-primary"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            {confirmingCritical && (
              <button
                type="button"
                onClick={() => setConfirmingCritical(false)}
                className="h-8 px-3 rounded-[4px] bg-muted text-foreground text-[11px] font-mono border border-border cursor-pointer"
              >
                Cancel
              </button>
            )}
            <button
              type="button"
              onClick={handleBroadcast}
              disabled={submitting || message.trim().length < 5}
              className={`h-8 px-4 rounded-[4px] font-mono text-[11px] cursor-pointer disabled:opacity-40 ${
                confirmingCritical
                  ? "bg-destructive text-white"
                  : "bg-primary text-primary-foreground"
              }`}
            >
              {submitting
                ? "Sending…"
                : confirmingCritical
                ? "Confirm Critical Broadcast"
                : "Broadcast"}
            </button>
          </div>
        </div>

        <div className="bg-card border border-border rounded-[6px] p-4 flex flex-col gap-2">
          <div className="text-[12px] text-foreground border-b border-border pb-2 flex items-center gap-1.5">
            <GiScrollUnfurled className="w-3.5 h-3.5 text-primary" />
            History ({history.length})
          </div>

          {history.length === 0 ? (
            <div className="p-4 text-center text-[11px] font-mono text-muted-foreground">
              No broadcasts recorded.
            </div>
          ) : (
            <div className="flex flex-col gap-1.5 max-h-[280px] overflow-y-auto custom-scrollbar pr-1 font-mono">
              {history.map((item) => (
                <div
                  key={item.id}
                  className="p-2.5 bg-input/50 border border-border rounded-[4px] flex items-center justify-between gap-2 text-[11px]"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-[9.5px] uppercase px-1.5 rounded border ${getSeverityBadgeStyle(
                          item.severity
                        )}`}
                      >
                        {item.severity}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(item.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="text-foreground truncate mt-0.5">
                      {item.message}
                    </div>
                  </div>

                  {!item.is_active && (
                    <button
                      type="button"
                      onClick={() => handleDeleteHistoryItem(item.id)}
                      className="text-[10px] text-muted-foreground hover:text-destructive px-2 py-0.5 rounded bg-card border border-border cursor-pointer shrink-0"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
