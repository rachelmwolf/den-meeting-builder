import { describe, expect, test } from "vitest";
import { buildOpeningPromptEnvelope } from "../shared/openingPrompt.js";
import type { MeetingPlan } from "../shared/types.js";

function buildPlan(): MeetingPlan {
  return {
    id: "plan-1",
    denId: "den-1",
    denName: "Bear Den",
    rank: {
      id: "rank-bear",
      name: "Bear",
      grade: "3rd Grade",
      slug: "bear",
      sourceUrl: "https://example.com/bear"
    },
    adventures: [
      {
        id: "adv-standing-tall",
        rankId: "rank-bear",
        name: "Standing Tall",
        slug: "standing-tall",
        kind: "required",
        category: "Personal Safety",
        sourceUrl: "https://example.com/standing-tall",
        snapshot: "Some snapshot"
      }
    ],
    request: {
      denId: "den-1",
      rankId: "rank-bear",
      adventureIds: ["adv-standing-tall"],
      requirementIds: ["req-1", "req-2", "req-3", "req-4"],
      durationMinutes: 50,
      scoutCount: 6,
      meetingSpace: "indoor",
      maxEnergyLevel: 3,
      maxSupplyLevel: 3,
      maxPrepLevel: 3,
      notes: "",
      meetingDate: "2026-03-24"
    },
    prepNotes: [],
    materials: [],
    agenda: [
      {
        id: "opening",
        kind: "opening",
        title: "Opening Gathering",
        durationMinutes: 10,
        description: "Opening",
        adventureId: null,
        adventureName: null,
        requirementIds: [],
        requirementNumber: null,
        requirementText: null,
        activityId: null,
        primaryRequirementId: null,
        selectedActivityId: null,
        alternativeActivityIds: [],
        selectionSource: null,
        coverageStatus: null,
        addedFromSelection: false,
        editableNotes: ""
      },
      {
        id: "activity-1",
        kind: "activity",
        title: "Protect Yourself Rules Video Bear",
        durationMinutes: 10,
        description: "Watch the video.",
        adventureId: "adv-standing-tall",
        adventureName: "Standing Tall",
        requirementIds: ["req-1"],
        requirementNumber: 1,
        requirementText: "With permission from your parent or legal guardian, watch the Protect Yourself Rules video for the Bear rank.",
        activityId: "activity-1",
        primaryRequirementId: "req-1",
        selectedActivityId: "activity-1",
        alternativeActivityIds: [],
        selectionSource: "recommended",
        coverageStatus: "automatic",
        addedFromSelection: false,
        editableNotes: ""
      }
    ],
    coverage: [
      {
        adventureId: "adv-standing-tall",
        adventureName: "Standing Tall",
        requirementId: "req-1",
        requirementNumber: 1,
        requirementText: "With permission from your parent or legal guardian, watch the Protect Yourself Rules video for the Bear rank.",
        activityId: "activity-1",
        activityName: "Protect Yourself Rules Video Bear",
        covered: true,
        reason: "Covered with Protect Yourself Rules Video Bear.",
        coverageStatus: "automatic"
      }
    ],
    activityLibrary: [
      {
        id: "activity-1",
        adventureId: "adv-standing-tall",
        requirementId: "req-1",
        name: "Protect Yourself Rules Video Bear",
        slug: "protect-yourself-rules-video-bear",
        sourceUrl: "https://example.com/activity-1",
        summary: "Watch the Protect Yourself Rules video with your parent or legal guardian.",
        meetingSpace: "indoor",
        energyLevel: 1,
        supplyLevel: 1,
        prepLevel: 1,
        durationMinutes: 10,
        materials: ["A screen"],
        previewDetails: "",
        directions: null,
        hasAdditionalResources: false
      }
    ],
    leaderNotes: "",
    timeBudget: {
      targetMinutes: 50,
      plannedMinutes: 20,
      minimumSuggestedMinutes: 15,
      recommendedMinutes: 20,
      activityCount: 1,
      status: "fits",
      warnings: []
    },
    generatedAt: "2026-03-24T00:00:00.000Z",
    printSections: ["Opening and gathering"],
    parentUpdate: {
      subject: "Bear Den",
      message: "Meeting update"
    }
  };
}

describe("opening prompt envelope", () => {
  test("uses the compact JSON string variable shape", () => {
    const envelope = buildOpeningPromptEnvelope(buildPlan());

    expect(envelope).toEqual({
      prompt: {
        id: "pmpt_69c2106d04d48190804cd755b7dd99720e46c40532149d57",
        version: "6",
        variables: {
          rank: "Bear",
          grade: "3rd Grade",
          adventures: "Standing Tall",
          requirements: "1. With permission from your parent or legal guardian, watch the Protect Yourself Rules video for the Bear rank.",
          activities: "Protect Yourself Rules Video Bear: Watch the Protect Yourself Rules video with your parent or legal guardian."
        }
      }
    });
  });

  test("uses the current agenda, not coverage, for activity and requirement variables", () => {
    const plan = buildPlan();
    plan.coverage = [
      {
        adventureId: "adv-standing-tall",
        adventureName: "Standing Tall",
        requirementId: "req-stale",
        requirementNumber: 99,
        requirementText: "Stale requirement text",
        activityId: null,
        activityName: null,
        covered: false,
        coverageStatus: "uncovered",
        reason: "Stale coverage"
      }
    ];
    plan.agenda.push({
      id: "activity-2",
      kind: "activity",
      title: "New Scout Game",
      durationMinutes: 10,
      description: "Play a new game.",
      adventureId: "adv-standing-tall",
      adventureName: "Standing Tall",
      requirementIds: ["req-2"],
      requirementNumber: 2,
      requirementText: "Fresh requirement text",
      activityId: "activity-2",
      primaryRequirementId: "req-2",
      selectedActivityId: "activity-2",
      alternativeActivityIds: [],
      selectionSource: "added",
      coverageStatus: "automatic",
      addedFromSelection: true,
      editableNotes: ""
    });
    plan.activityLibrary = [
      ...plan.activityLibrary,
      {
        id: "activity-2",
        adventureId: "adv-standing-tall",
        requirementId: "req-2",
        name: "New Scout Game",
        slug: "new-scout-game",
        sourceUrl: "https://example.com/activity-2",
        summary: "Play a new game with the den.",
        meetingSpace: "indoor",
        energyLevel: 2,
        supplyLevel: 1,
        prepLevel: 1,
        durationMinutes: 10,
        materials: [],
        previewDetails: "",
        directions: null,
        hasAdditionalResources: false
      }
    ];
    const envelope = buildOpeningPromptEnvelope(plan);

    expect(envelope.prompt.variables.requirements).not.toContain("Stale requirement text");
    expect(envelope.prompt.variables.requirements).toContain("Fresh requirement text");
    expect(envelope.prompt.variables.activities).toContain("New Scout Game: Play a new game with the den.");
  });
});