import * as cheerio from "cheerio";
import type { Activity, Adventure, AdventureBundle, Rank, Requirement } from "../shared/types.js";
import { makeId, slugify } from "../shared/utils.js";
import { BASE_URL } from "./constants.js";

interface RankLink {
  name: string;
  grade: string;
  sourceUrl: string;
  slug: string;
}

function absolutize(url: string): string {
  if (url.startsWith("http")) {
    return url;
  }
  return new URL(url, BASE_URL).toString();
}

export function parseRankIndex(html: string): RankLink[] {
  const $ = cheerio.load(html);
  const seen = new Set<string>();
  const results: RankLink[] = [];
  $("a").each((_index, element) => {
    const text = $(element).text().replace(/\s+/g, " ").trim();
    const href = $(element).attr("href");
    const match = text.match(/^View (.+) Rank$/i);
    if (!match || !href) {
      return;
    }
    const name = match[1].replace(/\s+/g, " ").trim();
    if (seen.has(name.toLowerCase())) {
      return;
    }
    seen.add(name.toLowerCase());
    const card = $(element).closest("a, div, article, section").parent();
    const headings = card.find("h3").map((_i, h) => $(h).text().trim()).get();
    const grade = headings.find((entry) => /\d|Kindergarten/i.test(entry)) ?? "";
    results.push({
      name,
      grade,
      sourceUrl: absolutize(href),
      slug: slugify(name)
    });
  });
  return results;
}

export function parseRankPage(html: string, rank: Rank): Adventure[] {
  const $ = cheerio.load(html);
  const adventures: Adventure[] = [];
  const seen = new Set<string>();
  $("a").each((_index, element) => {
    const href = $(element).attr("href");
    const text = $(element).text().replace(/\s+/g, " ").trim();
    if (!href || !/^View /i.test(text)) {
      return;
    }
    const name = text.replace(/^View /i, "").trim();
    if (seen.has(name.toLowerCase())) {
      return;
    }
    seen.add(name.toLowerCase());
    const card = $(element).closest("article, div, section");
    const category = card.find("p, span").first().text().trim() || "Adventure";
    const kind = /elective/i.test(card.text()) ? "elective" : "required";
    adventures.push({
      id: makeId(rank.id, name),
      rankId: rank.id,
      name,
      slug: slugify(name),
      kind,
      category,
      sourceUrl: absolutize(href),
      snapshot: ""
    });
  });
  return adventures;
}

function parseDifficulty(text: string): number | null {
  const firstNumber = text.match(/\b(\d+)\b/);
  return firstNumber ? Number(firstNumber[1]) : null;
}

export function parseAdventurePage(html: string, adventure: Adventure): AdventureBundle {
  const $ = cheerio.load(html);
  const snapshot =
    $("#main p").first().text().replace(/\s+/g, " ").trim() ||
    $("h2:contains('Snapshot of adventure')").next("p").text().replace(/\s+/g, " ").trim();
  const nextAdventure = { ...adventure, snapshot };

  const requirements: Requirement[] = [];
  $("h3").each((_index, element) => {
    const heading = $(element).text().replace(/\s+/g, " ").trim();
    const match = heading.match(/^Requirement (\d+)$/i);
    if (!match) {
      return;
    }
    const text = $(element).nextAll("p").first().text().replace(/\s+/g, " ").trim();
    requirements.push({
      id: makeId(adventure.id, `requirement-${match[1]}`),
      adventureId: adventure.id,
      requirementNumber: Number(match[1]),
      text
    });
  });

  const requirementByNumber = new Map(requirements.map((req) => [req.requirementNumber, req]));
  const activities: Activity[] = [];
  let currentRequirementNumber: number | null = null;

  $("h2, h3, article").each((_index, element) => {
    const tagName = element.tagName.toLowerCase();
    if (tagName === "h2") {
      const heading = $(element).text().replace(/\s+/g, " ").trim();
      const match = heading.match(/^Requirement (\d+)$/i);
      currentRequirementNumber = match ? Number(match[1]) : currentRequirementNumber;
      return;
    }
    if (tagName !== "article") {
      return;
    }
    const article = $(element);
    const link = article.find("a").first();
    const name = article.find("h2, h3").first().text().replace(/\s+/g, " ").trim();
    const summary = article.find("p").last().text().replace(/\s+/g, " ").trim();
    if (!name || !link.attr("href")) {
      return;
    }
    const metaBits = article.find("div").map((_i, div) => $(div).text().replace(/\s+/g, " ").trim()).get();
    const location = metaBits.find((item) => /Indoor|Outdoor/i.test(item)) ?? "Either";
    const numericBits = metaBits.filter((item) => /^\d+$/.test(item)).map((item) => Number(item));
    const requirement = currentRequirementNumber ? requirementByNumber.get(currentRequirementNumber) ?? null : null;
    activities.push({
      id: makeId(adventure.id, name),
      adventureId: adventure.id,
      requirementId: requirement?.id ?? null,
      name,
      slug: slugify(name),
      sourceUrl: absolutize(link.attr("href") ?? ""),
      summary,
      location,
      prepMinutes: numericBits[0] ? numericBits[0] * 5 : null,
      durationMinutes: numericBits[1] ? numericBits[1] * 5 : null,
      difficulty: numericBits[2] ?? parseDifficulty(metaBits.join(" ")),
      notes: summary,
      previewDetails: summary
    });
  });

  return {
    adventure: nextAdventure,
    requirements,
    activities
  };
}

export function parseActivityDetailPage(html: string, activity: Activity): Activity {
  const $ = cheerio.load(html);
  const paragraphs = $("#main p, main p, article p")
    .map((_index, element) => $(element).text().replace(/\s+/g, " ").trim())
    .get()
    .filter(Boolean);
  const bulletNotes = $("#main li, main li, article li")
    .map((_index, element) => $(element).text().replace(/\s+/g, " ").trim())
    .get()
    .filter(Boolean);
  const previewDetails = [...paragraphs, ...bulletNotes.slice(0, 4)].join("\n\n").trim();
  return {
    ...activity,
    notes: previewDetails || activity.notes,
    previewDetails: previewDetails || `${activity.summary}\n\nSee the official activity page for full instructions.`
  };
}