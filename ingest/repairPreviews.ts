import { db, initDb, upsertActivity } from "../server/db.js";
import type { Activity } from "../shared/types.js";
import { parseActivityDetailPage } from "./parse.js";

function mapActivity(row: Record<string, unknown>): Activity {
  return {
    id: String(row.id),
    adventureId: String(row.adventure_id),
    requirementId: row.requirement_id ? String(row.requirement_id) : null,
    name: String(row.name),
    slug: String(row.slug),
    sourceUrl: String(row.source_url),
    summary: String(row.summary),
    location: String(row.location),
    prepMinutes: row.prep_minutes === null ? null : Number(row.prep_minutes),
    durationMinutes: row.duration_minutes === null ? null : Number(row.duration_minutes),
    difficulty: row.difficulty === null ? null : Number(row.difficulty),
    notes: String(row.notes),
    previewDetails: String(row.preview_details ?? "")
  };
}

function main(): void {
  initDb();
  const rows = db.prepare(`
    SELECT activities.*, source_snapshots.raw_html
    FROM activities
    JOIN source_snapshots
      ON source_snapshots.entity_type = 'activity'
     AND source_snapshots.entity_id = activities.id
  `).all() as Array<Record<string, unknown>>;

  for (const row of rows) {
    const activity = mapActivity(row);
    const repaired = parseActivityDetailPage(String(row.raw_html), activity);
    upsertActivity(repaired);
  }

  console.log(`Repaired ${rows.length} imported activity preview(s).`);
}

main();