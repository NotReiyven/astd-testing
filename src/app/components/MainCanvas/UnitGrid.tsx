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
      className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] md:grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-[var(--gap-md)] w-full pb-8"
      
    >
      {units.map((unit) => (
        <TierGridCard key={unit.id} unit={unit} />
      ))}
    </div>
  );
});