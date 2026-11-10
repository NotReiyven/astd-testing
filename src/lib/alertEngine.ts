// ================================================
// FILE: src/lib/alertEngine.ts
// ================================================

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useNotificationStore } from "../store/useNotificationStore";
import { useToastStore } from "../store/useToastStore";
import { triggerHaptic } from "../data/helpers";
import { MasterUnit } from "../types";

export interface UnitAlert {
  unitId: string;
  condition: "above" | "below" | "status_change";
  value?: number;
  lastKnownStatus?: string;
  weeklyDigest?: boolean;
}

interface AlertState {
  alerts: Record<string, UnitAlert[]>;
  addAlert: (userId: string, alert: UnitAlert) => void;
  removeAlert: (userId: string, unitId: string, condition: string) => void;
}

export const useAlertStore = create<AlertState>()(
  persist(
    (set) => ({
      alerts: {},
      addAlert: (userId, alert) =>
        set((state) => {
          const userAlerts = state.alerts[userId] || [];
          if (
            userAlerts.some(
              (a) => a.unitId === alert.unitId && a.condition === alert.condition
            )
          ) {
            return state;
          }
          return {
            alerts: {
              ...state.alerts,
              [userId]: [...userAlerts, alert],
            },
          };
        }),
      removeAlert: (userId, unitId, condition) =>
        set((state) => {
          const userAlerts = state.alerts[userId] || [];
          return {
            alerts: {
              ...state.alerts,
              [userId]: userAlerts.filter(
                (a) => !(a.unitId === unitId && a.condition === condition)
              ),
            },
          };
        }),
    }),
    { name: "astd_unit_alerts" }
  )
);

let alertInterval: ReturnType<typeof setInterval> | null = null;

type GetUnits = () => MasterUnit[];

export function startAlertEngine(userId: string, getUnits: GetUnits) {
  if (alertInterval) return;

  alertInterval = setInterval(() => {
    const { alerts } = useAlertStore.getState();
    const userAlerts = alerts[userId] || [];
    if (userAlerts.length === 0) return;

    const units = getUnits();
    if (units.length === 0) return;

    const notifications = useNotificationStore.getState();
    const activeAlerts = [...userAlerts];

    activeAlerts.forEach((alert) => {
      // Weekly alerts are handled by the cron job, not the instant engine.
      if (alert.weeklyDigest) return;

      const unit = units.find((u) => u.id === alert.unitId);
      if (!unit) return;

      let triggered = false;
      let message = "";

      if (alert.condition === "above" && alert.value !== undefined) {
        const currentVal =
          typeof unit.value === "number" ? unit.value : unit.valueMin || 0;
        if (currentVal > alert.value) {
          triggered = true;
          message = `${unit.name} has risen above ${alert.value.toLocaleString()} (Current: ${currentVal.toLocaleString()}).`;
        }
      } else if (alert.condition === "below" && alert.value !== undefined) {
        const currentVal =
          typeof unit.value === "number" ? unit.value : unit.valueMin || 0;
        if (currentVal < alert.value) {
          triggered = true;
          message = `${unit.name} has dropped below ${alert.value.toLocaleString()} (Current: ${currentVal.toLocaleString()}).`;
        }
      } else if (alert.condition === "status_change" && alert.lastKnownStatus) {
        if (unit.status && unit.status !== alert.lastKnownStatus) {
          triggered = true;
          message = `${unit.name} status changed from ${alert.lastKnownStatus} to ${unit.status}.`;
        }
      }

      if (triggered) {
        useAlertStore.getState().removeAlert(userId, alert.unitId, alert.condition);

        void notifications.createNotification({
          user_id: userId,
          type: "value_update",
          title: "Market Alert",
          message,
          action_url: "/value-list",
          action_label: "View Unit",
        });

        triggerHaptic("success");
        useToastStore.getState().addToast(message, "info", {
          action: {
            label: "View",
            onClick: () => {
              window.document.dispatchEvent(
                new CustomEvent("navigate", { detail: "value-list" })
              );
            },
          },
        });
      }
    });
  }, 60000);
}

export function stopAlertEngine() {
  if (alertInterval) {
    clearInterval(alertInterval);
    alertInterval = null;
  }
}

export function getWeeklyDigestAlerts(userId: string): UnitAlert[] {
  const userAlerts = useAlertStore.getState().alerts[userId] || [];
  return userAlerts.filter((a) => a.weeklyDigest === true);
}