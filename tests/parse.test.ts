import { describe, expect, test } from "vitest";
import {
  parseActivityDetailPage,
  parseActivitySourcePage,
  parseAdventurePage,
  parseAdventureMarkdown,
  parseRankIndex,
  parseRankPage
} from "../ingest/parse.js";
import {
  activityPageFixture,
  adventurePageFixture,
  denDoodleActivityPageFixture,
  denFlagActivityPageFixture,
  lionHolidayDrawingActivityPageFixture,
  lionFamilyReverenceActivityPageFixture,
  protectYourselfVideoWebelosActivityPageFixture,
  noisyActivityPageFixture,
  rankIndexFixture,
  rankPageFixture,
  whenDoingMyBestActivityPageFixture
} from "./fixtures.js";
import type { Rank } from "../shared/types.js";
import { NO_SUPPLIES_SENTINEL } from "../shared/utils.js";

const rank: Rank = {
  id: "2f3b4c9a-2a8d-4aa5-bd11-44a84f1d7d6b",
  name: "Lion",
  grade: "Kindergarten",
  slug: "lion",
  sourceUrl: "https://www.scouting.org/programs/cub-scouts/adventures/lion/"
};

const guidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
    expect(adventures[0].id).toMatch(guidPattern);
    expect(adventures[1].id).toMatch(guidPattern);
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
    bundle.requirements.forEach((requirement) => expect(requirement.id).toMatch(guidPattern));
    bundle.activities.forEach((activity) => expect(activity.id).toMatch(guidPattern));
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
      materials: [],
      previewDetails: ""
    });

    expect(enriched.previewDetails).toContain("Gather scouts in a circle");
    expect(enriched.previewDetails).toContain("Use simple prompts");
    expect(enriched.energyLevel).toBe(2);
    expect(enriched.supplyLevel).toBe(2);
    expect(enriched.prepLevel).toBe(1);
  });

  test("extracts the full supply list from mixed paragraph and list content", () => {
    const html = `
      <main id="main">
        <h1>Sample Activity</h1>
        <div class="elementor-widget-wrap elementor-element-populated">
          <div class="elementor-element elementor-widget elementor-widget-heading">
            <div class="elementor-widget-container">
              <h2 class="elementor-heading-title elementor-size-default">Supply List</h2>
            </div>
          </div>
          <div class="elementor-element elementor-widget elementor-widget-text-editor">
            <div class="elementor-widget-container">
              <p>Handbook</p>
              <p>Markers</p>
            </div>
          </div>
          <div class="elementor-element elementor-widget elementor-widget-html">
            <div class="elementor-widget-container">
              <ul>
                <li>Scissors</li>
                <li>Tape</li>
              </ul>
            </div>
          </div>
          <div class="elementor-element elementor-widget elementor-widget-heading">
            <div class="elementor-widget-container">
              <h2 class="elementor-heading-title elementor-size-default">Directions</h2>
            </div>
          </div>
        </div>
      </main>
    `;

    const enriched = parseActivityDetailPage(html, {
      id: "sample",
      adventureId: "lion__bobcat-lion",
      requirementId: "req-2",
      name: "Sample Activity",
      slug: "sample-activity",
      sourceUrl: "https://www.scouting.org/cub-scout-activities/sample-activity/",
      summary: "Summary",
      meetingSpace: "indoor",
      energyLevel: 1,
      supplyLevel: 1,
      prepLevel: 1,
      durationMinutes: 10,
      materials: [],
      previewDetails: ""
    });

    expect(enriched.materials).toEqual(["Handbook", "Markers", "Scissors", "Tape"]);
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
      materials: [],
      previewDetails: ""
    });

    expect(enriched.previewDetails).toContain("The den doodle is a craft project");
    expect(enriched.previewDetails).toContain("Let each scout add one piece");
    expect(enriched.previewDetails).not.toContain("jQuery(window)");
    expect(enriched.previewDetails).not.toContain("elementor/frontend/init");
    expect(enriched.previewDetails).not.toContain("Lion - Kindergarten Den Doodle Lion Indoor");
    expect(enriched.materials).toContain("Crayons of various colors, enough to share");
  });

  test("extracts the structured Den Doodle Lion activity sections", () => {
    const enriched = parseActivityDetailPage(denDoodleActivityPageFixture, {
      id: "sample",
      adventureId: "lion__bobcat-lion",
      requirementId: "req-1",
      name: "Den Doodle Lion",
      slug: "den-doodle-lion",
      sourceUrl: "https://www.scouting.org/cub-scout-activities/den-doodle-lion/",
      summary: "Old summary",
      meetingSpace: "unknown",
      energyLevel: null,
      supplyLevel: null,
      prepLevel: null,
      durationMinutes: 15,
      materials: [],
      previewDetails: ""
    });

    expect(enriched.name).toBe("Den Doodle Lion");
    expect(enriched.summary).toBe(
      "The den doodle is a craft project that can be used to track attendance, reward good behavior, and completion of requirements."
    );
    expect(enriched.meetingSpace).toBe("indoor");
    expect(enriched.energyLevel).toBe(3);
    expect(enriched.supplyLevel).toBe(4);
    expect(enriched.prepLevel).toBe(4);
    expect(enriched.supplyNote).toBe(
      "Den doodles can be made from different materials and there are several different designs. This is one example of a den doodle that can be made. It stands on its own and is four feet tall."
    );
    expect(enriched.materials[0]).toBe("Cub Scouts will need their Lion handbook, page 3");
    expect(enriched.materials).toContain("Add more colors of beads if you want to track or recognize other items such as wearing the uniform, bringing your handbook, good behavior, or helping others");
    expect(enriched.directions?.before?.steps).toHaveLength(10);
    expect(enriched.directions?.before?.steps[0].text).toBe(
      "Sand the edges of each board and the plywood to remove any rough edges."
    );
    expect(enriched.directions?.during?.steps[1].bullets).toEqual([
      "Blue is for attending the den meeting, pack meeting, and other Cub Scout activities",
      "Yellow is for wearing their Cub Scout uniform to the den meeting",
      "White is for when they earn a required Adventure, in addition to their Adventure loop.",
      "Gold is for when they earn an elective Adventure, in addition to their Adventure loop."
    ]);
    expect(enriched.directions?.after?.steps[0].text).toBe(
      "After each meeting look at the den doodle and look for Cub Scouts who may be lagging. Reach out to the adult partner to address any concerns about participation."
    );
    expect(enriched.hasAdditionalResources).toBe(true);
    expect(enriched.previewDetails).not.toContain("Ignored content.");
  });

  test("extracts the top metadata from a standalone activity page", () => {
    const result = parseActivitySourcePage(denDoodleActivityPageFixture, "https://www.scouting.org/cub-scout-activities/den-doodle-lion/");

    expect(result.rank).toMatchObject({
      name: "Lion",
      grade: "Kindergarten",
      slug: "lion"
    });
    expect(result.adventure).toMatchObject({
      name: "Bobcat Lion",
      slug: "bobcat-lion",
      kind: "required",
      category: "Character & Leadership"
    });
    expect(result.requirementNumber).toBe(1);
    expect(result.activity).toMatchObject({
      name: "Den Doodle Lion",
      summary:
        "The den doodle is a craft project that can be used to track attendance, reward good behavior, and completion of requirements.",
      meetingSpace: "indoor",
      energyLevel: 3,
      supplyLevel: 4,
      prepLevel: 4
    });
  });

  test("extracts adventure markdown sections including alternate paths", () => {
    const parsed = parseAdventureMarkdown(`
## Snapshot of adventure
Lions with their adult partners work with and identify geometric shapes.

### Safety Moment
Use the SAFE checklist.

### Family & Reverence Adventure
This Adventure may be earned by completing the requirements below OR by completing a Religious Emblem of the Cub Scouts family's choosing.

## Complete the following requirements

### Requirement 1
Make a Lion using only squares, triangles, and circles.

### Requirement 2
Play a game with your Lion adult partner or den that is based on counting or numbers.
    `);

    expect(parsed.snapshot).toBe("Lions with their adult partners work with and identify geometric shapes.");
    expect(parsed.safetyMoment).toBe("Use the SAFE checklist.");
    expect(parsed.alternatePath).toContain("Family & Reverence Adventure");
    expect(parsed.alternatePath).toContain("Religious Emblem");
    expect(parsed.requirements).toEqual([
      { number: 1, text: "Make a Lion using only squares, triangles, and circles." },
      { number: 2, text: "Play a game with your Lion adult partner or den that is based on counting or numbers." }
    ]);
  });

  test("extracts the exact Den Flag Lion activity sections", () => {
    const enriched = parseActivityDetailPage(denFlagActivityPageFixture, {
      id: "sample",
      adventureId: "lion__bobcat-lion",
      requirementId: "req-1",
      name: "Den Flag Lion",
      slug: "den-flag-lion",
      sourceUrl: "https://www.scouting.org/cub-scout-activities/den-flag-lion/",
      summary: "Old summary",
      meetingSpace: "unknown",
      energyLevel: null,
      supplyLevel: null,
      prepLevel: null,
      durationMinutes: 15,
      materials: [],
      previewDetails: ""
    });

    expect(enriched.summary).toBe(
      "A den flag is a craft that can bring your den together by getting to know everyone’s name and having a symbol that everyone has a part in making."
    );
    expect(enriched.meetingSpace).toBe("indoor");
    expect(enriched.energyLevel).toBe(2);
    expect(enriched.supplyLevel).toBe(4);
    expect(enriched.prepLevel).toBe(4);
    expect(enriched.supplyNote).toBe(
      "Den flags can be made from different materials and there are several different designs. This is one example of a den flag that can be made. It can be used for a den up to 12 Cub Scouts, larger dens will need to adjust the dimensions of the flag. These instructions include a flagpole and stand."
    );
    expect(enriched.materials).toEqual([
      "Cub Scouts will need their Lion handbook, page 3",
      "Pencils, one for each Cub Scout",
      "60” long 1 1/8” diameter wooden staff or dowel",
      "30” long ½” diameter wooden dowel",
      "Concrete mix",
      "Water",
      "Tin foil",
      "2-gallon paint bucket",
      "200 grit sandpaper",
      "2’ x 3’ gold felt (use dark yellow if gold isn’t available) – this is the flag, and it will be displayed vertically",
      "1 ½’ x 1’ black felt",
      "1 Lion badge of rank patch",
      "30” piece of twine or thin rope",
      "1 teacup hook",
      "7” x 7” black felt squares, one for each adult partner",
      "7” x 7” brown felt squares, one for each Cub Scout (If the den leader is not an adult partner of one of the Cub Scouts in the den, add another black felt square)",
      "Thick black Sharpie marker to write on brown felt squares",
      "White chalk, enough to share",
      "Scissors, one for each Cub Scout or enough to share",
      "Fabric glue"
    ]);
    expect(enriched.directions?.before?.steps).toHaveLength(11);
    expect(enriched.directions?.before?.steps[0].text).toBe(
      "Wrap the bottom of the wooden staff with tin foil as high as the paint bucket is tall."
    );
    expect(enriched.directions?.before?.steps[10].text).toBe(
      "Attach the 30” twine or rope to each end of the dowel."
    );
    expect(enriched.directions?.during?.steps).toHaveLength(8);
    expect(enriched.directions?.during?.steps[0].text).toBe(
      "Have Cub Scouts meet each other by signing each other’s handbooks on page 3."
    );
    expect(enriched.directions?.during?.steps[6].text).toBe(
      "Have each Cub Scout and adult partner glue their cut-out hands on the flag one by one. As they glue their cut-out hands onto the flag have them share what their favorite outdoor activity is and what their favorite food is."
    );
    expect(enriched.hasAdditionalResources).toBe(true);
  });

  test("extracts the exact When Am I Doing My Best activity sections", () => {
    const enriched = parseActivityDetailPage(whenDoingMyBestActivityPageFixture, {
      id: "sample",
      adventureId: "lion__bobcat-lion",
      requirementId: "req-3",
      name: "When Am I Doing My Best?",
      slug: "when-am-i-doing-my-best",
      sourceUrl: "https://www.scouting.org/cub-scout-activities/when-am-i-doing-my-best/",
      summary: "Old summary",
      meetingSpace: "unknown",
      energyLevel: null,
      supplyLevel: null,
      prepLevel: null,
      durationMinutes: 10,
      materials: [],
      previewDetails: ""
    });

    expect(enriched.summary).toBe("Activity to help Cub Scouts identify what it means to do their best.");
    expect(enriched.meetingSpace).toBe("indoor");
    expect(enriched.energyLevel).toBe(2);
    expect(enriched.supplyLevel).toBe(2);
    expect(enriched.prepLevel).toBe(2);
    expect(enriched.materials).toEqual(["Cub Scouts will need their Lion handbook, page 5", "Crayons, enough to share"]);
    expect(enriched.directions?.before?.steps).toEqual([
      { text: "Set up the meeting space to allow Cub Scouts to work on the activity.", bullets: [] }
    ]);
    expect(enriched.directions?.during?.steps).toHaveLength(4);
    expect(enriched.hasAdditionalResources).toBe(false);
  });

  test("extracts the exact Lion Holiday Drawing activity sections", () => {
    const enriched = parseActivityDetailPage(lionHolidayDrawingActivityPageFixture, {
      id: "sample",
      adventureId: "lion__lions-pride",
      requirementId: "req-1",
      name: "Lion Holiday Drawing",
      slug: "lion-holiday-drawing",
      sourceUrl: "https://www.scouting.org/cub-scout-activities/lion-holiday-drawing/",
      summary: "Old summary",
      meetingSpace: "unknown",
      energyLevel: null,
      supplyLevel: null,
      prepLevel: null,
      durationMinutes: 10,
      materials: [],
      previewDetails: ""
    });

    expect(enriched.summary).toBe("Draw and color a favorite faith tradition holiday or celebration.");
    expect(enriched.meetingSpace).toBe("indoor");
    expect(enriched.energyLevel).toBe(2);
    expect(enriched.supplyLevel).toBe(2);
    expect(enriched.prepLevel).toBe(1);
    expect(enriched.materials).toEqual([
      "Cub Scouts will need their Lion handbook, page 22",
      "Crayons, enough to share"
    ]);
    expect(enriched.directions?.atHomeOption?.heading).toBe("At Home Option");
    expect(enriched.directions?.atHomeOption?.steps).toEqual([
      {
        text: "Discuss with your Cub Scout your family’s faith traditions that are connected to your religious beliefs.",
        bullets: []
      },
      {
        text: "Together with your Cub Scout draw your favorite religious holiday, religious celebration, or family faith tradition. Some family traditions are things your family may do together during these times that are not directly connected to your religious beliefs. For some, it may be cooking a certain type of food, playing a certain game, or singing certain songs.",
        bullets: []
      }
    ]);
    expect(enriched.directions?.before?.steps).toEqual([
      { text: "Create a space for Cub Scouts to draw and color.", bullets: [] }
    ]);
    expect(enriched.directions?.during?.steps).toHaveLength(4);
    expect(enriched.hasAdditionalResources).toBe(false);
  });

  test("extracts the exact Lion Family Reverence activity sections", () => {
    const enriched = parseActivityDetailPage(lionFamilyReverenceActivityPageFixture, {
      id: "sample",
      adventureId: "lion__lions-pride",
      requirementId: "req-2",
      name: "Lion Family Reverence",
      slug: "lion-family-reverence",
      sourceUrl: "https://www.scouting.org/cub-scout-activities/lion-family-reverence/",
      summary: "Old summary",
      meetingSpace: "unknown",
      energyLevel: null,
      supplyLevel: null,
      prepLevel: null,
      durationMinutes: 10,
      materials: ["should be removed"],
      previewDetails: ""
    });

    expect(enriched.summary).toBe("Attend a Veterans Day event with your den.");
    expect(enriched.meetingSpace).toBe("outing-with-travel");
    expect(enriched.energyLevel).toBe(3);
    expect(enriched.supplyLevel).toBe(1);
    expect(enriched.prepLevel).toBe(5);
    expect(enriched.materials).toEqual([NO_SUPPLIES_SENTINEL]);
    expect(enriched.directions?.before?.steps).toHaveLength(3);
    expect(enriched.directions?.during?.steps).toHaveLength(4);
    expect(enriched.hasAdditionalResources).toBe(false);
  });

  test("extracts the exact Protect Yourself Video Webelos activity sections", () => {
    const enriched = parseActivityDetailPage(protectYourselfVideoWebelosActivityPageFixture, {
      id: "sample",
      adventureId: "webelos__my-safety",
      requirementId: "req-1",
      name: "Protect Yourself Video Webelos",
      slug: "protect-yourself-video-webelos",
      sourceUrl: "https://www.scouting.org/cub-scout-activities/protect-yourself-video-webelos/",
      summary: "Old summary",
      meetingSpace: "unknown",
      energyLevel: null,
      supplyLevel: null,
      prepLevel: null,
      durationMinutes: 10,
      materials: [],
      previewDetails: ""
    });

    expect(enriched.summary).toBe("Watch the Protect Yourself Rules video with your parent or legal guardian.");
    expect(enriched.meetingSpace).toBe("indoor");
    expect(enriched.energyLevel).toBe(1);
    expect(enriched.supplyLevel).toBe(2);
    expect(enriched.prepLevel).toBe(2);
    expect(enriched.materials).toEqual([
      "My Safety 1 Parent Notification found in Additional Resources",
      "Computer or smart device",
      "Internet connection to view the “Webelos Protect Yourself Rules” video (duration 22 minutes)",
      "Or download video onto device if internet is not available where you will be watching."
    ]);
    expect(enriched.directions?.before?.steps).toHaveLength(1);
    expect(enriched.directions?.during?.heading).toBe("During the meeting or at home");
    expect(enriched.directions?.during?.steps).toEqual([
      { text: "Parent or legal guardian watch the ”Protect Yourself Rules” video with their Cub Scout", bullets: [] }
    ]);
    expect(enriched.hasAdditionalResources).toBe(true);
  });

  test("normalizes before camping and go camping headings", () => {
    const html = `
      <main id="main">
        <h1>Let's Camp Webelos</h1>
        <div class="pp-accordion-tab-content">
          <p>Before camping:</p>
          <ol>
            <li>Set up camp.</li>
          </ol>
          <p>Go Camping!</p>
          <ol>
            <li>Practice camping skills.</li>
          </ol>
        </div>
      </main>
    `;

    const enriched = parseActivityDetailPage(html, {
      id: "sample",
      adventureId: "webelos__lets-camp",
      requirementId: "req-1",
      name: "Let's Camp Webelos",
      slug: "lets-camp-webelos",
      sourceUrl: "https://www.scouting.org/cub-scout-activities/lets-camp-webelos/",
      summary: "Old summary",
      meetingSpace: "unknown",
      energyLevel: null,
      supplyLevel: null,
      prepLevel: null,
      durationMinutes: 10,
      materials: [],
      previewDetails: ""
    });

    expect(enriched.directions?.before?.heading).toBe("Before camping");
    expect(enriched.directions?.before?.steps).toEqual([{ text: "Set up camp.", bullets: [] }]);
    expect(enriched.directions?.during?.heading).toBe("Go Camping!");
    expect(enriched.directions?.during?.steps).toEqual([{ text: "Practice camping skills.", bullets: [] }]);
  });
});