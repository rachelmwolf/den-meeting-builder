import { rankOverrides, rankIndexUrl } from "./constants.js";
import { fetchHtml } from "./fetch.js";
import { parseActivityDetailPage, parseAdventurePage, parseRankIndex, parseRankPage } from "./parse.js";
import { ensureDefaultDenProfileForRank, initDb, saveBundle, saveSourceSnapshot, upsertRank } from "../server/db.js";
import type { Rank } from "../shared/types.js";

function makeRank(record: { name: string; grade: string; slug: string; sourceUrl: string }): Rank {
  return {
    id: record.slug,
    name: record.name,
    grade: record.grade,
    slug: record.slug,
    sourceUrl: record.sourceUrl
  };
}

async function ingestAdventure(rank: Rank, adventureUrl: string): Promise<void> {
  const rankHtml = await fetchHtml(rank.sourceUrl);
  saveSourceSnapshot("rank", rank.id, rank.sourceUrl, rankHtml);
  const adventures = parseRankPage(rankHtml, rank);
  const adventure = adventures.find((entry) => entry.sourceUrl === adventureUrl || entry.slug === adventureUrl);
  if (!adventure) {
    throw new Error(`Adventure ${adventureUrl} not found under ${rank.name}`);
  }
  const adventureHtml = await fetchHtml(adventure.sourceUrl);
  saveSourceSnapshot("adventure", adventure.id, adventure.sourceUrl, adventureHtml);
  const bundle = await enrichActivities(parseAdventurePage(adventureHtml, adventure));
  saveBundle(bundle, rank);
  ensureDefaultDenProfileForRank(rank);
  console.log(`Saved ${rank.name} / ${adventure.name}`);
}

async function enrichActivities(bundle: ReturnType<typeof parseAdventurePage>): Promise<ReturnType<typeof parseAdventurePage>> {
  const activities = await Promise.all(
    bundle.activities.map(async (activity) => {
      try {
        const html = await fetchHtml(activity.sourceUrl);
        saveSourceSnapshot("activity", activity.id, activity.sourceUrl, html);
        return parseActivityDetailPage(html, activity);
      } catch {
        return activity;
      }
    })
  );
  return { ...bundle, activities };
}

async function ingestRank(rankSlug: string): Promise<void> {
  const rankRecord = rankOverrides.find((entry) => entry.slug === rankSlug);
  if (!rankRecord) {
    throw new Error(`Unknown rank: ${rankSlug}`);
  }
  const rank = makeRank(rankRecord);
  upsertRank(rank);
  const rankHtml = await fetchHtml(rank.sourceUrl);
  saveSourceSnapshot("rank", rank.id, rank.sourceUrl, rankHtml);
  const adventures = parseRankPage(rankHtml, rank);
  for (const adventure of adventures) {
    const adventureHtml = await fetchHtml(adventure.sourceUrl);
    saveSourceSnapshot("adventure", adventure.id, adventure.sourceUrl, adventureHtml);
    const bundle = await enrichActivities(parseAdventurePage(adventureHtml, adventure));
    saveBundle(bundle, rank);
    console.log(`Saved ${rank.name} / ${adventure.name}`);
  }
  ensureDefaultDenProfileForRank(rank);
}

async function ingestAll(): Promise<void> {
  const indexHtml = await fetchHtml(rankIndexUrl);
  const rankLinks = parseRankIndex(indexHtml);
  const rankRecords = rankOverrides.length > 0 ? rankOverrides : rankLinks;
  for (const rankRecord of rankRecords) {
    await ingestRank(rankRecord.slug);
  }
}

async function main(): Promise<void> {
  initDb();
  const command = process.argv[2];
  if (command === "all") {
    await ingestAll();
    return;
  }
  if (command === "rank") {
    const rankSlug = process.argv[3];
    if (!rankSlug) {
      throw new Error("Usage: npm run ingest:rank -- lion");
    }
    await ingestRank(rankSlug);
    return;
  }
  if (command === "adventure") {
    const rankSlug = process.argv[3];
    const adventureUrl = process.argv[4];
    if (!rankSlug || !adventureUrl) {
      throw new Error("Usage: npm run ingest:adventure -- lion bobcat-lion");
    }
    const rankRecord = rankOverrides.find((entry) => entry.slug === rankSlug);
    if (!rankRecord) {
      throw new Error(`Unknown rank: ${rankSlug}`);
    }
    await ingestAdventure(makeRank(rankRecord), adventureUrl);
    return;
  }
  throw new Error("Usage: npm run ingest:all | ingest:rank -- <rank> | ingest:adventure -- <rank> <slug-or-url>");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});