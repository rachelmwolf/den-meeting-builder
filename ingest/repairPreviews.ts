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
    meetingSpace: row.meeting_space ? String(row.meeting_space) as Activity["meetingSpace"] : "unknown",
    energyLevel: row.energy_level === null ? null : Number(row.energy_level),
    supplyLevel: row.supply_level === null ? null : Number(row.supply_level),
    prepLevel: row.prep_level === null ? null : Number(row.prep_level),
    durationMinutes: row.duration_minutes === null ? null : Number(row.duration_minutes),
    materials: (() => {
      try {
        const parsed = JSON.parse(String(row.materials_json ?? "[]"));
        return Array.isArray(parsed) ? parsed.map((entry) => String(entry)) : [];
      } catch {
        return [];
      }
    })(),
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