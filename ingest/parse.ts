import * as cheerio from "cheerio";
import type {
  Activity,
  ActivityDirections,
  ActivityMeetingSpace,
  Adventure,
  AdventureBundle,
  Rank,
  Requirement
} from "../shared/types.js";
import { NO_SUPPLIES_SENTINEL, newGuid, slugify } from "../shared/utils.js";
import { BASE_URL } from "./constants.js";

interface RankLink {
  name: string;
  grade: string;
  sourceUrl: string;
  slug: string;
}

export interface ParsedActivitySourcePage {
  rank: Omit<Rank, "id">;
  adventure: Omit<Adventure, "id" | "rankId">;
  requirementNumber: number | null;
  activity: Activity;
}

export interface ParsedAdventureMarkdown {
  snapshot: string;
  safetyMoment: string;
  alternatePath: string;
  requirements: Array<{ number: number; text: string }>;
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
      id: newGuid(),
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
      id: newGuid(),
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
  if (normalized.includes("outing with travel") || normalized === "travel") {
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
    /^no supplies are required\.?$/i.test(text) ||
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

function findExactHeading($: cheerio.CheerioAPI, text: string): cheerio.Cheerio<any> {
  return $("h1, h2, h3, h4, .elementor-heading-title, .pp-accordion-title-text")
    .filter((_index, element) => normalizeText($(element).text()) === text)
    .first();
}

function normalizeMarkdownText(text: string): string {
  return normalizeText(text)
    .replace(/!\[[^\]]*\]\([^)]+\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function isMarkdownHeadingLine(line: string): boolean {
  return /^#{2,6}\s/.test(line.trim());
}

function collectMarkdownSection(lines: string[], startIndex: number, stopPatterns: RegExp[] = []): string {
  if (startIndex < 0) {
    return "";
  }

  const collected: string[] = [];
  for (const line of lines.slice(startIndex + 1)) {
    const trimmed = line.trim();
    if (isMarkdownHeadingLine(trimmed)) {
      break;
    }
    if (stopPatterns.some((pattern) => pattern.test(trimmed))) {
      break;
    }
    if (!trimmed) {
      continue;
    }
    collected.push(normalizeMarkdownText(trimmed));
  }

  return collected.join(" ").replace(/\s+/g, " ").trim();
}

function extractTextSequence($: cheerio.CheerioAPI, root: cheerio.Cheerio<any>): string[] {
  return root
    .find("h1, h2, h3, h4, p, span, li")
    .map((_index, element) => normalizeText($(element).text()))
    .get()
    .filter(Boolean);
}

function collectFollowingWidgetTexts(
  $: cheerio.CheerioAPI,
  heading: cheerio.Cheerio<any>,
  selector: string,
  stopHeadings: string[] = []
): string[] {
  const headingWidget = heading.closest(".elementor-widget");
  if (!headingWidget.length) {
    return [];
  }

  const stopSet = new Set(stopHeadings.map((value) => normalizeText(value).toLowerCase()));
  const results: string[] = [];
  const scope = heading.closest(".elementor-container, .elementor-column, main, article, body");
  const widgets = scope.find(".elementor-widget").toArray();
  const startIndex = widgets.findIndex((element) => element === headingWidget.get(0));
  if (startIndex < 0) {
    return [];
  }

  for (const element of widgets.slice(startIndex + 1)) {
    const widget = $(element);
    const widgetHeadings = widget
      .find("h1, h2, h3, h4")
      .map((_i, node) => normalizeText($(node).text()).toLowerCase())
      .get();
    if (widgetHeadings.some((text) => stopSet.has(text))) {
      break;
    }

    widget.find(selector).each((_subIndex, subElement) => {
      const text = normalizeText($(subElement).text());
      if (!text) {
        return;
      }
      results.push(text);
    });
  }

  return results;
}

function collectFollowingDocumentTexts(
  $: cheerio.CheerioAPI,
  heading: cheerio.Cheerio<any>,
  selector: string,
  stopHeadings: string[] = []
): string[] {
  const headingNode = heading.get(0);
  if (!headingNode) {
    return [];
  }

  const stopSet = new Set(stopHeadings.map((value) => normalizeText(value).toLowerCase()));
  const scope = heading.closest(".elementor-container, .elementor-column, main, article, body");
  const descendants = scope.find("*").toArray();
  const results: string[] = [];
  let afterHeading = false;

  for (const element of descendants) {
    if (!afterHeading) {
      if (element === headingNode) {
        afterHeading = true;
      }
      continue;
    }

    const node = $(element);
    const text = normalizeText(node.text());
    if (text && /^h[1-4]$/i.test(element.tagName) && stopSet.has(text.toLowerCase())) {
      break;
    }
    if (!node.is(selector)) {
      continue;
    }
    if (!text) {
      continue;
    }
    results.push(text);
  }

  return results;
}

function collectFollowingTexts(
  $: cheerio.CheerioAPI,
  heading: cheerio.Cheerio<any>,
  selector: string,
  stopHeadings: string[] = []
): string[] {
  const results = [
    ...collectFollowingWidgetTexts($, heading, selector, stopHeadings),
    ...collectFollowingDocumentTexts($, heading, selector, stopHeadings)
  ];
  const seen = new Set<string>();
  return results.filter((value) => {
    if (seen.has(value)) {
      return false;
    }
    seen.add(value);
    return true;
  });
}

function extractSnapshotSummary($: cheerio.CheerioAPI): string {
  const heading = findExactHeading($, "Snapshot of Activity");
  if (!heading.length) {
    return "";
  }
  return (
    collectFollowingTexts($, heading, "p", ["Adventure Activity Key", "Supply List", "Directions", "Additional Resources", "Other Activities Options"])[0] ??
    ""
  );
}

function findNextTextIndex(text: string, startIndex: number, labels: string[]): number {
  let nextIndex = -1;
  for (const label of labels) {
    const labelIndex = text.indexOf(label, startIndex);
    if (labelIndex === -1) {
      continue;
    }
    if (nextIndex === -1 || labelIndex < nextIndex) {
      nextIndex = labelIndex;
    }
  }
  return nextIndex;
}

function parseActivityKeyValuesFromText(text: string): {
  meetingSpace: ActivityMeetingSpace | null;
  energyLevel: number | null;
  supplyLevel: number | null;
  prepLevel: number | null;
} {
  const normalized = normalizeText(text);
  const meetingSpace = normalizeMeetingSpace(normalized);
  const numbers = Array.from(normalized.matchAll(/\b([1-5])\b/g)).map((entry) => Number(entry[1]));
  return {
    meetingSpace: meetingSpace === "unknown" ? null : meetingSpace,
    energyLevel: numbers[0] ?? null,
    supplyLevel: numbers[1] ?? null,
    prepLevel: numbers[2] ?? null
  };
}

function extractActivityKey($: cheerio.CheerioAPI): {
  meetingSpace: ActivityMeetingSpace | null;
  energyLevel: number | null;
  supplyLevel: number | null;
  prepLevel: number | null;
} {
  const heading = findExactHeading($, "Snapshot of Activity");
  if (!heading.length) {
    return {
      meetingSpace: null,
      energyLevel: null,
      supplyLevel: null,
      prepLevel: null
    };
  }

  const values = collectFollowingWidgetTexts($, heading, ".elementor-icon-box-title span", [
    "Supply List",
    "Directions",
    "Additional Resources",
    "Other Activities Options"
  ]);
  if (values.length >= 4) {
    const [meetingSpaceText = "", energyText = "", supplyText = "", prepText = ""] = values;
    const meetingSpace = normalizeMeetingSpace(meetingSpaceText);
    return {
      meetingSpace: meetingSpace === "unknown" ? null : meetingSpace,
      energyLevel: parseDifficulty(energyText),
      supplyLevel: parseDifficulty(supplyText),
      prepLevel: parseDifficulty(prepText)
    };
  }

  const summary = extractSnapshotSummary($);
  const rawText = $("#main, main, article, body").first().text().replace(/\s+/g, " ").trim();
  const summaryIndex = summary && rawText.includes(summary) ? rawText.indexOf(summary) + summary.length : rawText.indexOf("Snapshot of Activity");
  const sectionStart = summaryIndex >= 0 ? summaryIndex : 0;
  const sectionEnd = findNextTextIndex(rawText, sectionStart, [
    "Supply List",
    "Directions",
    "Additional Resources",
    "Other Activities Options"
  ]);
  const section = rawText.slice(sectionStart, sectionEnd >= 0 ? sectionEnd : undefined);
  return parseActivityKeyValuesFromText(section);
}

function looksLikeSupplyNote(text: string): boolean {
  return /(^supply list note:)|\b(can be made|example of a den doodle|stands on its own|there are several different designs)\b/i.test(text);
}

function isSupplySectionBoundary(text: string): boolean {
  return /^(Before the meeting|Before camping|During the meeting|During the meeting or at home|After the meeting|At Home Option|Den Meeting Option|Go Camping!):?$/i.test(
    text.replace(/\s+/g, " ").trim()
  );
}

function extractSupplyList($: cheerio.CheerioAPI): {
  supplyNote: string | null;
  materials: string[];
  noSupplies: boolean;
} {
  const heading = findExactHeading($, "Supply List");
  if (!heading.length) {
    return {
      supplyNote: null,
      materials: [],
      noSupplies: false
    };
  }

  const accordionTexts = heading
    .closest(".pp-accordion-item")
    .find(".pp-accordion-tab-content")
    .first()
    .find("p, li")
    .map((_index, element) => normalizeText($(element).text()))
    .get()
    .filter(Boolean);
  const texts =
    accordionTexts.length > 0
      ? accordionTexts
      : collectFollowingTexts($, heading, "p, li", ["Directions", "Additional Resources", "Other Activities Options"]);
  const materials: string[] = [];
  let supplyNote: string | null = null;
  const noSuppliesPattern = /^no supplies are required\.?$/i;

  for (const [index, text] of texts.entries()) {
    let value = text.replace(/^Supply List:\s*/i, "").trim();
    if (!value) {
      continue;
    }
    if (isSupplySectionBoundary(value)) {
      break;
    }
    if (noSuppliesPattern.test(text) || noSuppliesPattern.test(value)) {
      return {
        supplyNote,
        materials: [],
        noSupplies: true
      };
    }
    if (index === 0 && /^Supply List Note:\s*/i.test(value)) {
      supplyNote = value.replace(/^Supply List Note:\s*/i, "").trim();
      continue;
    }
    if (index === 0 && !/^Supply List:/i.test(text) && looksLikeSupplyNote(value) && texts.length > 1) {
      supplyNote = value;
      continue;
    }
    if (!supplyNote && /^Supply List Note:\s*/i.test(text)) {
      supplyNote = text.replace(/^Supply List Note:\s*/i, "").trim();
      continue;
    }
    materials.push(value);
  }

  return {
    supplyNote,
    materials,
    noSupplies: false
  };
}

function parseDirectionStep($: cheerio.CheerioAPI, li: cheerio.Cheerio<any>): { text: string; bullets: string[] } {
  const clone = $(li).clone();
  clone.children("ul, ol").remove();
  const text = normalizeText(clone.text());
  const bullets = $(li)
    .children("ul, ol")
    .first()
    .children("li")
    .map((_index, item) => normalizeText($(item).text()))
    .get()
    .filter(Boolean);
  return {
    text,
    bullets
  };
}

function extractDirections($: cheerio.CheerioAPI): ActivityDirections | null {
  const container = $(".pp-accordion-tab-content")
    .filter((_index, element) => /(Before the meeting|Before camping|At Home Option|Den Meeting Option|Go Camping!)/i.test(normalizeText($(element).text())))
    .first();
  if (!container.length) {
    return null;
  }

  const directions: ActivityDirections = {
    atHomeOption: null,
    before: null,
    during: null,
    after: null
  };

  let currentSection: keyof ActivityDirections | null = null;
  let currentGroup: "atHomeOption" | "denMeeting" | null = null;
  container.children().each((_index, element) => {
    const tagName = element.tagName.toLowerCase();
    const text = normalizeText($(element).text());
    if (!text) {
      return;
    }

    if (tagName === "p") {
      if (/^At Home Option:?$/i.test(text)) {
        currentGroup = "atHomeOption";
        currentSection = null;
        directions.atHomeOption = {
          heading: "At Home Option",
          steps: []
        };
        return;
      }
      if (/^Den Meeting Option:?$/i.test(text)) {
        currentGroup = "denMeeting";
        currentSection = null;
        return;
      }
      const match = text.match(/^(Before the meeting|Before camping|During the meeting|During the meeting or at home|Go Camping!|After the meeting):?$/i);
      if (match) {
        currentGroup = "denMeeting";
        const key = match[1].toLowerCase().startsWith("before")
          ? "before"
          : match[1].toLowerCase().startsWith("during") || /^go camping!$/i.test(match[1])
            ? "during"
            : "after";
        currentSection = key;
        directions[currentSection] = {
          heading: match[1],
          steps: []
        };
      }
      return;
    }

    if (tagName === "ol" && currentGroup === "atHomeOption" && directions.atHomeOption) {
      const steps = $(element)
        .children("li")
        .map((_stepIndex, li) => parseDirectionStep($, $(li)))
        .get();
      directions.atHomeOption.steps.push(...steps);
      return;
    }

    if (tagName === "ol" && currentGroup === "denMeeting" && currentSection) {
      const steps = $(element)
        .children("li")
        .map((_stepIndex, li) => parseDirectionStep($, $(li)))
        .get();
      if (directions[currentSection]) {
        directions[currentSection]!.steps.push(...steps);
      }
    }
  });

  return directions.atHomeOption || directions.before || directions.during || directions.after ? directions : null;
}

function extractHasAdditionalResources($: cheerio.CheerioAPI): boolean {
  return findExactHeading($, "Additional Resources").length > 0;
}

function extractActivitySourceMetadata($: cheerio.CheerioAPI): {
  rankName: string;
  rankGrade: string;
  rankSourceUrl: string;
  adventureName: string;
  adventureSourceUrl: string;
  adventureKind: Adventure["kind"];
  adventureCategory: string;
  requirementNumber: number | null;
  title: string;
} {
  const root = $("#main, main, article, body").first();
  const textSequence = extractTextSequence($, root);
  const snapshotIndex = textSequence.findIndex((text) => text === "Snapshot of Activity");
  const headerTexts = snapshotIndex >= 0 ? textSequence.slice(0, snapshotIndex) : textSequence.slice(0, 24);

  const rankLinks = $("a[href*='/programs/cub-scouts/adventures/']")
    .map((_index, element) => $(element).attr("href") ?? "")
    .get()
    .filter(Boolean);
  const rankSourceUrl = rankLinks.at(-1) ?? "";

  const rankText =
    headerTexts.find((text) => /\b(Kindergarten|1st Grade|2nd Grade|3rd Grade|4th Grade|5th Grade)\b/i.test(text)) ??
    "";
  const rankMatch = rankText.match(/^(.*?)\s*[–-]\s*(.*)$/);
  const rankName = normalizeText(rankMatch?.[1] ?? rankText);
  const rankGrade = normalizeText(rankMatch?.[2] ?? "");

  const adventureLinks = $("a[href*='/cub-scout-adventures/']")
    .map((_index, element) => $(element).attr("href") ?? "")
    .get()
    .filter(Boolean);
  const adventureSourceUrl = adventureLinks.at(-1) ?? "";

  const afterRank = headerTexts.slice(headerTexts.indexOf(rankText) >= 0 ? headerTexts.indexOf(rankText) + 1 : 0);
  const bodyText = normalizeText($("body").first().text());
  const requirementText =
    bodyText.match(/\bRequirement\s+(\d+)\b/i)?.[0] ??
    textSequence.find((text) => /^Requirement \d+$/i.test(text)) ??
    afterRank.find((text) => /^Requirement \d+$/i.test(text)) ??
    "";
  const requirementNumberMatch = requirementText.match(/^Requirement (\d+)$/i);
  const requirementNumber = requirementNumberMatch ? Number(requirementNumberMatch[1]) : null;
  const beforeRequirement = afterRank.slice(0, requirementText ? afterRank.indexOf(requirementText) : afterRank.length);
  const kindText = beforeRequirement.find((text) => /^(Required|Elective)$/i.test(text)) ?? "Required";
  const adventureName = beforeRequirement.find(
    (text) => text !== rankText && !/^(Required|Elective)$/i.test(text) && !/^Requirement \d+$/i.test(text)
  );
  const adventureCategory =
    beforeRequirement.find(
      (text) =>
        text !== rankText &&
        text !== adventureName &&
        !/^(Required|Elective)$/i.test(text) &&
        !/^Requirement \d+$/i.test(text)
    ) ?? "";
  const title = normalizeText($("h1").first().text()) || headerTexts[headerTexts.length - 1] || adventureName || "";

  return {
    rankName,
    rankGrade,
    rankSourceUrl,
    adventureName: adventureName ?? "",
    adventureSourceUrl,
    adventureKind: /elective/i.test(kindText) ? "elective" : "required",
    adventureCategory,
    requirementNumber,
    title
  };
}

export function parseActivitySourcePage(html: string, sourceUrl: string): ParsedActivitySourcePage {
  const $ = cheerio.load(html);
  $("script, style, noscript, template").remove();
  const metadata = extractActivitySourceMetadata($);
  const activityName = metadata.title || metadata.adventureName;
  const summary = extractSnapshotSummary($);
  const draftActivity: Activity = {
    id: newGuid(),
    adventureId: newGuid(),
    requirementId: null,
    name: activityName,
    slug: slugify(activityName),
    sourceUrl,
    summary,
    meetingSpace: "unknown",
    energyLevel: null,
    supplyLevel: null,
    prepLevel: null,
    durationMinutes: null,
    materials: [],
    previewDetails: summary
  };
  const enriched = parseActivityDetailPage(html, draftActivity);
  return {
    rank: {
      name: metadata.rankName,
      grade: metadata.rankGrade,
      slug: slugify(metadata.rankName),
      sourceUrl: metadata.rankSourceUrl
    },
    adventure: {
      name: metadata.adventureName || activityName,
      slug: slugify(metadata.adventureName || activityName),
      kind: metadata.adventureKind,
      category: metadata.adventureCategory || "Adventure",
      sourceUrl: metadata.adventureSourceUrl,
      snapshot: ""
    },
    requirementNumber: metadata.requirementNumber,
    activity: enriched
  };
}

export function parseAdventureMarkdown(markdown: string): ParsedAdventureMarkdown {
  const lines = markdown.split(/\r?\n/);
  const snapshotIndex = lines.findIndex((line) => /^## Snapshot of adventure$/i.test(line.trim()));
  const safetyMomentIndex = lines.findIndex((line) => /Safety Moment/i.test(line.trim()));
  const completeIndex = lines.findIndex((line) => /^## Complete the following requirements$/i.test(line.trim()));

  const snapshot = collectMarkdownSection(lines, snapshotIndex, [ /^### /i ]);
  const safetyMoment = collectMarkdownSection(lines, safetyMomentIndex, [ /^## Complete the following requirements$/i ]);

  let alternatePath = "";
  if (snapshotIndex >= 0 && completeIndex >= 0) {
    const alternateStartIndex = lines.findIndex((line, index) => {
      if (index <= snapshotIndex || index >= completeIndex) {
        return false;
      }
      const trimmed = line.trim();
      return /^#{2,6}\s/.test(trimmed) && !/Safety Moment/i.test(trimmed);
    });
    if (alternateStartIndex >= 0) {
      const heading = normalizeMarkdownText(lines[alternateStartIndex].replace(/^#{2,6}\s+/, ""));
      const body = collectMarkdownSection(lines, alternateStartIndex, [ /^## Complete the following requirements$/i ]);
      alternatePath = [heading, body].filter(Boolean).join(" ").trim();
    }
  }

  const requirements: Array<{ number: number; text: string }> = [];
  for (let index = 0; index < lines.length; index += 1) {
    const heading = lines[index].trim();
    const match = heading.match(/^### Requirement (\d+)$/i);
    if (!match) {
      continue;
    }
    const number = Number(match[1]);
    const text = collectMarkdownSection(lines, index, [/^### Requirement \d+$/i, /^## Requirement \d+$/i, /^## Complete the following requirements$/i]);
    if (text) {
      requirements.push({ number, text });
    }
  }

  return {
    snapshot,
    safetyMoment,
    alternatePath,
    requirements
  };
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
      id: newGuid(),
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
      id: newGuid(),
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

  const pageTitle = normalizeText($("h1").first().text()) || activity.name;
  const snapshot = extractSnapshotSummary($);
  const activityKey = extractActivityKey($);
  const supplyList = extractSupplyList($);
  const directions = extractDirections($);
  const hasAdditionalResources = extractHasAdditionalResources($);
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

  const previewDetails = previewParts.join("\n\n").trim() || snapshot;
  const materials = supplyList.noSupplies
    ? [NO_SUPPLIES_SENTINEL]
    : supplyList.materials.length
      ? supplyList.materials
      : extractMaterials(previewParts);
  const rawText = cheerio.load(html).text().replace(/\s+/g, " ").trim();
  const inferredMeetingSpace = normalizeMeetingSpace(rawText);
  const noSupplies = /no supplies are required\.?/i.test(rawText);
  return {
    ...activity,
    name: pageTitle,
    slug: slugify(pageTitle),
    summary: snapshot || activity.summary,
    meetingSpace: activityKey.meetingSpace ?? (inferredMeetingSpace === "unknown" ? activity.meetingSpace : inferredMeetingSpace),
    energyLevel:
      activityKey.energyLevel ??
      parseOfficialKeyLevelFromPage($, "Energy Level of Cub Scouts") ??
      parseOfficialKeyLevel(rawText, "Energy Level of Cub Scouts") ??
      activity.energyLevel,
    supplyLevel:
      activityKey.supplyLevel ??
      parseOfficialKeyLevelFromPage($, "Supply List for this Activity") ??
      parseOfficialKeyLevel(rawText, "Supply List for this Activity") ??
      activity.supplyLevel,
    prepLevel:
      activityKey.prepLevel ??
      parseOfficialKeyLevelFromPage($, "Prep Time for this Activity") ??
      parseOfficialKeyLevelFromPage($, "Preparation Time for this Activity") ??
      parseOfficialKeyLevelByLabels(rawText, ["Prep Time for this Activity", "Preparation Time for this Activity"]) ??
      activity.prepLevel,
    materials: noSupplies ? [NO_SUPPLIES_SENTINEL] : materials.length ? materials : activity.materials,
    previewDetails: previewDetails || `${activity.summary}\n\nSee the official activity page for full instructions.`,
    supplyNote: supplyList.supplyNote ?? activity.supplyNote,
    directions: directions ?? activity.directions ?? null,
    hasAdditionalResources
  };
}