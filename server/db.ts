import { DatabaseSync } from "node:sqlite";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import type {
  Activity,
  Adventure,
  AdventureBundle,
  AdventureTrailBucket,
  AdventureTrailBucketKey,
  AdventureTrailData,
  AdventureTrailProgress,
  AdventureTrailProgressBucket,
  ContentStatus,
  DenProfile,
  ImportedRankStatus,
  MeetingPlan,
  MeetingRecap,
  PackWorkspace,
  Rank,
  Requirement,
  SaveMeetingPlanRequest,
  SaveRecapRequest,
  SavedMeetingPlan,
  YearPlan,
  YearPlanMonth
} from "../shared/types.js";
import { demoContent } from "../shared/demo.js";
import { normalizeAdventureTrailBucket } from "../shared/utils.js";

const dataDir = join(process.cwd(), "data");
const defaultDbPath = process.env.VITEST
  ? join(dataDir, "den-meeting-builder.test.sqlite")
  : join(dataDir, "den-meeting-builder.sqlite");
const dbPath = process.env.DEN_MEETING_DB_PATH ?? defaultDbPath;

if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true });
}

export const db = new DatabaseSync(dbPath);

export function initDb(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS workspaces (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      planning_notes TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS ranks (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      grade TEXT NOT NULL,
      slug TEXT NOT NULL,
      source_url TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS den_profiles (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id),
      rank_id TEXT NOT NULL REFERENCES ranks(id),
      name TEXT NOT NULL,
      leader_name TEXT NOT NULL,
      meeting_location TEXT NOT NULL,
      typical_meeting_day TEXT NOT NULL
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
      den_id TEXT NOT NULL REFERENCES den_profiles(id),
      rank_id TEXT NOT NULL REFERENCES ranks(id),
      adventure_id TEXT NOT NULL REFERENCES adventures(id),
      title TEXT NOT NULL,
      planned_date TEXT,
      month_key TEXT NOT NULL,
      month_label TEXT NOT NULL,
      theme TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS meeting_recaps (
      meeting_plan_id TEXT PRIMARY KEY REFERENCES meeting_plans(id),
      completed_requirement_ids_json TEXT NOT NULL,
      recap_notes TEXT NOT NULL,
      family_follow_up TEXT NOT NULL,
      reuse_notes TEXT NOT NULL,
      recorded_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS source_snapshots (
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      source_url TEXT NOT NULL,
      raw_html TEXT NOT NULL,
      fetched_at TEXT NOT NULL,
      PRIMARY KEY (entity_type, entity_id)
    );
  `);
  ensureColumn("activities", "preview_details", "TEXT NOT NULL DEFAULT ''");
  ensureColumn("meeting_plans", "den_id", "TEXT REFERENCES den_profiles(id)");
  ensureColumn("meeting_plans", "month_key", "TEXT NOT NULL DEFAULT 'unscheduled'");
  ensureColumn("meeting_plans", "month_label", "TEXT NOT NULL DEFAULT 'Unscheduled'");
  ensureColumn("meeting_plans", "theme", "TEXT NOT NULL DEFAULT 'General'");
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

function mapRank(row: Record<string, unknown>): Rank {
  return {
    id: String(row.id),
    name: String(row.name),
    grade: String(row.grade),
    slug: String(row.slug),
    sourceUrl: String(row.source_url)
  };
}

function mapDenProfile(row: Record<string, unknown>): DenProfile {
  return {
    id: String(row.id),
    workspaceId: String(row.workspace_id),
    rankId: String(row.rank_id),
    name: String(row.name),
    leaderName: String(row.leader_name),
    meetingLocation: String(row.meeting_location),
    typicalMeetingDay: String(row.typical_meeting_day)
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

function mapRecap(row: Record<string, unknown> | undefined): MeetingRecap | null {
  if (!row) {
    return null;
  }
  return {
    meetingPlanId: String(row.meeting_plan_id),
    completedRequirementIds: JSON.parse(String(row.completed_requirement_ids_json)) as string[],
    recapNotes: String(row.recap_notes),
    familyFollowUp: String(row.family_follow_up),
    reuseNotes: String(row.reuse_notes),
    recordedAt: String(row.recorded_at)
  };
}

export function upsertWorkspace(workspace: PackWorkspace): void {
  db.prepare(`
    INSERT INTO workspaces (id, name, planning_notes)
    VALUES (?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      planning_notes = excluded.planning_notes
  `).run(workspace.id, workspace.name, workspace.planningNotes);
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

export function upsertDenProfile(den: DenProfile): void {
  db.prepare(`
    INSERT INTO den_profiles (id, workspace_id, rank_id, name, leader_name, meeting_location, typical_meeting_day)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      workspace_id = excluded.workspace_id,
      rank_id = excluded.rank_id,
      name = excluded.name,
      leader_name = excluded.leader_name,
      meeting_location = excluded.meeting_location,
      typical_meeting_day = excluded.typical_meeting_day
  `).run(
    den.id,
    den.workspaceId,
    den.rankId,
    den.name,
    den.leaderName,
    den.meetingLocation,
    den.typicalMeetingDay
  );
}

export function ensureDefaultDenProfileForRank(rank: Rank): DenProfile {
  const existing = db
    .prepare("SELECT * FROM den_profiles WHERE rank_id = ? ORDER BY name LIMIT 1")
    .get(rank.id) as Record<string, unknown> | undefined;
  if (existing) {
    return mapDenProfile(existing);
  }
  const workspace = getWorkspace() ?? demoContent.workspace;
  const den: DenProfile = {
    id: `${rank.id}-imported-den`,
    workspaceId: workspace.id,
    rankId: rank.id,
    name: `${rank.name} Imported Den`,
    leaderName: "Imported Content",
    meetingLocation: "Set meeting location",
    typicalMeetingDay: "Set meeting day"
  };
  upsertWorkspace(workspace);
  upsertDenProfile(den);
  return den;
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
      prep_minutes, duration_minutes, difficulty, notes, preview_details
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

export function saveSourceSnapshot(
  entityType: "rank" | "adventure" | "activity",
  entityId: string,
  sourceUrl: string,
  rawHtml: string,
  fetchedAt = new Date().toISOString()
): void {
  db.prepare(`
    INSERT INTO source_snapshots (entity_type, entity_id, source_url, raw_html, fetched_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(entity_type, entity_id) DO UPDATE SET
      source_url = excluded.source_url,
      raw_html = excluded.raw_html,
      fetched_at = excluded.fetched_at
  `).run(entityType, entityId, sourceUrl, rawHtml, fetchedAt);
}

export function ensureDemoSeed(): void {
  initDb();
  if (countRows("workspaces") === 0) {
    upsertWorkspace(demoContent.workspace);
  }
  if (countRows("ranks") === 0) {
    upsertRank(demoContent.rank);
    for (const adventure of demoContent.adventures) {
      upsertAdventure(adventure);
    }
    for (const requirement of demoContent.requirements) {
      upsertRequirement(requirement);
    }
    for (const activity of demoContent.activities) {
      upsertActivity(activity);
    }
  }
  if (countRows("den_profiles") === 0) {
    for (const den of demoContent.denProfiles) {
      upsertDenProfile(den);
    }
  }
}

export function getWorkspace(): PackWorkspace | null {
  const row = db.prepare("SELECT * FROM workspaces LIMIT 1").get() as Record<string, unknown> | undefined;
  if (!row) {
    return null;
  }
  return {
    id: String(row.id),
    name: String(row.name),
    planningNotes: String(row.planning_notes)
  };
}

export function listDenProfiles(): DenProfile[] {
  return db
    .prepare(`
      SELECT den_profiles.*
      FROM den_profiles
      LEFT JOIN (
        SELECT DISTINCT entity_id AS rank_id
        FROM source_snapshots
        WHERE entity_type = 'rank'
      ) imported ON imported.rank_id = den_profiles.rank_id
      ORDER BY CASE WHEN imported.rank_id IS NOT NULL THEN 0 ELSE 1 END, den_profiles.name
    `)
    .all()
    .map((row) => mapDenProfile(row as Record<string, unknown>));
}

export function getDenProfile(denId: string): DenProfile | null {
  const row = db.prepare("SELECT * FROM den_profiles WHERE id = ?").get(denId) as Record<string, unknown> | undefined;
  return row ? mapDenProfile(row) : null;
}

export function listAdventuresForRank(rankId: string): Adventure[] {
  return db
    .prepare("SELECT * FROM adventures WHERE rank_id = ? ORDER BY kind, name")
    .all(rankId)
    .map((row) => mapAdventure(row as Record<string, unknown>));
}

export function listRequirementsForAdventureIds(adventureIds: string[]): Requirement[] {
  if (adventureIds.length === 0) {
    return [];
  }
  const placeholders = adventureIds.map(() => "?").join(", ");
  return db
    .prepare(`SELECT * FROM requirements WHERE adventure_id IN (${placeholders}) ORDER BY adventure_id, requirement_number`)
    .all(...adventureIds)
    .map((row) => mapRequirement(row as Record<string, unknown>));
}

export function getAdventureBundle(adventureId: string): AdventureBundle | null {
  const adventureRow = db.prepare("SELECT * FROM adventures WHERE id = ?").get(adventureId) as Record<string, unknown> | undefined;
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
  return { adventure: mapAdventure(adventureRow), requirements, activities };
}

export function getAdventureBundles(adventureIds: string[]): AdventureBundle[] {
  return adventureIds
    .map((adventureId) => getAdventureBundle(adventureId))
    .filter((bundle): bundle is AdventureBundle => Boolean(bundle));
}

export function getRank(rankId: string): Rank | null {
  const row = db.prepare("SELECT * FROM ranks WHERE id = ?").get(rankId) as Record<string, unknown> | undefined;
  return row ? mapRank(row) : null;
}

export function getContentStatus(): ContentStatus {
  const importedRows = db.prepare(`
    SELECT source_snapshots.entity_id AS rank_id, ranks.name AS rank_name, MAX(source_snapshots.fetched_at) AS refreshed_at
    FROM source_snapshots
    JOIN ranks ON ranks.id = source_snapshots.entity_id
    WHERE source_snapshots.entity_type = 'rank'
    GROUP BY source_snapshots.entity_id, ranks.name
    ORDER BY ranks.name
  `).all() as Array<Record<string, unknown>>;
  const importedRanks: ImportedRankStatus[] = importedRows.map((row) => ({
    rankId: String(row.rank_id),
    rankName: String(row.rank_name),
    refreshedAt: String(row.refreshed_at)
  }));
  const lastRefreshedRow = db
    .prepare("SELECT MAX(fetched_at) AS last_refreshed_at FROM source_snapshots")
    .get() as Record<string, unknown> | undefined;
  const lastRefreshedAt = lastRefreshedRow?.last_refreshed_at ? String(lastRefreshedRow.last_refreshed_at) : null;
  const totalRanks = countRows("ranks");
  const importedRankCount = importedRanks.length;
  const datasetMode =
    importedRankCount === 0
      ? "demo"
      : importedRankCount < totalRanks
        ? "mixed"
        : "imported";

  return {
    datasetMode,
    importedRanks,
    lastRefreshedAt
  };
}

const trailBucketMeta: Array<{
  key: AdventureTrailBucketKey;
  label: string;
  required: boolean;
  targetCount: number;
}> = [
  { key: "character-leadership", label: "Character & Leadership", required: true, targetCount: 1 },
  { key: "outdoors", label: "Outdoors", required: true, targetCount: 1 },
  { key: "personal-fitness", label: "Personal Fitness", required: true, targetCount: 1 },
  { key: "citizenship", label: "Citizenship", required: true, targetCount: 1 },
  { key: "personal-safety", label: "Personal Safety", required: true, targetCount: 1 },
  { key: "family-reverence", label: "Family & Reverence", required: true, targetCount: 1 },
  { key: "electives", label: "Electives", required: false, targetCount: 2 }
];

function getTrailBucketsForRank(rankId: string): AdventureTrailBucket[] {
  const adventures = listAdventuresForRank(rankId);
  return trailBucketMeta.map((meta) => ({
    key: meta.key,
    label: meta.label,
    required: meta.required,
    adventures: adventures.filter(
      (adventure) => normalizeAdventureTrailBucket(adventure.category, adventure.kind, adventure.name) === meta.key
    )
  }));
}

function getSavedPlanAdventureIds(savedPlan: SavedMeetingPlan): string[] {
  if (Array.isArray(savedPlan.payload.adventures) && savedPlan.payload.adventures.length > 0) {
    return savedPlan.payload.adventures.map((adventure) => adventure.id);
  }
  return savedPlan.adventureId ? [savedPlan.adventureId] : [];
}

function buildTrailProgress(denId: string): AdventureTrailProgress {
  const den = getDenProfile(denId);
  if (!den) {
    return {
      buckets: trailBucketMeta.map((meta) => ({
        key: meta.key,
        label: meta.label,
        required: meta.required,
        targetCount: meta.targetCount,
        completedCount: 0,
        completedAdventureIds: []
      })),
      electiveTargetCount: 2,
      electiveCompletedCount: 0
    };
  }

  const completedByBucket = new Map<AdventureTrailBucketKey, Set<string>>();
  for (const meta of trailBucketMeta) {
    completedByBucket.set(meta.key, new Set());
  }

  for (const savedPlan of listSavedPlansForDen(denId)) {
    for (const adventureId of getSavedPlanAdventureIds(savedPlan)) {
      const bundle = getAdventureBundle(adventureId);
      if (!bundle) {
        continue;
      }
      const bucketKey = normalizeAdventureTrailBucket(
        bundle.adventure.category,
        bundle.adventure.kind,
        bundle.adventure.name
      ) as AdventureTrailBucketKey;
      completedByBucket.get(bucketKey)?.add(adventureId);
    }
  }

  const buckets: AdventureTrailProgressBucket[] = trailBucketMeta.map((meta) => ({
    key: meta.key,
    label: meta.label,
    required: meta.required,
    targetCount: meta.targetCount,
    completedCount: completedByBucket.get(meta.key)?.size ?? 0,
    completedAdventureIds: Array.from(completedByBucket.get(meta.key) ?? [])
  }));

  return {
    buckets,
    electiveTargetCount: 2,
    electiveCompletedCount: completedByBucket.get("electives")?.size ?? 0
  };
}

export function getAdventureTrailData(denId: string): AdventureTrailData | null {
  const den = getDenProfile(denId);
  if (!den) {
    return null;
  }
  return {
    buckets: getTrailBucketsForRank(den.rankId),
    progress: buildTrailProgress(denId)
  };
}

export function resetContentForTests(): void {
  db.exec(`
    DELETE FROM source_snapshots;
    DELETE FROM meeting_recaps;
    DELETE FROM meeting_plans;
    DELETE FROM activities;
    DELETE FROM requirements;
    DELETE FROM adventures;
    DELETE FROM den_profiles;
    DELETE FROM ranks;
    DELETE FROM workspaces;
  `);
}

export function saveMeetingPlan(input: SaveMeetingPlanRequest): SavedMeetingPlan {
  const primaryAdventureId = input.payload.adventures[0]?.id ?? input.payload.request.adventureIds[0] ?? "";
  const savedPlan: SavedMeetingPlan = {
    id: input.payload.id,
    denId: input.denId,
    rankId: input.payload.rank.id,
    adventureId: primaryAdventureId,
    title: input.title,
    plannedDate: input.plannedDate,
    monthKey: input.monthKey,
    monthLabel: input.monthLabel,
    theme: input.theme,
    payload: input.payload,
    recap: getMeetingRecap(input.payload.id),
    createdAt: new Date().toISOString()
  };
  db.prepare(`
    INSERT INTO meeting_plans (
      id, den_id, rank_id, adventure_id, title, planned_date, month_key, month_label, theme, payload_json, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      den_id = excluded.den_id,
      rank_id = excluded.rank_id,
      adventure_id = excluded.adventure_id,
      title = excluded.title,
      planned_date = excluded.planned_date,
      month_key = excluded.month_key,
      month_label = excluded.month_label,
      theme = excluded.theme,
      payload_json = excluded.payload_json
  `).run(
    savedPlan.id,
    savedPlan.denId,
    savedPlan.rankId,
    savedPlan.adventureId,
    savedPlan.title,
    savedPlan.plannedDate,
    savedPlan.monthKey,
    savedPlan.monthLabel,
    savedPlan.theme,
    JSON.stringify(savedPlan.payload),
    savedPlan.createdAt
  );
  return savedPlan;
}

export function saveMeetingRecap(input: SaveRecapRequest): MeetingRecap {
  const recap: MeetingRecap = {
    meetingPlanId: input.meetingPlanId,
    completedRequirementIds: input.completedRequirementIds,
    recapNotes: input.recapNotes,
    familyFollowUp: input.familyFollowUp,
    reuseNotes: input.reuseNotes,
    recordedAt: new Date().toISOString()
  };
  db.prepare(`
    INSERT INTO meeting_recaps (
      meeting_plan_id, completed_requirement_ids_json, recap_notes, family_follow_up, reuse_notes, recorded_at
    ) VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(meeting_plan_id) DO UPDATE SET
      completed_requirement_ids_json = excluded.completed_requirement_ids_json,
      recap_notes = excluded.recap_notes,
      family_follow_up = excluded.family_follow_up,
      reuse_notes = excluded.reuse_notes,
      recorded_at = excluded.recorded_at
  `).run(
    recap.meetingPlanId,
    JSON.stringify(recap.completedRequirementIds),
    recap.recapNotes,
    recap.familyFollowUp,
    recap.reuseNotes,
    recap.recordedAt
  );
  return recap;
}

export function getMeetingRecap(meetingPlanId: string): MeetingRecap | null {
  const row = db
    .prepare("SELECT * FROM meeting_recaps WHERE meeting_plan_id = ?")
    .get(meetingPlanId) as Record<string, unknown> | undefined;
  return mapRecap(row);
}

export function listSavedPlansForDen(denId: string): SavedMeetingPlan[] {
  return db
    .prepare("SELECT * FROM meeting_plans WHERE den_id = ? ORDER BY planned_date IS NULL, planned_date, created_at")
    .all(denId)
    .map((row) => {
      const record = row as Record<string, unknown>;
      const id = String(record.id);
      return {
        id,
        denId: String(record.den_id),
        rankId: String(record.rank_id),
        adventureId: String(record.adventure_id),
        title: String(record.title),
        plannedDate: record.planned_date ? String(record.planned_date) : null,
        monthKey: String(record.month_key),
        monthLabel: String(record.month_label),
        theme: String(record.theme),
        payload: JSON.parse(String(record.payload_json)) as MeetingPlan,
        recap: getMeetingRecap(id),
        createdAt: String(record.created_at)
      };
    });
}

export function buildYearPlan(denId: string): YearPlan | null {
  const den = getDenProfile(denId);
  if (!den) {
    return null;
  }
  const grouped = new Map<string, YearPlanMonth>();
  for (const savedPlan of listSavedPlansForDen(denId)) {
    const key = savedPlan.monthKey;
    const existing = grouped.get(key);
    if (existing) {
      existing.items.push(savedPlan);
    } else {
      grouped.set(key, {
        monthKey: key,
        monthLabel: savedPlan.monthLabel,
        theme: savedPlan.theme,
        items: [savedPlan]
      });
    }
  }
  return {
    den,
    trailProgress: buildTrailProgress(denId),
    months: Array.from(grouped.values()).sort((a, b) => a.monthKey.localeCompare(b.monthKey))
  };
}

export function duplicateMeetingPlan(savedPlanId: string, nextMonthKey: string, nextMonthLabel: string, nextTheme: string): SavedMeetingPlan | null {
  const original = db.prepare("SELECT * FROM meeting_plans WHERE id = ?").get(savedPlanId) as Record<string, unknown> | undefined;
  if (!original) {
    return null;
  }
  const payload = JSON.parse(String(original.payload_json)) as MeetingPlan;
  const duplicatedPayload: MeetingPlan = {
    ...payload,
    id: `${payload.id}-copy-${Date.now()}`,
    generatedAt: new Date().toISOString()
  };
  return saveMeetingPlan({
    denId: String(original.den_id),
    title: `${String(original.title)} Copy`,
    plannedDate: null,
    monthKey: nextMonthKey,
    monthLabel: nextMonthLabel,
    theme: nextTheme,
    payload: duplicatedPayload
  });
}