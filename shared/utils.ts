export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function makeId(...parts: string[]): string {
  return parts.map(slugify).join("__");
}

export function chunkedDuration(total: number, chunks: number, minimum = 5): number[] {
  if (chunks <= 0) {
    return [];
  }
  const safeTotal = Math.max(total, chunks * minimum);
  const base = Math.floor(safeTotal / chunks);
  const remainder = safeTotal % chunks;
  return Array.from({ length: chunks }, (_, index) => base + (index < remainder ? 1 : 0));
}

export function normalizeAdventureTrailBucket(
  category: string,
  kind: "required" | "elective",
  adventureName = ""
): string {
  if (kind === "elective") {
    return "electives";
  }

  const normalized = category.toLowerCase().replace(/[^a-z]+/g, " ").trim();
  const normalizedName = adventureName.toLowerCase().replace(/[^a-z]+/g, " ").trim();
  if (normalized.includes("bobcat") || normalizedName.includes("bobcat") || normalized.startsWith("view ")) {
    return "character-leadership";
  }
  if (normalized.includes("character") || normalized.includes("leadership")) {
    return "character-leadership";
  }
  if (normalized.includes("outdoor")) {
    return "outdoors";
  }
  if (normalized.includes("fitness")) {
    return "personal-fitness";
  }
  if (normalized.includes("citizen")) {
    return "citizenship";
  }
  if (normalized.includes("safety")) {
    return "personal-safety";
  }
  if (normalized.includes("family") || normalized.includes("rever")) {
    return "family-reverence";
  }
  return "electives";
}