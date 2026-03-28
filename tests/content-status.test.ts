import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { ensureDefaultDenProfileForRank, getContentStatus, initDb, listDenProfiles, resetContentForTests, saveSourceSnapshot, upsertRank, upsertWorkspace } from "../server/db.js";
import { demoContent } from "../shared/demo.js";
import type { Rank } from "../shared/types.js";
import { newGuid } from "../shared/utils.js";

const guidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const importedRank: Rank = {
  id: newGuid(),
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
        rankId: importedRank.id,
        rankName: "Wolf",
        refreshedAt: "2026-03-22T10:00:00.000Z"
      }
    ]);
    expect(status.importedRanks[0]?.rankId).toMatch(guidPattern);
    expect(status.activityFieldCoverage).toMatchObject({
      totalActivities: 0,
      meetingSpaceCount: 0,
      energyLevelCount: 0,
      supplyLevelCount: 0,
      prepLevelCount: 0,
      materialsCount: 0
    });
    expect(dens[0]).toMatchObject({
      rankId: importedRank.id,
      name: "Wolf Den"
    });
  });
});