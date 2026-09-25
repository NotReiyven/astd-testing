import React from "react";
import { GridUnit, MasterUnit } from "../../../../types";
import { getTier } from "../../../../data";
import { JargonWrap } from "../../shared/Formatters";

export function GridValueDisplay({ unit }: { unit: GridUnit }) {
  if (getTier(unit as MasterUnit) === "Untiered") {
    return (
      <span className="text-[14px] md:text-[20px] font-black tracking-tighter truncate text-muted-foreground font-mono block w-full">
        N/A
      </span>
    );
  }

  if (
    unit.value === "owner" ||
    unit.valueDisplay === "Owner's Choice" ||
    unit.valueDisplay === "O/C"
  ) {
    return (
      <span
        className="text-[13px] md:text-[17px] font-black tracking-tight truncate block w-full"
        style={{
          background: "linear-gradient(90deg, #a78bfa, #f472b6)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
        }}
      >
        <JargonWrap
          title="Owner's Choice (O/C)"
          tip="This unit is so rare the owner dictates the price. Value depends entirely on what they want."
        >
          Owner's Choice
        </JargonWrap>
      </span>
    );
  }

  if (
    unit.valueDisplay &&
    unit.valueDisplay !== "N/A" &&
    !unit.valueDisplay.toLowerCase().startsWith("obtained")
  ) {
    return (
      <span className="text-[14px] md:text-[22px] font-black tracking-tighter truncate text-foreground font-mono block w-full">
        {unit.valueDisplay}
      </span>
    );
  }

  const displayNum =
    typeof unit.value === "number" && unit.value > 0
      ? unit.value
      : typeof unit.valueMin === "number" && unit.valueMin > 0
      ? unit.valueMin
      : null;

  if (displayNum !== null) {
    return (
      <span className="text-[16px] md:text-[22px] font-black tracking-tighter tabular-nums text-foreground font-mono block w-full truncate">
        {displayNum.toLocaleString()}
      </span>
    );
  }

  return (
    <span className="text-[14px] font-bold text-muted-foreground font-mono block w-full">
      N/A
    </span>
  );
}
