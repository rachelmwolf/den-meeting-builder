import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { ensureDefaultDenProfileForRank, getContentStatus, initDb, listDenProfiles, resetContentForTests, saveSourceSnapshot, upsertRank, upsertWorkspace } from "../server/db.js";
import { demoContent } from "../shared/demo.js";
import type { Rank } from "../shared/types.js";

const importedRank: Rank = {
  id: "wolf",
  name: "Wolf",
  grade: "2nd Grade",
  slug: "wolf",
  sourceUrl: "https://www.scouting.org/programs/cub-scouts/adventures/wolf/"
};

describe("content status", () => {
  beforeEach(() => {
    initDb();
    resetContentForTests();
    upsertWorkspace(demoContent.workspace);
    upsertRank(demoContent.rank);
  });

  afterEach(() => {
    resetContentForTests();
  });

  test("reports demo mode when no imported snapshots exist", () => {
    const status = getContentStatus();

    expect(status.datasetMode).toBe("demo");
    expect(status.importedRanks).toEqual([]);
    expect(status.lastRefreshedAt).toBeNull();
    expect(status.activityFieldCoverage).toMatchObject({
      totalActivities: 0,
      meetingSpaceCount: 0,
      energyLevelCount: 0,
      supplyLevelCount: 0,
      prepLevelCount: 0,
      materialsCount: 0
    });
  });

  test("reports mixed mode and creates a usable den for an imported rank", () => {
    upsertRank(importedRank);
    saveSourceSnapshot("rank", importedRank.id, importedRank.sourceUrl, "<main>Wolf</main>", "2026-03-22T10:00:00.000Z");
    ensureDefaultDenProfileForRank(importedRank);

    const status = getContentStatus();
    const dens = listDenProfiles();

    expect(status.datasetMode).toBe("mixed");
    expect(status.importedRanks).toEqual([
      {
        rankId: "wolf",
        rankName: "Wolf",
        refreshedAt: "2026-03-22T10:00:00.000Z"
      }
    ]);
    expect(status.activityFieldCoverage).toMatchObject({
      totalActivities: 0,
      meetingSpaceCount: 0,
      energyLevelCount: 0,
      supplyLevelCount: 0,
      prepLevelCount: 0,
      materialsCount: 0
    });
    expect(dens[0]).toMatchObject({
      rankId: "wolf",
      name: "Wolf Imported Den"
    });
  });
});