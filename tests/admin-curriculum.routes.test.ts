import { afterEach, beforeEach, describe, expect, test } from "vitest";
import {
  getAdminCurriculumDetail,
  initDb,
  listAdminCurriculumItems,
  resetContentForTests,
  saveAdminCurriculumRecord
} from "../server/db.js";
import type { Activity, ActivityDirections, Adventure, Rank, Requirement } from "../shared/types.js";
import { newGuid } from "../shared/utils.js";

const guidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe("admin curriculum records", () => {
  beforeEach(() => {
    initDb();
    resetContentForTests();
  });

  afterEach(() => {
    resetContentForTests();
  });

  test("round-trips GUID curriculum records through the admin save/read path", () => {
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
      snapshot: "Snapshot text"
    };
    const requirement: Requirement = {
      id: newGuid(),
      adventureId: adventure.id,
      requirementNumber: 1,
      text: "Get to know the members of your den."
    };
    const activity: Activity = {
      id: newGuid(),
      adventureId: adventure.id,
      requirementId: requirement.id,
      name: "Den Doodle Lion",
      slug: "den-doodle-lion",
      sourceUrl: "https://www.scouting.org/cub-scout-activities/den-doodle-lion/",
      summary: "The den doodle is a craft project.",
      meetingSpace: "indoor",
      energyLevel: 2,
      supplyLevel: 4,
      prepLevel: 2,
      durationMinutes: 15,
      materials: ["Pencils"],
      supplyNote: "Bring a pencil sharpener.",
      directions: {
        atHomeOption: null,
        before: {
          heading: "Before the meeting",
          steps: [{ text: "Gather pencils.", bullets: [] }]
        },
        during: {
          heading: "During the meeting",
          steps: [{ text: "Draw together.", bullets: [] }]
        },
        after: null
      } satisfies ActivityDirections,
      hasAdditionalResources: true,
      previewDetails: "Preview"
    };

    const savedRank = saveAdminCurriculumRecord({ entityType: "ranks", record: rank });
    const savedAdventure = saveAdminCurriculumRecord({ entityType: "adventures", record: adventure });
    const savedRequirement = saveAdminCurriculumRecord({ entityType: "requirements", record: requirement });
    const savedActivity = saveAdminCurriculumRecord({ entityType: "activities", record: activity });

    expect(savedRank?.record.id).toMatch(guidPattern);
    expect(savedAdventure?.record.id).toMatch(guidPattern);
    expect(savedRequirement?.record.id).toMatch(guidPattern);
    expect(savedActivity?.record.id).toMatch(guidPattern);

    const items = listAdminCurriculumItems();
    expect(items.map((item) => item.id)).toContain(activity.id);
    expect(items.every((item) => guidPattern.test(item.id))).toBe(true);

    const detail = getAdminCurriculumDetail("activities", activity.id);
    expect(detail?.record.id).toBe(activity.id);
    expect(detail?.record.rankName).toBe(rank.name);
    expect(detail?.record.adventureName).toBe(adventure.name);
    expect(detail?.record.id).toMatch(guidPattern);
    expect(detail?.record.supplyNote).toBe(activity.supplyNote);
    expect(detail?.record.hasAdditionalResources).toBe(true);
    expect(detail?.record.directions?.before?.heading).toBe("Before the meeting");
  });
});