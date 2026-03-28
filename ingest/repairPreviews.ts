import * as cheerio from "cheerio";
import { pathToFileURL } from "node:url";
import { db, initDb, upsertActivity } from "../server/db.js";
import type { Activity } from "../shared/types.js";
import { NO_SUPPLIES_SENTINEL, isNoSuppliesMaterialsList } from "../shared/utils.js";
import { parseActivityDetailPage } from "./parse.js";

export interface MaterialsRepairReport {
  total: number;
  updated: number;
  unchanged: number;
  supplyFree: number;
  suspicious: number;
}

export interface MaterialsRepairOptions {
  batchSize?: number;
}

function mapActivity(row: Record<string, unknown>): Activity {
  return {
    id: String(row.id),
    adventureId: String(row.adventure_id),
    requirementId: row.requirement_id ? String(row.requirement_id) : null,
    name: String(row.name),
    slug: String(row.slug),
    sourceUrl: String(row.source_url),
    summary: String(row.summary),
    meetingSpace: row.meeting_space ? (String(row.meeting_space) as Activity["meetingSpace"]) : "unknown",
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
    previewDetails: String(row.preview_details ?? ""),
    supplyNote: row.supply_note === null || row.supply_note === undefined ? undefined : String(row.supply_note),
    directions: (() => {
      if (row.directions_json === null || row.directions_json === undefined || row.directions_json === "") {
        return undefined;
      }
      try {
        return JSON.parse(String(row.directions_json)) as Activity["directions"];
      } catch {
        return undefined;
      }
    })(),
    hasAdditionalResources: Boolean(row.has_additional_resources)
  };
}

function normalizeMaterials(materials: string[]): string[] {
  return materials.map((value) => value.replace(/\s+/g, " ").trim()).filter(Boolean);
}

function looksLikeInstructionalText(value: string): boolean {
  return /(^|[\s(,.;:-])(identify|find|make|create|send|pass out|gather|review|remind|have|tell|ask|give|choose|use|set up|prepare|bring|look for|follow|draw|cut|divide|keep|mark|walk|go)\b/i.test(
    value
  );
}

function hasInstructionalMaterialNoise(materials: string[]): boolean {
  return materials.some((value) => looksLikeInstructionalText(value));
}

function hasHeading(rawHtml: string, headingText: string): boolean {
  const $ = cheerio.load(rawHtml);
  const normalized = headingText.replace(/\s+/g, " ").trim().toLowerCase();
  return $("h1, h2, h3, h4, .elementor-heading-title, .pp-accordion-title-text")
    .map((_index, element) => $(element).text().replace(/\s+/g, " ").trim().toLowerCase())
    .get()
    .includes(normalized);
}

function hasNoSuppliesPhrase(rawHtml: string): boolean {
  return /no supplies are required\.?/i.test(cheerio.load(rawHtml).text().replace(/\s+/g, " ").trim());
}

function shouldBackfillActivityMaterials(
  activity: Activity,
  repaired: Activity,
  rawHtml: string
): { shouldUpdate: boolean; suspicious: boolean; supplyFree: boolean } {
  const currentMaterials = normalizeMaterials(activity.materials ?? []);
  const repairedMaterials = normalizeMaterials(repaired.materials ?? []);
  const explicitSupplyList = hasHeading(rawHtml, "Supply List");
  const supplyFree = hasNoSuppliesPhrase(rawHtml);
  const pollutedCurrentMaterials = hasInstructionalMaterialNoise(currentMaterials);

  if (supplyFree) {
    return {
      shouldUpdate:
        !isNoSuppliesMaterialsList(currentMaterials) ||
        activity.supplyNote !== undefined ||
        activity.directions !== undefined ||
        activity.hasAdditionalResources === true,
      suspicious: false,
      supplyFree: true
    };
  }

  if (!explicitSupplyList) {
    return {
      shouldUpdate: false,
      suspicious: currentMaterials.length === 0 && repairedMaterials.length > 0,
      supplyFree: false
    };
  }

  const materialsImproved =
    (currentMaterials.length === 0 && repairedMaterials.length > 0) ||
    (currentMaterials.length <= 2 && repairedMaterials.length >= 4 && repairedMaterials.length > currentMaterials.length) ||
    repairedMaterials.length >= currentMaterials.length + 2;
  const structuredDataImproved =
    (repaired.supplyNote && repaired.supplyNote !== activity.supplyNote) ||
    (repaired.directions && JSON.stringify(repaired.directions) !== JSON.stringify(activity.directions ?? null)) ||
    (repaired.hasAdditionalResources && !activity.hasAdditionalResources);

  return {
    shouldUpdate: Boolean(materialsImproved || structuredDataImproved),
    suspicious:
      !materialsImproved &&
      currentMaterials.length > 0 &&
      repairedMaterials.length > currentMaterials.length &&
      (pollutedCurrentMaterials || repairedMaterials.length >= currentMaterials.length + 2),
    supplyFree: false
  };
}

function fetchRepairBatch(limit: number, offset: number): Array<Record<string, unknown>> {
  return db
    .prepare(`
      SELECT activities.*, source_snapshots.raw_html
      FROM activities
      JOIN source_snapshots
        ON source_snapshots.entity_type = 'activity'
       AND source_snapshots.entity_id = activities.id
      ORDER BY activities.id
      LIMIT ? OFFSET ?
    `)
    .all(limit, offset) as Array<Record<string, unknown>>;
}

export function repairActivitiesFromSnapshots(options: MaterialsRepairOptions = {}): MaterialsRepairReport {
  initDb();
  const batchSize = Math.max(1, Math.floor(options.batchSize ?? 100));
  const totalRow = db
    .prepare(`
      SELECT COUNT(*) AS count
      FROM activities
      JOIN source_snapshots
        ON source_snapshots.entity_type = 'activity'
       AND source_snapshots.entity_id = activities.id
    `)
    .get() as { count?: number } | undefined;
  const total = Number(totalRow?.count ?? 0);

  const report: MaterialsRepairReport = {
    total,
    updated: 0,
    unchanged: 0,
    supplyFree: 0,
    suspicious: 0
  };

  let processed = 0;
  for (let offset = 0; offset < total; offset += batchSize) {
    const rows = fetchRepairBatch(batchSize, offset);
    for (const row of rows) {
      const activity = mapActivity(row);
      const rawHtml = String(row.raw_html);
      const repaired = parseActivityDetailPage(rawHtml, activity);
      const decision = shouldBackfillActivityMaterials(activity, repaired, rawHtml);

      if (!decision.shouldUpdate) {
        report.unchanged += 1;
        if (decision.suspicious) {
          report.suspicious += 1;
        }
        continue;
      }

      upsertActivity(
        decision.supplyFree
          ? {
              ...repaired,
              materials: [NO_SUPPLIES_SENTINEL]
            }
          : repaired
      );
      report.updated += 1;
      if (decision.supplyFree) {
        report.supplyFree += 1;
      }
    }
    processed += rows.length;
    console.log(`Processed ${processed}/${total} activities`);
  }

  return report;
}

function main(): void {
  const batchSize = Number(process.env.MATERIALS_REPAIR_BATCH_SIZE ?? "100");
  const report = repairActivitiesFromSnapshots({
    batchSize: Number.isFinite(batchSize) && batchSize > 0 ? batchSize : 100
  });
  console.log(
    `Materials backfill complete: ${report.updated} updated, ${report.unchanged} unchanged, ${report.supplyFree} supply-free, ${report.suspicious} suspicious out of ${report.total}.`
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}