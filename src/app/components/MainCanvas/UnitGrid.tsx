import React, { memo } from "react";
import { MasterUnit } from "../../../types";
import { TierGridCard } from "./UnitCard/TierGridCard";

// Export these so all existing imports elsewhere still work flawlessly
export * from "../shared/Formatters";
export { TierGridCard };

export const UnitGrid = memo(function UnitGrid({ units }: { units: MasterUnit[] }) {
  return (
    <div className="grid gap-3 sm:gap-5 w-full pb-3 sm:pb-5" style={{ gridTemplateColumns: window.innerWidth >= 768 ? "repeat(auto-fill, minmax(200px, 1fr))" : "repeat(auto-fill, minmax(min(100%, 155px), 1fr))" }}>
      {units.map((unit) => (
        <TierGridCard key={unit.id} unit={unit} />
      ))}
    </div>
  );
});