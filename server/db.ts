import { DatabaseSync } from "node:sqlite";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import type {
  Activity,
  Adventure,
  AdventureBundle,
  MeetingPlan,
  Rank,
  Requirement,
  SavedMeetingPlan,
  YearPlanOutline
} from "../shared/types.js";
import { demoContent } from "../shared/demo.js";

const dataDir = join(process.cwd(), "data");
const dbPath = join(dataDir, "den-meeting-builder.sqlite");

if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true });
}

export const db = new DatabaseSync(dbPath);

export function initDb(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS ranks (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      grade TEXT NOT NULL,
      slug TEXT NOT NULL,
      source_url TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS adventures (
      id TEXT PRIMARY KEY,
      rank_id TEXT NOT NULL REFERENCES ranks(id),
      name TEXT NOT NULL,
      slug TEXT NOT NULL,
      kind TEXT NOT NULL,
      category TEXT NOT NULL,
      source_url TEXT NOT NULL,
      snapshot TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS requirements (
      id TEXT PRIMARY KEY,
      adventure_id TEXT NOT NULL REFERENCES adventures(id),
      requirement_number INTEGER NOT NULL,
      text TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS activities (
      id TEXT PRIMARY KEY,
      adventure_id TEXT NOT NULL REFERENCES adventures(id),
      requirement_id TEXT REFERENCES requirements(id),
      name TEXT NOT NULL,
      slug TEXT NOT NULL,
      source_url TEXT NOT NULL,
      summary TEXT NOT NULL,
      location TEXT NOT NULL,
      prep_minutes INTEGER,
      duration_minutes INTEGER,
      difficulty INTEGER,
      notes TEXT NOT NULL,
      preview_details TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS meeting_plans (
      id TEXT PRIMARY KEY,
      rank_id TEXT NOT NULL REFERENCES ranks(id),
      adventure_id TEXT NOT NULL REFERENCES adventures(id),
      title TEXT NOT NULL,
      planned_date TEXT,
      payload_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);
  ensureColumn("activities", "preview_details", "TEXT NOT NULL DEFAULT ''");
}

function ensureColumn(tableName: string, columnName: string, definition: string): void {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{ name: string }>;
  if (columns.some((column) => column.name === columnName)) {
    return;
  }
  db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
}

function countRows(tableName: string): number {
  const row = db.prepare(`SELECT COUNT(*) as count FROM ${tableName}`).get() as { count: number };
  return row.count;
}

export function ensureDemoSeed(): void {
  initDb();
  if (countRows("ranks") > 0) {
    return;
  }
  upsertRank(demoContent.rank);
  upsertAdventure(demoContent.adventure);
  for (const requirement of demoContent.requirements) {
    upsertRequirement(requirement);
  }
  for (const activity of demoContent.activities) {
    upsertActivity(activity);
  }
}

export function resetAdventure(adventureId: string): void {
  db.prepare("DELETE FROM activities WHERE adventure_id = ?").run(adventureId);
  db.prepare("DELETE FROM requirements WHERE adventure_id = ?").run(adventureId);
  db.prepare("DELETE FROM adventures WHERE id = ?").run(adventureId);
}

export function upsertRank(rank: Rank): void {
  db.prepare(`
    INSERT INTO ranks (id, name, grade, slug, source_url)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      grade = excluded.grade,
      slug = excluded.slug,
      source_url = excluded.source_url
  `).run(rank.id, rank.name, rank.grade, rank.slug, rank.sourceUrl);
}

export function upsertAdventure(adventure: Adventure): void {
  db.prepare(`
    INSERT INTO adventures (id, rank_id, name, slug, kind, category, source_url, snapshot)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      rank_id = excluded.rank_id,
      name = excluded.name,
      slug = excluded.slug,
      kind = excluded.kind,
      category = excluded.category,
      source_url = excluded.source_url,
      snapshot = excluded.snapshot
  `).run(
    adventure.id,
    adventure.rankId,
    adventure.name,
    adventure.slug,
    adventure.kind,
    adventure.category,
    adventure.sourceUrl,
    adventure.snapshot
  );
}

export function upsertRequirement(requirement: Requirement): void {
  db.prepare(`
    INSERT INTO requirements (id, adventure_id, requirement_number, text)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      adventure_id = excluded.adventure_id,
      requirement_number = excluded.requirement_number,
      text = excluded.text
  `).run(requirement.id, requirement.adventureId, requirement.requirementNumber, requirement.text);
}

export function upsertActivity(activity: Activity): void {
  db.prepare(`
    INSERT INTO activities (
      id, adventure_id, requirement_id, name, slug, source_url, summary, location,
      prep_minutes, duration_minutes, difficulty, notes
      , preview_details
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      adventure_id = excluded.adventure_id,
      requirement_id = excluded.requirement_id,
      name = excluded.name,
      slug = excluded.slug,
      source_url = excluded.source_url,
      summary = excluded.summary,
      location = excluded.location,
      prep_minutes = excluded.prep_minutes,
      duration_minutes = excluded.duration_minutes,
      difficulty = excluded.difficulty,
      notes = excluded.notes,
      preview_details = excluded.preview_details
  `).run(
    activity.id,
    activity.adventureId,
    activity.requirementId,
    activity.name,
    activity.slug,
    activity.sourceUrl,
    activity.summary,
    activity.location,
    activity.prepMinutes,
    activity.durationMinutes,
    activity.difficulty,
    activity.notes,
    activity.previewDetails
  );
}

export function saveBundle(bundle: AdventureBundle, rank: Rank): void {
  upsertRank(rank);
  upsertAdventure(bundle.adventure);
  db.prepare("DELETE FROM activities WHERE adventure_id = ?").run(bundle.adventure.id);
  db.prepare("DELETE FROM requirements WHERE adventure_id = ?").run(bundle.adventure.id);
  for (const requirement of bundle.requirements) {
    upsertRequirement(requirement);
  }
  for (const activity of bundle.activities) {
    upsertActivity(activity);
  }
}

function mapRank(row: Record<string, unknown>): Rank {
  return {
    id: String(row.id),
    name: String(row.name),
    grade: String(row.grade),
    slug: String(row.slug),
    sourceUrl: String(row.source_url)
  };
}

function mapAdventure(row: Record<string, unknown>): Adventure {
  return {
    id: String(row.id),
    rankId: String(row.rank_id),
    name: String(row.name),
    slug: String(row.slug),
    kind: row.kind as Adventure["kind"],
    category: String(row.category),
    sourceUrl: String(row.source_url),
    snapshot: String(row.snapshot)
  };
}

function mapRequirement(row: Record<string, unknown>): Requirement {
  return {
    id: String(row.id),
    adventureId: String(row.adventure_id),
    requirementNumber: Number(row.requirement_number),
    text: String(row.text)
  };
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
    location: String(row.location),
    prepMinutes: row.prep_minutes === null ? null : Number(row.prep_minutes),
    durationMinutes: row.duration_minutes === null ? null : Number(row.duration_minutes),
    difficulty: row.difficulty === null ? null : Number(row.difficulty),
    notes: String(row.notes),
    previewDetails: String(row.preview_details ?? "")
  };
}

export function listRanks(): Rank[] {
  return db.prepare("SELECT * FROM ranks ORDER BY name").all().map((row) => mapRank(row as Record<string, unknown>));
}

export function listAdventuresForRank(rankId: string): Adventure[] {
  return db
    .prepare("SELECT * FROM adventures WHERE rank_id = ? ORDER BY kind, name")
    .all(rankId)
    .map((row) => mapAdventure(row as Record<string, unknown>));
}

export function getAdventureBundle(adventureId: string): AdventureBundle | null {
  const adventureRow = db.prepare("SELECT * FROM adventures WHERE id = ?").get(adventureId) as
    | Record<string, unknown>
    | undefined;
  if (!adventureRow) {
    return null;
  }
  const requirements = db
    .prepare("SELECT * FROM requirements WHERE adventure_id = ? ORDER BY requirement_number")
    .all(adventureId)
    .map((row) => mapRequirement(row as Record<string, unknown>));
  const activities = db
    .prepare("SELECT * FROM activities WHERE adventure_id = ? ORDER BY name")
    .all(adventureId)
    .map((row) => mapActivity(row as Record<string, unknown>));
  return {
    adventure: mapAdventure(adventureRow),
    requirements,
    activities
  };
}

export function getRank(rankId: string): Rank | null {
  const row = db.prepare("SELECT * FROM ranks WHERE id = ?").get(rankId) as Record<string, unknown> | undefined;
  return row ? mapRank(row) : null;
}

export function saveMeetingPlan(title: string, plannedDate: string | null, payload: MeetingPlan): SavedMeetingPlan {
  const savedPlan: SavedMeetingPlan = {
    id: payload.id,
    rankId: payload.rank.id,
    adventureId: payload.adventure.id,
    title,
    plannedDate,
    payload,
    createdAt: new Date().toISOString()
  };
  db.prepare(`
    INSERT INTO meeting_plans (id, rank_id, adventure_id, title, planned_date, payload_json, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      rank_id = excluded.rank_id,
      adventure_id = excluded.adventure_id,
      title = excluded.title,
      planned_date = excluded.planned_date,
      payload_json = excluded.payload_json
  `).run(
    savedPlan.id,
    savedPlan.rankId,
    savedPlan.adventureId,
    savedPlan.title,
    savedPlan.plannedDate,
    JSON.stringify(savedPlan.payload),
    savedPlan.createdAt
  );
  return savedPlan;
}

export function listSavedPlansForRank(rankId: string): SavedMeetingPlan[] {
  return db
    .prepare("SELECT * FROM meeting_plans WHERE rank_id = ? ORDER BY planned_date IS NULL, planned_date, created_at")
    .all(rankId)
    .map((row) => {
      const record = row as Record<string, unknown>;
      return {
        id: String(record.id),
        rankId: String(record.rank_id),
        adventureId: String(record.adventure_id),
        title: String(record.title),
        plannedDate: record.planned_date ? String(record.planned_date) : null,
        payload: JSON.parse(String(record.payload_json)) as MeetingPlan,
        createdAt: String(record.created_at)
      };
    });
}

export function buildYearPlanOutline(rankId: string): YearPlanOutline | null {
  const rank = getRank(rankId);
  if (!rank) {
    return null;
  }
  const items = listSavedPlansForRank(rankId).map((savedPlan) => ({
    savedPlanId: savedPlan.id,
    title: savedPlan.title,
    adventureName: savedPlan.payload.adventure.name,
    plannedDate: savedPlan.plannedDate
  }));
  return { rank, items };
}