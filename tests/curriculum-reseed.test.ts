import { describe, expect, test } from "vitest";
import { parseAdventurePage, parseRankPage } from "../ingest/parse.js";
import { adventurePageFixture, rankPageFixture } from "./fixtures.js";
import { db, initDb, resetContentForTests, resetCurriculumForRebuild, saveBundle } from "../server/db.js";
import type { Rank } from "../shared/types.js";
import { newGuid } from "../shared/utils.js";

const guidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function countRows(tableName: string): number {
  const row = db.prepare(`SELECT COUNT(*) AS count FROM ${tableName}`).get() as { count: number };
  return row.count;
}

describe("curriculum reseed", () => {
  test("rebuilds cleanly and keeps guid ids on every curriculum level", () => {
    initDb();
    resetContentForTests();

    const rank: Rank = {
      id: newGuid(),
      name: "Lion",
      grade: "Kindergarten",
      slug: "lion",
      sourceUrl: "https://www.scouting.org/programs/cub-scouts/adventures/lion/"
    };

    const adventures = parseRankPage(rankPageFixture, rank);
    const bundle = parseAdventurePage(adventurePageFixture, adventures[0]);

    expect(rank.id).toMatch(guidPattern);
    adventures.forEach((adventure) => expect(adventure.id).toMatch(guidPattern));
    bundle.requirements.forEach((requirement) => expect(requirement.id).toMatch(guidPattern));
    bundle.activities.forEach((activity) => expect(activity.id).toMatch(guidPattern));

    resetCurriculumForRebuild();
    saveBundle(bundle, rank);

    expect(countRows("ranks")).toBe(1);
    expect(countRows("adventures")).toBe(1);
    expect(countRows("requirements")).toBe(3);
    expect(countRows("activities")).toBe(4);

    resetCurriculumForRebuild();
    saveBundle(bundle, rank);

    expect(countRows("ranks")).toBe(1);
    expect(countRows("adventures")).toBe(1);
    expect(countRows("requirements")).toBe(3);
    expect(countRows("activities")).toBe(4);
  });
});