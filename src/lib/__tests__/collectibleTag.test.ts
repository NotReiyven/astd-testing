import { describe, it, expect } from "vitest";
import { GRID_STATUS_CFG, THEORY_SECONDARY_TAGS } from "../../data/config";

describe("Collectible tag configuration", () => {
  it("defines Collectible in GRID_STATUS_CFG with distinct color from Stable", () => {
    expect(GRID_STATUS_CFG.collectible).toBeDefined();
    expect(GRID_STATUS_CFG.collectible.label).toBe("Collectible");
    expect(GRID_STATUS_CFG.collectible.bg).toBe("#f1c232");
    expect(GRID_STATUS_CFG.collectible.bg).not.toBe(GRID_STATUS_CFG.stable.bg);
  });

  it("includes Collectible in THEORY_SECONDARY_TAGS", () => {
    const entry = THEORY_SECONDARY_TAGS.find((t) => t.tag === "Collectible");
    expect(entry).toBeDefined();
    expect(entry?.bg).toBe("#f1c232");
  });
});
