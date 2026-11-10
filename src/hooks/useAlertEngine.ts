// ================================================
// FILE: src/hooks/useAlertEngine.ts
// ================================================

import { useEffect, useRef } from "react";
import { useUnits } from "../context/UnitContext";
import { useAuthStore } from "../store/useAuthStore";
import { MasterUnit } from "../types";
import { startAlertEngine, stopAlertEngine } from "../lib/alertEngine";

export function useAlertEngine() {
  const profile = useAuthStore((s) => s.profile);
  const { units } = useUnits();

  // Keep a live ref so the engine's interval always reads the latest units
  // without needing to restart when units change.
  const unitsRef = useRef<MasterUnit[]>(units);
  useEffect(() => {
    unitsRef.current = units;
  }, [units]);

  useEffect(() => {
    if (!profile?.id) {
      stopAlertEngine();
      return;
    }

    startAlertEngine(profile.id, () => unitsRef.current);

    return () => {
      stopAlertEngine();
    };
  }, [profile?.id]);
}