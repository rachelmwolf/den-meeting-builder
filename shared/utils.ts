export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function newGuid(): string {
  const cryptoLike = (globalThis as typeof globalThis & {
    crypto?: { randomUUID?: () => string };
  }).crypto;
  if (cryptoLike?.randomUUID) {
    return cryptoLike.randomUUID();
  }

  const bytes = Array.from({ length: 16 }, () => Math.floor(Math.random() * 256));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.map((value) => value.toString(16).padStart(2, "0"));
  return [
    hex.slice(0, 4).join(""),
    hex.slice(4, 6).join(""),
    hex.slice(6, 8).join(""),
    hex.slice(8, 10).join(""),
    hex.slice(10, 16).join("")
  ].join("-");
}

export const NO_SUPPLIES_SENTINEL = "No supplies are required.";

export function isNoSuppliesMaterial(value: string): boolean {
  return value.replace(/\s+/g, " ").trim() === NO_SUPPLIES_SENTINEL;
}

export function isNoSuppliesMaterialsList(materials: string[] | undefined | null): boolean {
  return Array.isArray(materials) && materials.length === 1 && isNoSuppliesMaterial(materials[0] ?? "");
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

export function labelMeetingSpace(space: string): string {
  if (space === "indoor") {
    return "Indoor";
  }
  if (space === "outing-with-travel") {
    return "Outing with travel";
  }
  if (space === "outdoor") {
    return "Outdoor";
  }
  if (space === "indoor-or-outdoor") {
    return "Indoor or Outdoor";
  }
  return "Meeting space flexible";
}