import { describe, expect, test } from "vitest";
import { parseActivityDetailPage, parseAdventurePage, parseRankIndex, parseRankPage } from "../ingest/parse.js";
import { activityPageFixture, adventurePageFixture, noisyActivityPageFixture, rankIndexFixture, rankPageFixture } from "./fixtures.js";
import type { Rank } from "../shared/types.js";

const rank: Rank = {
  id: "lion",
  name: "Lion",
  grade: "Kindergarten",
  slug: "lion",
  sourceUrl: "https://www.scouting.org/programs/cub-scouts/adventures/lion/"
};

describe("ingest parsers", () => {
  test("extracts rank links from the index page", () => {
    const ranks = parseRankIndex(rankIndexFixture);
    expect(ranks).toHaveLength(2);
    expect(ranks[0]).toMatchObject({
      name: "Lion",
      sourceUrl: "https://www.scouting.org/programs/cub-scouts/adventures/lion/"
    });
  });

  test("extracts adventures from a rank page", () => {
    const adventures = parseRankPage(rankPageFixture, rank);
    expect(adventures).toHaveLength(2);
    expect(adventures[0]).toMatchObject({
      name: "Bobcat Lion",
      kind: "required"
    });
    expect(adventures[1]).toMatchObject({
      name: "Friends Are Fun",
      kind: "elective"
    });
  });

  test("extracts requirements and activities from an adventure page", () => {
    const adventure = {
      id: "lion__bobcat-lion",
      rankId: "lion",
      name: "Bobcat Lion",
      slug: "bobcat-lion",
      kind: "required" as const,
      category: "Character & Leadership",
      sourceUrl: "https://www.scouting.org/cub-scout-adventures/bobcat-lion/",
      snapshot: ""
    };
    const bundle = parseAdventurePage(adventurePageFixture, adventure);
    expect(bundle.requirements).toHaveLength(3);
    expect(bundle.activities).toHaveLength(4);
    expect(bundle.activities[0]).toMatchObject({
      name: "Den Doodle Lion",
      requirementId: bundle.requirements[0].id,
      meetingSpace: "indoor",
      energyLevel: 2,
      supplyLevel: 4,
      prepLevel: 2
    });
    expect(bundle.activities[1]).toMatchObject({
      name: "Den Flag Lion",
      requirementId: bundle.requirements[0].id
    });
    expect(bundle.adventure.snapshot).toContain("first required Adventure");
  });

  test("extracts preview content from an activity detail page", () => {
    const enriched = parseActivityDetailPage(activityPageFixture, {
      id: "sample",
      adventureId: "lion__bobcat-lion",
      requirementId: "req-2",
      name: "The Compliment Game",
      slug: "the-compliment-game",
      sourceUrl: "https://www.scouting.org/cub-scout-activities/the-compliment-game/",
      summary: "Everyone pays a compliment to each other in a game.",
      meetingSpace: "indoor",
      energyLevel: 1,
      supplyLevel: 2,
      prepLevel: 1,
      durationMinutes: 10,
      notes: "",
      previewDetails: ""
    });

    expect(enriched.previewDetails).toContain("Gather scouts in a circle");
    expect(enriched.previewDetails).toContain("Use simple prompts");
    expect(enriched.energyLevel).toBe(2);
    expect(enriched.supplyLevel).toBe(2);
    expect(enriched.prepLevel).toBe(1);
  });

  test("filters script-like tooltip content from an activity detail page", () => {
    const enriched = parseActivityDetailPage(noisyActivityPageFixture, {
      id: "sample",
      adventureId: "lion__bobcat-lion",
      requirementId: "req-1",
      name: "Den Doodle Lion",
      slug: "den-doodle-lion",
      sourceUrl: "https://www.scouting.org/cub-scout-activities/den-doodle-lion/",
      summary: "The den doodle is a craft project.",
      meetingSpace: "indoor",
      energyLevel: 2,
      supplyLevel: 4,
      prepLevel: 2,
      durationMinutes: 15,
      notes: "",
      previewDetails: ""
    });

    expect(enriched.previewDetails).toContain("The den doodle is a craft project");
    expect(enriched.previewDetails).toContain("Let each scout add one piece");
    expect(enriched.previewDetails).not.toContain("jQuery(window)");
    expect(enriched.previewDetails).not.toContain("elementor/frontend/init");
    expect(enriched.previewDetails).not.toContain("Lion - Kindergarten Den Doodle Lion Indoor");
  });
});