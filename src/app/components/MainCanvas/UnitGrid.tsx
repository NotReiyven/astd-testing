import React, { memo } from "react";
import { MasterUnit } from "../../../types";
import { TierGridCard } from "./UnitCard/TierGridCard";

export * from "../shared/Formatters";
export { TierGridCard };

export const UnitGrid = memo(function UnitGrid({
  units,
}: {
  units: MasterUnit[];
}) {
  return (
    <div
      className="grid gap-[var(--gap-md)] w-full pb-[var(--gap-lg)]"
      style={{
        gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 160px), 1fr))",
      }}
    >
      {units.map((unit) => (
        <TierGridCard key={unit.id} unit={unit} />
      ))}
    </div>
  );
});