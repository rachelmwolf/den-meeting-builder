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