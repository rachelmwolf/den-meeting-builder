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
  $("div[data-elementor-type='loop-item']").each((_index, element) => {
    const card = $(element);
    const link = card.find("a[href*='/cub-scout-adventures/']").first();
    const href = link.attr("href");
    const text = normalizeText(link.text()).replace(/^View /i, "").trim();
    if (!href || !text) {
      return;
    }
    if (seen.has(text.toLowerCase())) {
      return;
    }
    seen.add(text.toLowerCase());

    const classTokens = (card.attr("class") ?? "").split(/\s+/);
    const topicToken = classTokens.find((token) => token.startsWith("cs-adv-topic-"));
    const category =
      card.find("span").map((_i, span) => normalizeText($(span).text())).get().find(Boolean) ??
      topicToken?.replace("cs-adv-topic-", "").replace(/-/g, " ").replace(/\b\w/g, (char) => char.toUpperCase()) ??
      "Adventure";
    const kind = classTokens.includes("cs-adv-type-elective") ? "elective" : "required";

    adventures.push({
      id: makeId(rank.id, text),
      rankId: rank.id,
      name: text,
      slug: slugify(text),
      kind,
      category,
      sourceUrl: absolutize(href),
      snapshot: ""
    });
  });

  if (adventures.length > 0) {
    return adventures;
  }

  $("a").each((_index, element) => {
    const href = $(element).attr("href");
    const text = normalizeText($(element).text());
    if (!href || !/^View /i.test(text)) {
      return;
    }
    const name = text.replace(/^View /i, "").trim();
    if (seen.has(name.toLowerCase())) {
      return;
    }
    seen.add(name.toLowerCase());
    const card = $(element).closest("article, div, section");
    const category = normalizeText(card.find("p, span").first().text()) || "Adventure";
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

function normalizeText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function isLikelyContentText(text: string): boolean {
  if (!text) {
    return false;
  }
  if (text.length < 20 || text.length > 420) {
    return false;
  }
  if (/(^|[\s.])jQuery\s*\(|elementor\/|tippy\s*\(|function\s*\(|var\s+\$currentTooltip|data-tippy|maxWidth:|zIndex:|followCursor:|animateFill:|flipOnUpdate:|arrowType:/i.test(text)) {
    return false;
  }
  return true;
}

function isStopHeading(text: string): boolean {
  return /^(additional resources|other activities options|resources|legal|connect with us|feedback)$/i.test(text);
}

function shouldSkipContentText(text: string): boolean {
  return (
    /image$/i.test(text) ||
    (/:\s*$/.test(text) && text.length < 40) ||
    (/^(lion|tiger|wolf|bear|webelos|arrow of light)\s+[–-]/i.test(text) &&
      /\b(indoor|outdoor|either)\b/i.test(text) &&
      text.length < 100)
  );
}

function collectPreviewText($: cheerio.CheerioAPI, selector: string, limit: number): string[] {
  const seen = new Set<string>();
  const results: string[] = [];
  $(selector).each((_index, element) => {
    const text = normalizeText($(element).text());
    if (!isLikelyContentText(text) || shouldSkipContentText(text) || seen.has(text)) {
      return;
    }
    seen.add(text);
    results.push(text);
    if (results.length >= limit) {
      return false;
    }
  });
  return results;
}

function extractCardTexts(article: cheerio.Cheerio<any>, $: cheerio.CheerioAPI): string[] {
  return article
    .find(".elementor-icon-box-title, .elementor-icon-box-description, .elementor-heading-title, p, span")
    .map((_index, element) => normalizeText($(element).text()))
    .get()
    .filter(Boolean);
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
    const metaBits = extractCardTexts(article, $);
    const location = metaBits.find((item) => /^(Indoor|Outdoor|Either)$/i.test(item)) ?? "Either";
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
      prepMinutes: null,
      durationMinutes: null,
      difficulty: null,
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
  $("script, style, noscript, template").remove();

  const root = $("#main, main, article, body").first();
  const contentNodes = root.find("h1, h2, h3, h4, p, li").toArray();
  const previewParts: string[] = [];
  const seen = new Set<string>();
  let started = false;

  for (const node of contentNodes) {
    const tagName = node.tagName.toLowerCase();
    const text = normalizeText($(node).text());
    if (!text) {
      continue;
    }

    if (!started) {
      if (tagName === "h1" && text.toLowerCase() === activity.name.toLowerCase()) {
        started = true;
      }
      continue;
    }

    if (/^h[1-4]$/.test(tagName) && isStopHeading(text)) {
      break;
    }

    if ((tagName === "p" || tagName === "li") && isLikelyContentText(text) && !shouldSkipContentText(text) && !seen.has(text)) {
      seen.add(text);
      previewParts.push(text);
      if (previewParts.length >= 6) {
        break;
      }
    }
  }

  if (previewParts.length === 0) {
    previewParts.push(...collectPreviewText($, "#main p, main p, article p", 3));
    previewParts.push(...collectPreviewText($, "#main li, main li, article li", 3));
  }

  const previewDetails = previewParts.join("\n\n").trim();
  return {
    ...activity,
    notes: previewDetails || activity.notes,
    previewDetails: previewDetails || `${activity.summary}\n\nSee the official activity page for full instructions.`
  };
}