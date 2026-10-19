import { useState, useEffect } from "react";
import { TradeCard } from "../types";
import { logger } from "../lib/logger";

export function useStickyState<T>(
  defaultValue: T,
  key: string,
  isValid: (value: unknown) => value is T = (_value): _value is T => true
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    try {
      const stickyValue = window.localStorage.getItem(key);
      if (stickyValue !== null) {
        const parsed = JSON.parse(stickyValue);
        if (isValid(parsed)) return parsed;
      }
    } catch (err) {
      logger.warn("ASTD-UI-013", `Failed to read sticky state key "${key}"`, {
        scope: "useStickyState",
        action: "readKey",
        metadata: { key },
        error: err,
      });
    }
    return defaultValue;
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
      logger.warn("ASTD-UI-014", `Failed to persist sticky state key "${key}"`, {
        scope: "useStickyState",
        action: "writeKey",
        metadata: { key },
        error: err,
      });
    }
  }, [key, value]);

  return [value, setValue];
}

export const isTradeCardArray = (value: unknown): value is TradeCard[] =>
  Array.isArray(value) &&
  value.every(
    (item) =>
      item &&
      typeof item === "object" &&
      typeof (item as any).id === "string" &&
      typeof (item as any).qty === "number"
  );

export const isBoolean = (value: unknown): value is boolean =>
  typeof value === "boolean";
export const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0;
