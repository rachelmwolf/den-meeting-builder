import { describe, expect, test } from "vitest";
import { db, initDb, resetContentForTests, saveSourceSnapshot, upsertAdventure, upsertActivity, upsertRank, upsertRequirement } from "../server/db.js";
import { repairActivitiesFromSnapshots } from "../ingest/repairPreviews.ts";
import type { Activity, Adventure, Rank, Requirement } from "../shared/types.js";
import { NO_SUPPLIES_SENTINEL } from "../shared/utils.js";
import { newGuid } from "../shared/utils.js";

function buildActivityHtml(title: string, supplyBlock: string, summary = "Summary text."): string {
  return `
    <main id="main">
      <h1>${title}</h1>
      <div class="elementor-widget-wrap elementor-element-populated">
        <div class="elementor-element elementor-widget elementor-widget-heading">
          <div class="elementor-widget-container">
            <h2 class="elementor-heading-title elementor-size-default">Snapshot of Activity</h2>
          </div>
        </div>
        <div class="elementor-element elementor-widget elementor-widget-text-editor">
          <div class="elementor-widget-container">
            <p>${summary}</p>
          </div>
        </div>
        <div class="elementor-element elementor-widget elementor-widget-heading">
          <div class="elementor-widget-container">
            <h3 class="elementor-heading-title elementor-size-default">Supply List</h3>
          </div>
        </div>
        <div class="elementor-element elementor-widget elementor-widget-html">
          <div class="elementor-widget-container">
            ${supplyBlock}
          </div>
        </div>
      </div>
    </main>
  `;
}

function getMaterials(activityId: string): string[] {
  const row = db.prepare("SELECT materials_json FROM activities WHERE id = ?").get(activityId) as
    | { materials_json: string }
    | undefined;
  if (!row) {
    return [];
  }
  return JSON.parse(row.materials_json) as string[];
}

describe("materials backfill", () => {
  test("repairs incomplete materials from saved activity snapshots only when the parsed list is clearly better", () => {
    initDb();
    resetContentForTests();

    const rank: Rank = {
      id: newGuid(),
      name: "Lion",
      grade: "Kindergarten",
      slug: "lion",
      sourceUrl: "https://www.scouting.org/programs/cub-scouts/adventures/lion/"
    };
    const adventure: Adventure = {
      id: newGuid(),
      rankId: rank.id,
      name: "Bobcat Lion",
      slug: "bobcat-lion",
      kind: "required",
      category: "Character & Leadership",
      sourceUrl: "https://www.scouting.org/cub-scout-adventures/bobcat-lion/",
      snapshot: "Snapshot"
    };
    const requirement: Requirement = {
      id: newGuid(),
      adventureId: adventure.id,
      requirementNumber: 1,
      text: "Get to know the members of your den."
    };

    upsertRank(rank);
    upsertAdventure(adventure);
    upsertRequirement(requirement);

    const activityA: Activity = {
      id: newGuid(),
      adventureId: adventure.id,
      requirementId: requirement.id,
      name: "Fill Empty Materials",
      slug: "fill-empty-materials",
      sourceUrl: "https://www.scouting.org/cub-scout-activities/fill-empty-materials/",
      summary: "Summary",
      meetingSpace: "indoor",
      energyLevel: 1,
      supplyLevel: 1,
      prepLevel: 1,
      durationMinutes: 10,
      materials: [],
      previewDetails: ""
    };
    const activityB: Activity = {
      ...activityA,
      id: newGuid(),
      name: "Expand Short Materials",
      slug: "expand-short-materials",
      sourceUrl: "https://www.scouting.org/cub-scout-activities/expand-short-materials/",
      materials: ["Pencils"]
    };
    const activityC: Activity = {
      ...activityA,
      id: newGuid(),
      name: "Keep Good Materials",
      slug: "keep-good-materials",
      sourceUrl: "https://www.scouting.org/cub-scout-activities/keep-good-materials/",
      materials: ["Paper", "Markers", "Tape", "Scissors"]
    };
    const activityD: Activity = {
      ...activityA,
      id: newGuid(),
      name: "Supply Free",
      slug: "supply-free",
      sourceUrl: "https://www.scouting.org/cub-scout-activities/supply-free/",
      materials: ["Placeholder"]
    };
    const activityE: Activity = {
      ...activityA,
      id: newGuid(),
      name: "Suspicious Short List",
      slug: "suspicious-short-list",
      sourceUrl: "https://www.scouting.org/cub-scout-activities/suspicious-short-list/",
      materials: ["Handbook", "Send a reminder to parents to bring scissors."]
    };

    const longSupplyHtml = buildActivityHtml(
      "Fill Empty Materials",
      "<p>Crayons</p><p>Pencils</p><p>Paper</p><p>Markers</p>"
    );
    const longerSupplyHtml = buildActivityHtml(
      "Expand Short Materials",
      "<p>Handbook</p><p>Pencils</p><p>Paper</p><p>Markers</p>"
    );
    const shorterSupplyHtml = buildActivityHtml(
      "Keep Good Materials",
      "<p>Paper</p><p>Markers</p>"
    );
    const noSuppliesHtml = buildActivityHtml("Supply Free", "<p>No supplies are required.</p>");
    const suspiciousHtml = buildActivityHtml(
      "Suspicious Short List",
      "<p>Handbook</p><p>Crayons</p><p>Scissors</p>"
    );

    for (const [activity, html] of [
      [activityA, longSupplyHtml],
      [activityB, longerSupplyHtml],
      [activityC, shorterSupplyHtml],
      [activityD, noSuppliesHtml],
      [activityE, suspiciousHtml]
    ] as Array<[Activity, string]>) {
      upsertActivity(activity);
      saveSourceSnapshot("activity", activity.id, activity.sourceUrl, html);
    }

    const report = repairActivitiesFromSnapshots({ batchSize: 2 });

    expect(report).toMatchObject({
      total: 5,
      updated: 3,
      unchanged: 2,
      supplyFree: 1,
      suspicious: 1
    });

    expect(getMaterials(activityA.id)).toEqual(["Crayons", "Pencils", "Paper", "Markers"]);
    expect(getMaterials(activityB.id)).toEqual(["Handbook", "Pencils", "Paper", "Markers"]);
    expect(getMaterials(activityC.id)).toEqual(["Paper", "Markers", "Tape", "Scissors"]);
    expect(getMaterials(activityD.id)).toEqual([NO_SUPPLIES_SENTINEL]);
    expect(getMaterials(activityE.id)).toEqual(["Handbook", "Send a reminder to parents to bring scissors."]);
  });
});