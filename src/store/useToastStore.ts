import { create } from "zustand";
import { MOTION_DURATION_MS } from "../lib/motionTokens";

export type ToastType = "success" | "error" | "info" | "warning" | "loading";

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  count: number;
  action?: ToastAction;
  dedupeKey?: string;
  duration: number;
  createdAt: number;
}

export interface ToastOptions {
  id?: string;
  duration?: number;
  dedupeKey?: string;
  action?: ToastAction;
}

interface ToastTimerEntry {
  timer: ReturnType<typeof setTimeout> | null;
  remainingMs: number;
  startedAt: number;
  paused: boolean;
}

const MAX_TOASTS = 4;
const timerRegistry = new Map<string, ToastTimerEntry>();

function clearToastTimer(id: string) {
  const entry = timerRegistry.get(id);
  if (entry?.timer) {
    clearTimeout(entry.timer);
  }
  timerRegistry.delete(id);
}

function scheduleToastTimer(
  id: string,
  durationMs: number,
  onExpire: (toastId: string) => void
) {
  clearToastTimer(id);
  if (durationMs <= 0 || !Number.isFinite(durationMs)) {
    return;
  }

  const startedAt = Date.now();
  const timer = setTimeout(() => {
    timerRegistry.delete(id);
    onExpire(id);
  }, durationMs);

  timerRegistry.set(id, {
    timer,
    remainingMs: durationMs,
    startedAt,
    paused: false,
  });
}

interface ToastState {
  toasts: Toast[];
  addToast: (message: string, type?: ToastType, options?: ToastOptions) => string;
  updateToast: (
    id: string,
    updates: Partial<Pick<Toast, "message" | "type" | "action">> & {
      duration?: number;
    }
  ) => void;
  removeToast: (id: string) => void;
  pauseToast: (id: string) => void;
  resumeToast: (id: string) => void;
}

export const useToastStore = create<ToastState>((set, get) => {
  const expireToast = (toastId: string) => {
    clearToastTimer(toastId);
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== toastId),
    }));
  };

  return {
    toasts: [],

    addToast: (message, type = "info", options) => {
      // Loading toasts must never auto-dismiss until updateToast resolves them
      const resolvedDuration =
        type === "loading"
          ? 0
          : options?.duration !== undefined
            ? options.duration
            : MOTION_DURATION_MS.toast[type];

      const dedupeKey = options?.dedupeKey ?? `${type}:${message}`;
      const existing = get().toasts.find(
        (t) =>
          (options?.id && t.id === options.id) ||
          (t.dedupeKey === dedupeKey && type !== "loading")
      );

      if (existing) {
        const nextCount =
          options?.id && existing.id === options.id && existing.message !== message
            ? 1
            : (existing.count || 1) + 1;

        const updatedToast: Toast = {
          ...existing,
          message,
          type,
          count: nextCount,
          action: options?.action ?? existing.action,
          duration: resolvedDuration,
          createdAt: Date.now(),
        };
        set((state) => ({
          toasts: state.toasts.map((t) =>
            t.id === existing.id ? updatedToast : t
          ),
        }));
        scheduleToastTimer(existing.id, resolvedDuration, expireToast);
        return existing.id;
      }

      const id =
        options?.id || Math.random().toString(36).substring(2, 9);
      const newToast: Toast = {
        id,
        message,
        type,
        count: 1,
        action: options?.action,
        dedupeKey,
        duration: resolvedDuration,
        createdAt: Date.now(),
      };

      set((state) => {
        const next = [...state.toasts, newToast];
        if (next.length > MAX_TOASTS) {
          // Never evict an active loading toast
          const evictIndex = next.findIndex((t) => t.type !== "loading");
          if (evictIndex !== -1) {
            const [evicted] = next.splice(evictIndex, 1);
            if (evicted) {
              clearToastTimer(evicted.id);
            }
          }
        }
        return { toasts: next };
      });

      scheduleToastTimer(id, resolvedDuration, expireToast);
      return id;
    },

    updateToast: (id, updates) => {
      const target = get().toasts.find((t) => t.id === id);
      if (!target) return;

      const nextType = updates.type ?? target.type;
      const nextDuration =
        nextType === "loading"
          ? 0
          : updates.duration !== undefined
            ? updates.duration
            : MOTION_DURATION_MS.toast[nextType];

      set((state) => ({
        toasts: state.toasts.map((t) =>
          t.id === id
            ? {
                ...t,
                message: updates.message ?? t.message,
                type: nextType,
                count: 1,
                action:
                  "action" in updates ? updates.action : t.action,
                duration: nextDuration,
              }
            : t
        ),
      }));

      scheduleToastTimer(id, nextDuration, expireToast);
    },

    removeToast: (id) => {
      clearToastTimer(id);
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }));
    },

    pauseToast: (id) => {
      const entry = timerRegistry.get(id);
      if (!entry || entry.paused || !entry.timer) return;
      clearTimeout(entry.timer);
      const elapsed = Date.now() - entry.startedAt;
      const remainingMs = Math.max(500, entry.remainingMs - elapsed);
      timerRegistry.set(id, {
        timer: null,
        remainingMs,
        startedAt: entry.startedAt,
        paused: true,
      });
    },

    resumeToast: (id) => {
      const entry = timerRegistry.get(id);
      if (!entry || !entry.paused) return;
      scheduleToastTimer(id, entry.remainingMs, expireToast);
    },
  };
});

