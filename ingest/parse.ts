import * as cheerio from "cheerio";
import type { Activity, ActivityMeetingSpace, Adventure, AdventureBundle, Rank, Requirement } from "../shared/types.js";
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
      card.find("span").map((_i, span) => normalizeAdventureCategory($(span).text())).get().find(Boolean) ??
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
    const category = normalizeAdventureCategory(card.find("p, span").first().text()) || "Adventure";
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

function normalizeMeetingSpace(text: string): ActivityMeetingSpace {
  const normalized = normalizeText(text).toLowerCase();
  if (normalized.includes("outing with travel")) {
    return "outing-with-travel";
  }
  if (normalized.includes("indoor") && normalized.includes("outdoor")) {
    return "indoor-or-outdoor";
  }
  if (normalized.includes("indoor")) {
    return "indoor";
  }
  if (normalized.includes("outdoor")) {
    return "outdoor";
  }
  return "unknown";
}

function parseOfficialKeyLevel(raw: string, label: string): number | null {
  const pattern = new RegExp(`${label}([\\s\\S]{0,220})`, "i");
  const match = raw.match(pattern);
  if (!match) {
    return null;
  }
  const numbers = Array.from(match[1].matchAll(/\b([1-5])\b/g)).map((entry) => Number(entry[1]));
  return numbers.length ? numbers[numbers.length - 1] : null;
}

function parseOfficialKeyLevelByLabels(raw: string, labels: string[]): number | null {
  for (const label of labels) {
    const value = parseOfficialKeyLevel(raw, label);
    if (value !== null) {
      return value;
    }
  }
  return null;
}

function parseOfficialKeyLevelFromPage($: cheerio.CheerioAPI, label: string): number | null {
  const nodes = $("p, li, div, span").toArray();
  for (const node of nodes) {
    const text = normalizeText($(node).text());
    if (!text || !new RegExp(label, "i").test(text)) {
      continue;
    }
    const numbers = Array.from(text.matchAll(/\b([1-5])\b/g)).map((entry) => Number(entry[1]));
    if (numbers.length) {
      return numbers[numbers.length - 1];
    }
  }
  return null;
}

function normalizeText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function normalizeAdventureCategory(text: string): string {
  const normalized = normalizeText(text).replace(/^View /i, "").trim();
  if (!normalized || /^view$/i.test(normalized)) {
    return "Adventure";
  }
  if (/bobcat/i.test(normalized)) {
    return "Character & Leadership";
  }
  return normalized;
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

function looksLikeMaterialText(value: string): boolean {
  return /(\bbring\b|\bsuppl(y|ies)\b|\bmaterials?\b|\bhandbook\b|\bcrayons?\b|\bpencils?\b|\bmarkers?\b|\bcards?\b|\bpaper\b|\btape\b|\bcones?\b|\brope\b|\bwater bottle\b|\bwhistle\b|\bflashlight\b|\bsunscreen\b|\bhat\b|\bsunglasses\b|\btrail mix\b|\bfirst aid kit\b|\bgear\b)/i.test(value);
}

function extractMaterials(values: string[]): string[] {
  const seen = new Set<string>();
  const materials: string[] = [];
  for (const value of values) {
    if (!value || !looksLikeMaterialText(value) || seen.has(value)) {
      continue;
    }
    seen.add(value);
    materials.push(value);
  }
  return materials;
}

function shouldSkipContentText(text: string): boolean {
  return (
    /image$/i.test(text) ||
    /^(energy level of cub scouts|supply list for this activity|preparation time for this activity)\b/i.test(text) ||
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
    .find(".elementor-icon-box-title, .elementor-icon-box-description, .elementor-heading-title, p, span, div")
    .map((_index, element) => normalizeText($(element).text()))
    .get()
    .filter(Boolean);
}

function firstMeaningfulText(values: string[]): string {
  return values.find((value) => value.length > 0) ?? "";
}

function extractRequirementText($: cheerio.CheerioAPI, heading: any): string {
  const directText = normalizeText($(heading).nextAll("p, ul, ol").first().text());
  if (directText) {
    return directText;
  }

  const widgetText = firstMeaningfulText(
    $(heading)
      .closest(".elementor-widget")
      .nextAll(".elementor-widget")
      .slice(0, 2)
      .find("p, li")
      .map((_index, element) => normalizeText($(element).text()))
      .get()
  );
  if (widgetText) {
    return widgetText;
  }

  const columnText = firstMeaningfulText(
    $(heading)
      .closest(".elementor-column")
      .find("p, li")
      .map((_index, element) => normalizeText($(element).text()))
      .get()
  );
  if (columnText) {
    return columnText;
  }

  return "";
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
    const text = extractRequirementText($, element);
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
    const meetingSpace = normalizeMeetingSpace(
      metaBits.find((item) => /(Indoor|Outdoor|Outing with travel|Either)/i.test(item)) ?? ""
    );
    const numericMeta = metaBits.map((item) => parseDifficulty(item)).filter((value): value is number => value !== null);
    const materials = extractMaterials(metaBits);
    const requirement = currentRequirementNumber ? requirementByNumber.get(currentRequirementNumber) ?? null : null;
    activities.push({
      id: makeId(adventure.id, name),
      adventureId: adventure.id,
      requirementId: requirement?.id ?? null,
      name,
      slug: slugify(name),
      sourceUrl: absolutize(link.attr("href") ?? ""),
      summary,
      meetingSpace,
      energyLevel: numericMeta[0] ?? null,
      supplyLevel: numericMeta[1] ?? null,
      prepLevel: numericMeta[2] ?? null,
      durationMinutes: null,
      materials,
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
  const materials = extractMaterials(previewParts);
  const rawText = cheerio.load(html).text().replace(/\s+/g, " ").trim();
  const inferredMeetingSpace = normalizeMeetingSpace(rawText);
  return {
    ...activity,
    meetingSpace: inferredMeetingSpace === "unknown" ? activity.meetingSpace : inferredMeetingSpace,
    energyLevel:
      parseOfficialKeyLevelFromPage($, "Energy Level of Cub Scouts") ??
      parseOfficialKeyLevel(rawText, "Energy Level of Cub Scouts") ??
      activity.energyLevel,
    supplyLevel:
      parseOfficialKeyLevelFromPage($, "Supply List for this Activity") ??
      parseOfficialKeyLevel(rawText, "Supply List for this Activity") ??
      activity.supplyLevel,
    prepLevel:
      parseOfficialKeyLevelFromPage($, "Prep Time for this Activity") ??
      parseOfficialKeyLevelFromPage($, "Preparation Time for this Activity") ??
      parseOfficialKeyLevelByLabels(rawText, ["Prep Time for this Activity", "Preparation Time for this Activity"]) ??
      activity.prepLevel,
    materials: materials.length ? materials : activity.materials,
    notes: previewDetails || activity.notes,
    previewDetails: previewDetails || `${activity.summary}\n\nSee the official activity page for full instructions.`
  };
}