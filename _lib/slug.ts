// ============================================================================
// API-scoped Slug Generator
// Isolated slug helper for serverless parsing without cross-project boundary imports.
// ============================================================================

export function toUnitSlug(raw: string): string {
  if (!raw) return "";
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
