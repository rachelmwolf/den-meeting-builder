import { rankOverrides, rankIndexUrl } from "./constants.js";
import { fetchHtml, fetchProxyMarkdown } from "./fetch.js";
import {
  parseActivityDetailPage,
  parseActivitySourcePage,
  parseAdventureMarkdown,
  parseAdventurePage,
  parseRankIndex,
  parseRankPage
} from "./parse.js";
import {
  ensureDefaultDenProfileForRank,
  initDb,
  resetCurriculumForRebuild,
  saveBundle,
  saveSourceSnapshot,
  upsertRank
} from "../server/db.js";
import type { Activity, Adventure, Rank, Requirement } from "../shared/types.js";
import { newGuid } from "../shared/utils.js";

function makeRank(record: { name: string; grade: string; slug: string; sourceUrl: string }): Rank {
  return {
    id: newGuid(),
    name: record.name,
    grade: record.grade,
    slug: record.slug,
    sourceUrl: record.sourceUrl
  };
}

function parseSitemapUrls(xml: string): string[] {
  return Array.from(xml.matchAll(/<loc>([^<]+)<\/loc>/g), (match) => match[1]);
}

async function fetchActivityUrls(): Promise<string[]> {
  const sitemapIndex = await fetchHtml("https://www.scouting.org/wp-sitemap.xml");
  const sitemapUrls = parseSitemapUrls(sitemapIndex).filter((url) => /cs-adv-activity-sitemap.*\.xml$/i.test(url));
  const activityUrls: string[] = [];
  const seen = new Set<string>();

  for (const sitemapUrl of sitemapUrls) {
    const sitemapXml = await fetchHtml(sitemapUrl);
    for (const url of parseSitemapUrls(sitemapXml)) {
      if (
        !/\/cub-scout-activities\//i.test(url) ||
        /\/cub-scout-activities\/?$/i.test(url) ||
        seen.has(url)
      ) {
        continue;
      }
      seen.add(url);
      activityUrls.push(url);
    }
  }

  return activityUrls;
}

function chunk<T>(values: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
}

async function ingestAdventure(rank: Rank, adventureUrl: string, reset = true): Promise<void> {
  if (reset) {
    resetCurriculumForRebuild();
  }
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

async function ingestRank(rankSlug: string, reset = true): Promise<void> {
  if (reset) {
    resetCurriculumForRebuild();
  }
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
  resetCurriculumForRebuild();
  const activityUrls = await fetchActivityUrls();
  const rankByKey = new Map<string, Rank>();
  const adventureByKey = new Map<string, Adventure>();
  const requirementByKey = new Map<string, Requirement>();
  const activitiesByAdventureKey = new Map<string, Activity[]>();
  const adventureToRankKey = new Map<string, string>();
  let fetchedActivityCount = 0;

  for (const batch of chunk(activityUrls, 18)) {
    const parsedBatch = await Promise.all(
      batch.map(async (activityUrl) => {
        try {
          const html = await fetchHtml(activityUrl);
          return { activityUrl, html, parsed: parseActivitySourcePage(html, activityUrl) };
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          console.error(`Failed to ingest activity ${activityUrl}: ${message}`);
          return null;
        }
      })
    );

    for (const entry of parsedBatch.filter((value): value is NonNullable<typeof value> => Boolean(value))) {
      const { activityUrl, html, parsed } = entry;
      if (parsed.requirementNumber === null) {
        console.error(`Skipping ${activityUrl} because no requirement number could be parsed`);
        continue;
      }
      const rankKey = `${parsed.rank.name}::${parsed.rank.grade}`;
      let rank = rankByKey.get(rankKey);
      if (!rank) {
        rank = {
          id: newGuid(),
          ...parsed.rank
        };
        rankByKey.set(rankKey, rank);
      }

      const adventureKey = `${rankKey}::${parsed.adventure.name}`;
      let adventure = adventureByKey.get(adventureKey);
      if (!adventure) {
        adventure = {
          id: newGuid(),
          rankId: rank.id,
          ...parsed.adventure
        };
        adventureByKey.set(adventureKey, adventure);
        adventureToRankKey.set(adventureKey, rankKey);
      }

      const requirementKey = `${adventureKey}::${parsed.requirementNumber}`;
      let requirement = requirementByKey.get(requirementKey);
      if (!requirement) {
        requirement = {
          id: newGuid(),
          adventureId: adventure.id,
          requirementNumber: parsed.requirementNumber,
          text: ""
        };
        requirementByKey.set(requirementKey, requirement);
      }

      const activity = {
        ...parsed.activity,
        adventureId: adventure.id,
        requirementId: requirement.id
      };
      saveSourceSnapshot("activity", activity.id, activity.sourceUrl, html);

      const adventureActivities = activitiesByAdventureKey.get(adventureKey) ?? [];
      adventureActivities.push(activity);
      activitiesByAdventureKey.set(adventureKey, adventureActivities);
    }
    fetchedActivityCount += parsedBatch.filter((value): value is NonNullable<typeof value> => Boolean(value)).length;
    console.log(`Fetched ${fetchedActivityCount}/${activityUrls.length} activities`);
  }

  const orderedRanks = rankOverrides
    .map((override) => Array.from(rankByKey.values()).find((rank) => rank.name === override.name))
    .filter((rank): rank is Rank => Boolean(rank));
  for (const rank of orderedRanks.length > 0 ? orderedRanks : Array.from(rankByKey.values())) {
    upsertRank(rank);
    try {
      const rankHtml = await fetchHtml(rank.sourceUrl);
      saveSourceSnapshot("rank", rank.id, rank.sourceUrl, rankHtml);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Failed to snapshot rank ${rank.name}: ${message}`);
    }
    ensureDefaultDenProfileForRank(rank);
  }

  for (const [adventureKey, adventure] of adventureByKey.entries()) {
    const rankKey = adventureToRankKey.get(adventureKey);
    const rank = rankKey ? rankByKey.get(rankKey) : null;
    if (!rank) {
      continue;
    }

    try {
      const markdown = await fetchProxyMarkdown(adventure.sourceUrl);
      saveSourceSnapshot("adventure", adventure.id, adventure.sourceUrl, markdown);
      const parsedAdventure = parseAdventureMarkdown(markdown);
      adventure.snapshot = parsedAdventure.snapshot || adventure.snapshot;
      adventure.safetyMoment = parsedAdventure.safetyMoment || adventure.safetyMoment;
      adventure.alternatePath = parsedAdventure.alternatePath || adventure.alternatePath;
      const requirementTexts = new Map(parsedAdventure.requirements.map((entry) => [entry.number, entry.text]));
      const requirements = Array.from(
        requirementByKey.values()
      )
        .filter((requirement) => requirement.adventureId === adventure.id)
        .map((requirement) => ({
          ...requirement,
          text: requirementTexts.get(requirement.requirementNumber) ?? requirement.text
        }))
        .sort((left, right) => left.requirementNumber - right.requirementNumber);
      const activities = (activitiesByAdventureKey.get(adventureKey) ?? []).sort((left, right) =>
        left.name.localeCompare(right.name)
      );
      saveBundle({ adventure, requirements, activities }, rank);
      console.log(`Saved ${rank.name} / ${adventure.name}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Failed to ingest adventure ${adventure.name}: ${message}`);
    }
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