import { DatabaseSync } from "node:sqlite";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import type {
  Activity,
  AdminActivityRecord,
  AdminAdventureRecord,
  AdminCurriculumDetail,
  AdminCurriculumListItem,
  AdminCurriculumWrite,
  AdminRankRecord,
  AdminRequirementRecord,
  ActivityFieldCoverage,
  Adventure,
  AdventureBundle,
  AdventureTrailBucket,
  AdventureTrailBucketKey,
  AdventureTrailData,
  AdventureTrailProgress,
  AdventureTrailProgressBucket,
  ContentStatus,
  DenProfile,
  CurriculumEntityType,
  ImportedRankStatus,
  MeetingPlan,
  MeetingRecap,
  PackWorkspace,
  Rank,
  Requirement,
  SourceSnapshot,
  SaveMeetingPlanRequest,
  SaveRecapRequest,
  SavedMeetingPlan
} from "../shared/types.js";
import { demoContent } from "../shared/demo.js";
import { NO_SUPPLIES_SENTINEL, newGuid, normalizeAdventureTrailBucket } from "../shared/utils.js";

const dataDir = join(process.cwd(), "data");
const defaultDbPath = process.env.VITEST
  ? join(
      dataDir,
      `den-meeting-builder.test-${process.env.VITEST_WORKER_ID ?? process.pid}.sqlite`
    )
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
      name TEXT NOT NULL
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
      snapshot TEXT NOT NULL,
      safety_moment TEXT,
      alternate_path TEXT
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
      meeting_space TEXT,
      energy_level INTEGER,
      supply_level INTEGER,
      prep_level INTEGER,
      duration_minutes INTEGER,
      materials_json TEXT NOT NULL DEFAULT '[]',
      preview_details TEXT NOT NULL DEFAULT '',
      supply_note TEXT,
      directions_json TEXT,
      has_additional_resources INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS meeting_plans (
      id TEXT PRIMARY KEY,
      den_id TEXT NOT NULL REFERENCES den_profiles(id),
      title TEXT NOT NULL,
      planned_date TEXT,
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
    CREATE INDEX IF NOT EXISTS idx_den_profiles_rank_id ON den_profiles(rank_id);
    CREATE INDEX IF NOT EXISTS idx_adventures_rank_id ON adventures(rank_id);
    CREATE INDEX IF NOT EXISTS idx_requirements_adventure_id ON requirements(adventure_id);
    CREATE INDEX IF NOT EXISTS idx_activities_adventure_id ON activities(adventure_id);
    CREATE INDEX IF NOT EXISTS idx_activities_requirement_id ON activities(requirement_id);
    CREATE INDEX IF NOT EXISTS idx_meeting_plans_den_id ON meeting_plans(den_id);
    CREATE INDEX IF NOT EXISTS idx_source_snapshots_entity_type_id ON source_snapshots(entity_type, entity_id);
  `);
  migrateWorkspacesTable();
  migrateActivitiesTable();
  migrateMeetingPlansTable();
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_den_profiles_rank_id ON den_profiles(rank_id);
    CREATE INDEX IF NOT EXISTS idx_adventures_rank_id ON adventures(rank_id);
    CREATE INDEX IF NOT EXISTS idx_requirements_adventure_id ON requirements(adventure_id);
    CREATE INDEX IF NOT EXISTS idx_activities_adventure_id ON activities(adventure_id);
    CREATE INDEX IF NOT EXISTS idx_activities_requirement_id ON activities(requirement_id);
    CREATE INDEX IF NOT EXISTS idx_meeting_plans_den_id ON meeting_plans(den_id);
    CREATE INDEX IF NOT EXISTS idx_source_snapshots_entity_type_id ON source_snapshots(entity_type, entity_id);
  `);
  normalizeImportedDenProfiles();
}

function tableHasColumn(tableName: string, columnName: string): boolean {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{ name: string }>;
  return columns.some((column) => column.name === columnName);
}

function withSchemaMigration(mutator: () => void): void {
  db.exec("PRAGMA foreign_keys = OFF");
  db.exec("BEGIN");
  try {
    mutator();
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  } finally {
    db.exec("PRAGMA foreign_keys = ON");
  }
}

function legacyPrepMinutesToLevel(prepMinutes: unknown): number | null {
  if (prepMinutes === null || prepMinutes === undefined || prepMinutes === "") {
    return null;
  }
  const minutes = Number(prepMinutes);
  if (!Number.isFinite(minutes) || minutes < 0) {
    return null;
  }
  if (minutes <= 5) return 1;
  if (minutes <= 15) return 2;
  if (minutes <= 30) return 3;
  if (minutes <= 60) return 4;
  return 5;
}

function migrateWorkspacesTable(): void {
  if (!tableHasColumn("workspaces", "planning_notes")) {
    return;
  }
  const rows = db.prepare("SELECT id, name FROM workspaces").all() as Array<{ id: unknown; name: unknown }>;
  withSchemaMigration(() => {
    db.exec(`
      CREATE TABLE workspaces_new (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL
      );
    `);
    const insert = db.prepare("INSERT INTO workspaces_new (id, name) VALUES (?, ?)");
    for (const row of rows) {
      insert.run(String(row.id), String(row.name));
    }
    db.exec(`
      DROP TABLE workspaces;
      ALTER TABLE workspaces_new RENAME TO workspaces;
    `);
  });
}

function migrateActivitiesTable(): void {
  if (
    !tableHasColumn("activities", "location") &&
    !tableHasColumn("activities", "prep_minutes") &&
    !tableHasColumn("activities", "difficulty") &&
    !tableHasColumn("activities", "notes")
  ) {
    return;
  }
  const rows = db.prepare("SELECT * FROM activities").all() as Array<Record<string, unknown>>;
  withSchemaMigration(() => {
    db.exec(`
      CREATE TABLE activities_new (
        id TEXT PRIMARY KEY,
        adventure_id TEXT NOT NULL REFERENCES adventures(id),
        requirement_id TEXT REFERENCES requirements(id),
        name TEXT NOT NULL,
        slug TEXT NOT NULL,
        source_url TEXT NOT NULL,
        summary TEXT NOT NULL,
        meeting_space TEXT,
        energy_level INTEGER,
        supply_level INTEGER,
        prep_level INTEGER,
        duration_minutes INTEGER,
        materials_json TEXT NOT NULL DEFAULT '[]',
        preview_details TEXT NOT NULL DEFAULT '',
        supply_note TEXT,
        directions_json TEXT,
        has_additional_resources INTEGER NOT NULL DEFAULT 0
      );
    `);
    const insert = db.prepare(`
      INSERT INTO activities_new (
        id, adventure_id, requirement_id, name, slug, source_url, summary,
        meeting_space, energy_level, supply_level, prep_level, duration_minutes,
        materials_json, preview_details, supply_note, directions_json, has_additional_resources
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const row of rows) {
      const meetingSpace = row.meeting_space
        ? String(row.meeting_space)
        : row.location
          ? String(fallbackMeetingSpace(String(row.location)))
          : null;
      const energyLevel =
        row.energy_level === null || row.energy_level === undefined
          ? row.difficulty === null || row.difficulty === undefined
            ? null
            : Number(row.difficulty)
          : Number(row.energy_level);
      const prepLevel =
        row.prep_level === null || row.prep_level === undefined
          ? legacyPrepMinutesToLevel(row.prep_minutes)
          : Number(row.prep_level);
      insert.run(
        String(row.id),
        String(row.adventure_id),
        row.requirement_id === null || row.requirement_id === undefined ? null : String(row.requirement_id),
        String(row.name),
        String(row.slug),
        String(row.source_url),
        String(row.summary),
        meetingSpace,
        energyLevel,
        row.supply_level === null || row.supply_level === undefined ? null : Number(row.supply_level),
        prepLevel,
        row.duration_minutes === null || row.duration_minutes === undefined ? null : Number(row.duration_minutes),
        String(row.materials_json ?? "[]"),
        String(row.preview_details ?? ""),
        row.supply_note === null || row.supply_note === undefined ? null : String(row.supply_note),
        row.directions_json === null || row.directions_json === undefined ? null : String(row.directions_json),
        Number(row.has_additional_resources ?? 0) ? 1 : 0
      );
    }
    db.exec(`
      DROP TABLE activities;
      ALTER TABLE activities_new RENAME TO activities;
    `);
  });
}

function migrateMeetingPlansTable(): void {
  if (!tableHasColumn("meeting_plans", "rank_id") && !tableHasColumn("meeting_plans", "month_key") && !tableHasColumn("meeting_plans", "theme")) {
    return;
  }
  const rows = db.prepare("SELECT id, den_id, title, planned_date, payload_json, created_at FROM meeting_plans").all() as Array<{
    id: unknown;
    den_id: unknown;
    title: unknown;
    planned_date: unknown;
    payload_json: unknown;
    created_at: unknown;
  }>;
  withSchemaMigration(() => {
    db.exec(`
      CREATE TABLE meeting_plans_new (
        id TEXT PRIMARY KEY,
        den_id TEXT NOT NULL REFERENCES den_profiles(id),
        title TEXT NOT NULL,
        planned_date TEXT,
        payload_json TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
    `);
    const insert = db.prepare(
      "INSERT INTO meeting_plans_new (id, den_id, title, planned_date, payload_json, created_at) VALUES (?, ?, ?, ?, ?, ?)"
    );
    for (const row of rows) {
      insert.run(
        String(row.id),
        String(row.den_id),
        String(row.title),
        row.planned_date === null || row.planned_date === undefined ? null : String(row.planned_date),
        String(row.payload_json),
        String(row.created_at)
      );
    }
    db.exec(`
      DROP TABLE meeting_plans;
      ALTER TABLE meeting_plans_new RENAME TO meeting_plans;
    `);
  });
}

function countRows(tableName: string): number {
  const row = db.prepare(`SELECT COUNT(*) as count FROM ${tableName}`).get() as { count: number };
  return row.count;
}

function normalizeImportedDenProfiles(): void {
  db.prepare(`
    UPDATE den_profiles
    SET name = (
      SELECT ranks.name || ' Den'
      FROM ranks
      WHERE ranks.id = den_profiles.rank_id
    )
    WHERE name = (
      SELECT ranks.name || ' Imported Den'
      FROM ranks
      WHERE ranks.id = den_profiles.rank_id
    )
  `).run();
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
    snapshot: String(row.snapshot),
    safetyMoment: row.safety_moment === null || row.safety_moment === undefined ? undefined : String(row.safety_moment),
    alternatePath: row.alternate_path === null || row.alternate_path === undefined ? undefined : String(row.alternate_path)
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
  const materialsValue = String(row.materials_json ?? "[]");
  let materials: string[] = [];
  try {
    const parsed = JSON.parse(materialsValue);
    if (Array.isArray(parsed)) {
      materials = parsed.map((entry) => String(entry));
    }
  } catch {
    materials = [];
  }
  const supplyNote = row.supply_note === null || row.supply_note === undefined ? undefined : String(row.supply_note);
  const directions = parseActivityDirections(row.directions_json);
  return {
    id: String(row.id),
    adventureId: String(row.adventure_id),
    requirementId: row.requirement_id ? String(row.requirement_id) : null,
    name: String(row.name),
    slug: String(row.slug),
    sourceUrl: String(row.source_url),
    summary: String(row.summary),
    meetingSpace: row.meeting_space ? (String(row.meeting_space) as Activity["meetingSpace"]) : "unknown",
    energyLevel: row.energy_level === null || row.energy_level === undefined ? null : Number(row.energy_level),
    supplyLevel: row.supply_level === null || row.supply_level === undefined ? null : Number(row.supply_level),
    prepLevel: row.prep_level === null || row.prep_level === undefined ? null : Number(row.prep_level),
    durationMinutes: row.duration_minutes === null ? null : Number(row.duration_minutes),
    materials,
    previewDetails: String(row.preview_details ?? ""),
    supplyNote,
    directions,
    hasAdditionalResources: Boolean(Number(row.has_additional_resources ?? 0))
  };
}

function parseActivityDirections(value: unknown): Activity["directions"] {
  if (value === null || value === undefined || value === "") {
    return undefined;
  }
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    if (!parsed || typeof parsed !== "object") {
      return undefined;
    }
    return parsed as NonNullable<Activity["directions"]>;
  } catch {
    return undefined;
  }
}

function mapSourceSnapshot(row: Record<string, unknown> | undefined): SourceSnapshot | null {
  if (!row) {
    return null;
  }
  return {
    sourceUrl: String(row.source_url ?? ""),
    rawHtml: String(row.raw_html ?? ""),
    fetchedAt: String(row.fetched_at ?? "")
  };
}

function getSourceSnapshot(entityType: "rank" | "adventure" | "activity", entityId: string): SourceSnapshot | null {
  const row = db
    .prepare(
      "SELECT source_url, raw_html, fetched_at FROM source_snapshots WHERE entity_type = ? AND entity_id = ?"
    )
    .get(entityType, entityId) as Record<string, unknown> | undefined;
  return mapSourceSnapshot(row);
}

function buildAdminRankSummary(row: Record<string, unknown>): AdminCurriculumListItem {
  const refreshedAt = row.refreshed_at ? String(row.refreshed_at) : null;
  const adventureCount = Number(row.adventure_count ?? 0);
  const denCount = Number(row.den_count ?? 0);
  return {
    entityType: "ranks",
    id: String(row.id),
    title: String(row.name),
    subtitle: `Grade ${String(row.grade)}`,
    sourceUrl: String(row.source_url),
    refreshedAt,
    tags: [`${adventureCount} adventures`, `${denCount} dens`]
  };
}

function buildAdminAdventureSummary(row: Record<string, unknown>): AdminCurriculumListItem {
  const refreshedAt = row.refreshed_at ? String(row.refreshed_at) : null;
  const requirementCount = Number(row.requirement_count ?? 0);
  const activityCount = Number(row.activity_count ?? 0);
  return {
    entityType: "adventures",
    id: String(row.id),
    title: String(row.name),
    subtitle: `${String(row.rank_name)} · ${String(row.kind)} · ${String(row.category)}`,
    sourceUrl: String(row.source_url),
    refreshedAt,
    tags: [`${requirementCount} requirements`, `${activityCount} activities`]
  };
}

function buildAdminRequirementSummary(row: Record<string, unknown>): AdminCurriculumListItem {
  const refreshedAt = row.refreshed_at ? String(row.refreshed_at) : null;
  const activityCount = Number(row.activity_count ?? 0);
  return {
    entityType: "requirements",
    id: String(row.id),
    title: `Requirement ${Number(row.requirement_number)}`,
    subtitle: `${String(row.rank_name)} · ${String(row.adventure_name)}`,
    sourceUrl: String(row.source_url),
    refreshedAt,
    tags: [`${activityCount} activities`]
  };
}

function buildAdminActivitySummary(row: Record<string, unknown>): AdminCurriculumListItem {
  const refreshedAt = row.refreshed_at ? String(row.refreshed_at) : null;
  const meetingSpace = String(row.meeting_space ?? "unknown");
  const energyLevel = row.energy_level === null || row.energy_level === undefined ? "?" : `${Number(row.energy_level)}/5`;
  const supplyLevel = row.supply_level === null || row.supply_level === undefined ? "?" : `${Number(row.supply_level)}/5`;
  const prepLevel = row.prep_level === null || row.prep_level === undefined ? "?" : `${Number(row.prep_level)}/5`;
  const requirementNumber = row.requirement_number === null || row.requirement_number === undefined ? null : Number(row.requirement_number);
  return {
    entityType: "activities",
    id: String(row.id),
    title: String(row.name),
    subtitle: `${String(row.rank_name)} · ${String(row.adventure_name)}${requirementNumber ? ` · Requirement ${requirementNumber}` : ""}`,
    sourceUrl: String(row.source_url),
    refreshedAt,
    tags: [meetingSpace, `Energy ${energyLevel}`, `Supplies ${supplyLevel}`, `Prep ${prepLevel}`]
  };
}

function fallbackMeetingSpace(value: string): Activity["meetingSpace"] {
  const normalized = value.toLowerCase();
  if (normalized.includes("outing")) {
    return "outing-with-travel";
  }
  if (normalized.includes("indoor") && normalized.includes("outdoor")) {
    return "indoor-or-outdoor";
  }
  if (normalized.includes("indoor")) {
    return "indoor";
  }
  if (normalized.includes("outdoor")) {
    return "outdoor";
  }
  return "unknown";
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
    INSERT INTO workspaces (id, name)
    VALUES (?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name
  `).run(workspace.id, workspace.name);
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
    id: newGuid(),
    workspaceId: workspace.id,
    rankId: rank.id,
    name: `${rank.name} Den`,
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
    INSERT INTO adventures (id, rank_id, name, slug, kind, category, source_url, snapshot, safety_moment, alternate_path)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      rank_id = excluded.rank_id,
      name = excluded.name,
      slug = excluded.slug,
      kind = excluded.kind,
      category = excluded.category,
      source_url = excluded.source_url,
      snapshot = excluded.snapshot,
      safety_moment = excluded.safety_moment,
      alternate_path = excluded.alternate_path
  `).run(
    adventure.id,
    adventure.rankId,
    adventure.name,
    adventure.slug,
    adventure.kind,
    adventure.category,
    adventure.sourceUrl,
    adventure.snapshot,
    adventure.safetyMoment ?? null,
    adventure.alternatePath ?? null
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
      id, adventure_id, requirement_id, name, slug, source_url, summary,
      meeting_space, energy_level, supply_level, prep_level, duration_minutes,
      materials_json, preview_details, supply_note, directions_json, has_additional_resources
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      adventure_id = excluded.adventure_id,
      requirement_id = excluded.requirement_id,
      name = excluded.name,
      slug = excluded.slug,
      source_url = excluded.source_url,
      summary = excluded.summary,
      meeting_space = excluded.meeting_space,
      energy_level = excluded.energy_level,
      supply_level = excluded.supply_level,
      prep_level = excluded.prep_level,
      duration_minutes = excluded.duration_minutes,
      materials_json = excluded.materials_json,
      preview_details = excluded.preview_details,
      supply_note = excluded.supply_note,
      directions_json = excluded.directions_json,
      has_additional_resources = excluded.has_additional_resources
  `).run(
    activity.id,
    activity.adventureId,
    activity.requirementId,
    activity.name,
    activity.slug,
    activity.sourceUrl,
    activity.summary,
    activity.meetingSpace,
    activity.energyLevel,
    activity.supplyLevel,
    activity.prepLevel,
    activity.durationMinutes,
    JSON.stringify(activity.materials ?? []),
    activity.previewDetails,
    activity.supplyNote ?? null,
    activity.directions ? JSON.stringify(activity.directions) : null,
    activity.hasAdditionalResources ? 1 : 0
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
    name: String(row.name)
  };
}

export function listDenProfiles(): DenProfile[] {
  return db
    .prepare(`
      SELECT den_profiles.*
      FROM den_profiles
      ORDER BY CASE
        WHEN EXISTS (
          SELECT 1
          FROM source_snapshots
          WHERE source_snapshots.entity_type = 'rank'
            AND source_snapshots.entity_id = den_profiles.rank_id
        ) THEN 0
        ELSE 1
      END, den_profiles.name
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
  const activityFieldCoverage: ActivityFieldCoverage = {
    totalActivities: 0,
    meetingSpaceCount: 0,
    energyLevelCount: 0,
    supplyLevelCount: 0,
    prepLevelCount: 0,
    materialsCount: 0
  };
  const activityCoverageRow = db
    .prepare(`
      SELECT
        COUNT(*) AS total_activities,
        SUM(CASE WHEN meeting_space IS NOT NULL AND meeting_space <> '' THEN 1 ELSE 0 END) AS meeting_space_count,
        SUM(CASE WHEN energy_level IS NOT NULL THEN 1 ELSE 0 END) AS energy_level_count,
        SUM(CASE WHEN supply_level IS NOT NULL THEN 1 ELSE 0 END) AS supply_level_count,
        SUM(CASE WHEN prep_level IS NOT NULL THEN 1 ELSE 0 END) AS prep_level_count,
        SUM(
          CASE
            WHEN materials_json IS NOT NULL
             AND materials_json <> '[]'
             AND materials_json <> '["' || ? || '"]'
            THEN 1 ELSE 0
          END
        ) AS materials_count
      FROM activities
    `)
    .get(NO_SUPPLIES_SENTINEL) as Record<string, unknown> | undefined;
  if (activityCoverageRow) {
    activityFieldCoverage.totalActivities = Number(activityCoverageRow.total_activities ?? 0);
    activityFieldCoverage.meetingSpaceCount = Number(activityCoverageRow.meeting_space_count ?? 0);
    activityFieldCoverage.energyLevelCount = Number(activityCoverageRow.energy_level_count ?? 0);
    activityFieldCoverage.supplyLevelCount = Number(activityCoverageRow.supply_level_count ?? 0);
    activityFieldCoverage.prepLevelCount = Number(activityCoverageRow.prep_level_count ?? 0);
    activityFieldCoverage.materialsCount = Number(activityCoverageRow.materials_count ?? 0);
  }
  const datasetMode =
    importedRankCount === 0
      ? "demo"
      : importedRankCount < totalRanks
        ? "mixed"
        : "imported";

  return {
    datasetMode,
    importedRanks,
    lastRefreshedAt,
    activityFieldCoverage
  };
}

export function listAdminCurriculumItems(): AdminCurriculumListItem[] {
  const rankRows = db
    .prepare(`
      SELECT ranks.*, COUNT(DISTINCT adventures.id) AS adventure_count, COUNT(DISTINCT den_profiles.id) AS den_count, source_snapshots.fetched_at AS refreshed_at
      FROM ranks
      LEFT JOIN adventures ON adventures.rank_id = ranks.id
      LEFT JOIN den_profiles ON den_profiles.rank_id = ranks.id
      LEFT JOIN source_snapshots ON source_snapshots.entity_type = 'rank' AND source_snapshots.entity_id = ranks.id
      GROUP BY ranks.id
      ORDER BY ranks.name
    `)
    .all() as Array<Record<string, unknown>>;
  const adventureRows = db
    .prepare(`
      SELECT adventures.*, ranks.name AS rank_name, COUNT(DISTINCT requirements.id) AS requirement_count, COUNT(DISTINCT activities.id) AS activity_count, source_snapshots.fetched_at AS refreshed_at
      FROM adventures
      JOIN ranks ON ranks.id = adventures.rank_id
      LEFT JOIN requirements ON requirements.adventure_id = adventures.id
      LEFT JOIN activities ON activities.adventure_id = adventures.id
      LEFT JOIN source_snapshots ON source_snapshots.entity_type = 'adventure' AND source_snapshots.entity_id = adventures.id
      GROUP BY adventures.id
      ORDER BY ranks.name, adventures.kind, adventures.name
    `)
    .all() as Array<Record<string, unknown>>;
  const requirementRows = db
    .prepare(`
      SELECT requirements.*, adventures.name AS adventure_name, ranks.name AS rank_name, adventures.source_url AS source_url, source_snapshots.fetched_at AS refreshed_at, COUNT(DISTINCT activities.id) AS activity_count
      FROM requirements
      JOIN adventures ON adventures.id = requirements.adventure_id
      JOIN ranks ON ranks.id = adventures.rank_id
      LEFT JOIN activities ON activities.requirement_id = requirements.id
      LEFT JOIN source_snapshots ON source_snapshots.entity_type = 'adventure' AND source_snapshots.entity_id = adventures.id
      GROUP BY requirements.id
      ORDER BY ranks.name, adventures.name, requirements.requirement_number
    `)
    .all() as Array<Record<string, unknown>>;
  const activityRows = db
    .prepare(`
      SELECT activities.*, adventures.name AS adventure_name, ranks.name AS rank_name, requirements.requirement_number AS requirement_number, source_snapshots.fetched_at AS refreshed_at
      FROM activities
      JOIN adventures ON adventures.id = activities.adventure_id
      JOIN ranks ON ranks.id = adventures.rank_id
      LEFT JOIN requirements ON requirements.id = activities.requirement_id
      LEFT JOIN source_snapshots ON source_snapshots.entity_type = 'activity' AND source_snapshots.entity_id = activities.id
      ORDER BY ranks.name, adventures.name, activities.name
    `)
    .all() as Array<Record<string, unknown>>;

  return [
    ...rankRows.map(buildAdminRankSummary),
    ...adventureRows.map(buildAdminAdventureSummary),
    ...requirementRows.map(buildAdminRequirementSummary),
    ...activityRows.map(buildAdminActivitySummary)
  ];
}

function getAdminRankDetail(id: string): AdminCurriculumDetail | null {
  const row = db
    .prepare(`
      SELECT ranks.*, COUNT(DISTINCT adventures.id) AS adventure_count, COUNT(DISTINCT den_profiles.id) AS den_count
      FROM ranks
      LEFT JOIN adventures ON adventures.rank_id = ranks.id
      LEFT JOIN den_profiles ON den_profiles.rank_id = ranks.id
      WHERE ranks.id = ?
      GROUP BY ranks.id
    `)
    .get(id) as Record<string, unknown> | undefined;
  if (!row) {
    return null;
  }
  return {
    entityType: "ranks",
    record: {
      ...mapRank(row),
      adventureCount: Number(row.adventure_count ?? 0),
      denCount: Number(row.den_count ?? 0),
      sourceSnapshot: getSourceSnapshot("rank", id)
    }
  };
}

function getAdminAdventureDetail(id: string): AdminCurriculumDetail | null {
  const row = db
    .prepare(`
      SELECT adventures.*, ranks.name AS rank_name, COUNT(DISTINCT requirements.id) AS requirement_count, COUNT(DISTINCT activities.id) AS activity_count
      FROM adventures
      JOIN ranks ON ranks.id = adventures.rank_id
      LEFT JOIN requirements ON requirements.adventure_id = adventures.id
      LEFT JOIN activities ON activities.adventure_id = adventures.id
      WHERE adventures.id = ?
      GROUP BY adventures.id
    `)
    .get(id) as Record<string, unknown> | undefined;
  if (!row) {
    return null;
  }
  return {
    entityType: "adventures",
    record: {
      ...mapAdventure(row),
      rankName: String(row.rank_name),
      requirementCount: Number(row.requirement_count ?? 0),
      activityCount: Number(row.activity_count ?? 0),
      sourceSnapshot: getSourceSnapshot("adventure", id)
    }
  };
}

function getAdminRequirementDetail(id: string): AdminCurriculumDetail | null {
  const row = db
    .prepare(`
      SELECT requirements.*, adventures.name AS adventure_name, ranks.name AS rank_name, adventures.source_url AS source_url, COUNT(DISTINCT activities.id) AS activity_count
      FROM requirements
      JOIN adventures ON adventures.id = requirements.adventure_id
      JOIN ranks ON ranks.id = adventures.rank_id
      LEFT JOIN activities ON activities.requirement_id = requirements.id
      WHERE requirements.id = ?
      GROUP BY requirements.id
    `)
    .get(id) as Record<string, unknown> | undefined;
  if (!row) {
    return null;
  }
  return {
    entityType: "requirements",
    record: {
      ...mapRequirement(row),
      rankName: String(row.rank_name),
      adventureName: String(row.adventure_name),
      activityCount: Number(row.activity_count ?? 0),
      sourceSnapshot: getSourceSnapshot("adventure", String(row.adventure_id))
    }
  };
}

function getAdminActivityDetail(id: string): AdminCurriculumDetail | null {
  const row = db
    .prepare(`
      SELECT activities.*, adventures.name AS adventure_name, ranks.name AS rank_name, requirements.requirement_number AS requirement_number
      FROM activities
      JOIN adventures ON adventures.id = activities.adventure_id
      JOIN ranks ON ranks.id = adventures.rank_id
      LEFT JOIN requirements ON requirements.id = activities.requirement_id
      WHERE activities.id = ?
    `)
    .get(id) as Record<string, unknown> | undefined;
  if (!row) {
    return null;
  }
  return {
    entityType: "activities",
    record: {
      ...mapActivity(row),
      rankName: String(row.rank_name),
      adventureName: String(row.adventure_name),
      requirementNumber: row.requirement_number === null || row.requirement_number === undefined ? null : Number(row.requirement_number),
      sourceSnapshot: getSourceSnapshot("activity", id)
    }
  };
}

export function getAdminCurriculumDetail(entityType: CurriculumEntityType, id: string): AdminCurriculumDetail | null {
  switch (entityType) {
    case "ranks":
      return getAdminRankDetail(id);
    case "adventures":
      return getAdminAdventureDetail(id);
    case "requirements":
      return getAdminRequirementDetail(id);
    case "activities":
      return getAdminActivityDetail(id);
    default:
      return null;
  }
}

export function saveAdminCurriculumRecord(input: AdminCurriculumWrite): AdminCurriculumDetail | null {
  switch (input.entityType) {
    case "ranks": {
      upsertRank(input.record);
      ensureDefaultDenProfileForRank(input.record);
      return getAdminRankDetail(input.record.id);
    }
    case "adventures": {
      const rank = getRank(input.record.rankId);
      if (!rank) {
        throw new Error("Rank not found for adventure");
      }
      upsertAdventure(input.record);
      return getAdminAdventureDetail(input.record.id);
    }
    case "requirements": {
      const adventure = getAdventureBundle(input.record.adventureId);
      if (!adventure) {
        throw new Error("Adventure not found for requirement");
      }
      upsertRequirement(input.record);
      return getAdminRequirementDetail(input.record.id);
    }
    case "activities": {
      const adventure = getAdventureBundle(input.record.adventureId);
      if (!adventure) {
        throw new Error("Adventure not found for activity");
      }
      if (input.record.requirementId) {
        const requirement = db
          .prepare("SELECT * FROM requirements WHERE id = ? AND adventure_id = ?")
          .get(input.record.requirementId, input.record.adventureId) as Record<string, unknown> | undefined;
        if (!requirement) {
          throw new Error("Requirement not found for activity");
        }
      }
      upsertActivity(input.record);
      return getAdminActivityDetail(input.record.id);
    }
    default:
      return null;
  }
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
  return Array.isArray(savedPlan.payload.request.adventureIds) ? savedPlan.payload.request.adventureIds : [];
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

export function resetCurriculumForRebuild(): void {
  db.exec(`
    DELETE FROM source_snapshots;
    DELETE FROM meeting_recaps;
    DELETE FROM meeting_plans;
    DELETE FROM activities;
    DELETE FROM requirements;
    DELETE FROM adventures;
    DELETE FROM den_profiles;
    DELETE FROM ranks;
  `);
}

export function saveMeetingPlan(input: SaveMeetingPlanRequest): SavedMeetingPlan {
  const savedPlan: SavedMeetingPlan = {
    id: input.payload.id,
    denId: input.denId,
    title: input.title,
    plannedDate: input.plannedDate,
    payload: input.payload,
    recap: getMeetingRecap(input.payload.id),
    createdAt: new Date().toISOString()
  };
  db.prepare(`
    INSERT INTO meeting_plans (
      id, den_id, title, planned_date, payload_json, created_at
    ) VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      den_id = excluded.den_id,
      title = excluded.title,
      planned_date = excluded.planned_date,
      payload_json = excluded.payload_json
  `).run(
    savedPlan.id,
    savedPlan.denId,
    savedPlan.title,
    savedPlan.plannedDate,
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
        title: String(record.title),
        plannedDate: record.planned_date ? String(record.planned_date) : null,
        payload: JSON.parse(String(record.payload_json)) as MeetingPlan,
        recap: getMeetingRecap(id),
        createdAt: String(record.created_at)
      };
    });
}