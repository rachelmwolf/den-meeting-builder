import { describe, expect, test } from "vitest";
import { buildMeetingPlan, swapMeetingActivity } from "../planner/buildMeetingPlan.js";
import { demoContent } from "../shared/demo.js";

const bundles = demoContent.adventures.slice(0, 2).map((adventure) => ({
  adventure,
  requirements: demoContent.requirements.filter((requirement) => requirement.adventureId === adventure.id),
  activities: demoContent.activities.filter((activity) => activity.adventureId === adventure.id)
}));

describe("buildMeetingPlan", () => {
  test("creates a usable agenda and coverage for a multi-adventure meeting", () => {
    const plan = buildMeetingPlan(demoContent.denProfiles[0], demoContent.rank, bundles, {
      denId: demoContent.denProfiles[0].id,
      rankId: demoContent.rank.id,
      adventureIds: bundles.map((bundle) => bundle.adventure.id),
      requirementIds: [bundles[0].requirements[0].id],
      durationMinutes: 60,
      scoutCount: 6,
      meetingSpace: "indoor",
      maxEnergyLevel: 3,
      maxSupplyLevel: 3,
      maxPrepLevel: 3,
      notes: "",
      meetingDate: "2026-09-17"
    });

    expect(plan.agenda[0].kind).toBe("opening");
    expect(plan.adventures).toHaveLength(2);
    expect(plan.agenda.some((item) => item.kind === "transition")).toBe(false);
    expect(plan.agenda.some((item) => item.kind === "reflection")).toBe(false);
    expect(plan.coverage.every((item) => item.covered)).toBe(true);
    expect(plan.materials).toContain("Basic craft supplies");
    expect(plan.agenda.find((item) => item.kind === "activity")?.alternativeActivityIds.length).toBeGreaterThan(0);
    expect(plan.parentUpdate.subject).toContain(demoContent.denProfiles[0].name);
    expect(plan.timeBudget.status).toBe("tight");
  });

  test("supports narrowing to an explicit set of requirements", () => {
    const selectedRequirementId = demoContent.requirements[0].id;
    const plan = buildMeetingPlan(demoContent.denProfiles[0], demoContent.rank, bundles, {
      denId: demoContent.denProfiles[0].id,
      rankId: demoContent.rank.id,
      adventureIds: bundles.map((bundle) => bundle.adventure.id),
      requirementIds: [selectedRequirementId],
      durationMinutes: 45,
      scoutCount: 5,
      meetingSpace: "indoor",
      maxEnergyLevel: 3,
      maxSupplyLevel: 3,
      maxPrepLevel: 3,
      notes: "",
      meetingDate: null
    });

    expect(plan.coverage).toHaveLength(1);
    expect(plan.coverage[0].requirementId).toBe(selectedRequirementId);
  });

  test("flags uncovered requirements when no official activity exists", () => {
    const limitedBundles = [
      {
        ...bundles[0],
        activities: bundles[0].activities.slice(0, 1)
      }
    ];
    const plan = buildMeetingPlan(demoContent.denProfiles[0], demoContent.rank, limitedBundles, {
      denId: demoContent.denProfiles[0].id,
      rankId: demoContent.rank.id,
      adventureIds: [limitedBundles[0].adventure.id],
      requirementIds: [],
      durationMinutes: 45,
      scoutCount: 5,
      meetingSpace: "outdoor",
      maxEnergyLevel: 3,
      maxSupplyLevel: 3,
      maxPrepLevel: 3,
      notes: "",
      meetingDate: null
    });

    expect(plan.coverage.some((item) => !item.covered)).toBe(true);
    expect(plan.leaderNotes).toContain("Do not mark uncovered requirements complete");
    expect(plan.timeBudget.warnings.length).toBeGreaterThan(0);
  });

  test("preserves automatic coverage when swapping to another activity for the same requirement", () => {
    const plan = buildMeetingPlan(demoContent.denProfiles[0], demoContent.rank, [bundles[0]], {
      denId: demoContent.denProfiles[0].id,
      rankId: demoContent.rank.id,
      adventureIds: [bundles[0].adventure.id],
      requirementIds: [],
      durationMinutes: 60,
      scoutCount: 6,
      meetingSpace: "indoor",
      maxEnergyLevel: 3,
      maxSupplyLevel: 3,
      maxPrepLevel: 3,
      notes: "",
      meetingDate: null
    });

    const agendaItem = plan.agenda.find((item) => item.primaryRequirementId === bundles[0].requirements[0].id)!;
    const swapped = swapMeetingActivity(
      demoContent.denProfiles[0],
      demoContent.rank,
      [bundles[0]],
      plan,
      agendaItem.id,
      bundles[0].activities.find((activity) => activity.name === "Den Flag Lion")!.id
    );

    expect(swapped.coverage.find((item) => item.requirementId === bundles[0].requirements[0].id)?.coverageStatus).toBe(
      "automatic"
    );
  });

  test("adds a new requirement block when selecting an activity from a different requirement", () => {
    const plan = buildMeetingPlan(demoContent.denProfiles[0], demoContent.rank, bundles, {
      denId: demoContent.denProfiles[0].id,
      rankId: demoContent.rank.id,
      adventureIds: bundles.map((bundle) => bundle.adventure.id),
      requirementIds: [bundles[0].requirements[0].id],
      durationMinutes: 60,
      scoutCount: 6,
      meetingSpace: "indoor",
      maxEnergyLevel: 3,
      maxSupplyLevel: 3,
      maxPrepLevel: 3,
      notes: "",
      meetingDate: null
    });

    const agendaItem = plan.agenda.find((item) => item.primaryRequirementId === bundles[0].requirements[0].id)!;
    const swapped = swapMeetingActivity(
      demoContent.denProfiles[0],
      demoContent.rank,
      bundles,
      plan,
      agendaItem.id,
      bundles[1].activities.find((activity) => activity.name === "Animal Warmups")!.id
    );

    expect(swapped.coverage.find((item) => item.requirementId === bundles[0].requirements[0].id)?.coverageStatus).toBe(
      "automatic"
    );
    expect(swapped.coverage.find((item) => item.requirementId === bundles[1].requirements[0].id)?.coverageStatus).toBe(
      "automatic"
    );
    expect(
      swapped.agenda.some(
        (item) =>
          item.kind === "activity" &&
          item.primaryRequirementId === bundles[1].requirements[0].id &&
          item.selectionSource === "added"
      )
    ).toBe(true);
  });

  test("prefers activities that fit the meeting space and official key limits", () => {
    const plan = buildMeetingPlan(demoContent.denProfiles[0], demoContent.rank, [bundles[1]], {
      denId: demoContent.denProfiles[0].id,
      rankId: demoContent.rank.id,
      adventureIds: [bundles[1].adventure.id],
      requirementIds: [bundles[1].requirements[1].id],
      durationMinutes: 50,
      scoutCount: 6,
      meetingSpace: "indoor",
      maxEnergyLevel: 3,
      maxSupplyLevel: 3,
      maxPrepLevel: 2,
      notes: "",
      meetingDate: null
    });

    expect(plan.coverage[0]?.activityName).toBe("Balance Trail");
    expect(plan.agenda.find((item) => item.kind === "activity")?.description).toContain("Chosen because it");
  });

  test("changes the selected activity when the soft caps change", () => {
    const looseCapsPlan = buildMeetingPlan(demoContent.denProfiles[0], demoContent.rank, [bundles[0]], {
      denId: demoContent.denProfiles[0].id,
      rankId: demoContent.rank.id,
      adventureIds: [bundles[0].adventure.id],
      requirementIds: [bundles[0].requirements[0].id],
      durationMinutes: 50,
      scoutCount: 6,
      meetingSpace: "indoor",
      maxEnergyLevel: 3,
      maxSupplyLevel: 4,
      maxPrepLevel: 3,
      notes: "",
      meetingDate: null
    });
    const tighterCapsPlan = buildMeetingPlan(demoContent.denProfiles[0], demoContent.rank, [bundles[0]], {
      denId: demoContent.denProfiles[0].id,
      rankId: demoContent.rank.id,
      adventureIds: [bundles[0].adventure.id],
      requirementIds: [bundles[0].requirements[0].id],
      durationMinutes: 50,
      scoutCount: 6,
      meetingSpace: "indoor",
      maxEnergyLevel: 3,
      maxSupplyLevel: 3,
      maxPrepLevel: 3,
      notes: "",
      meetingDate: null
    });

    expect(looseCapsPlan.coverage[0]?.activityName).toBe("Den Doodle Lion");
    expect(tighterCapsPlan.coverage[0]?.activityName).toBe("Den Flag Lion");
  });

  test("flags over-budget plans when the selected scope exceeds the meeting length", () => {
    const plan = buildMeetingPlan(demoContent.denProfiles[0], demoContent.rank, bundles, {
      denId: demoContent.denProfiles[0].id,
      rankId: demoContent.rank.id,
      adventureIds: bundles.map((bundle) => bundle.adventure.id),
      requirementIds: demoContent.requirements.slice(0, 5).map((requirement) => requirement.id),
      durationMinutes: 30,
      scoutCount: 6,
      meetingSpace: "indoor",
      maxEnergyLevel: 3,
      maxSupplyLevel: 3,
      maxPrepLevel: 3,
      notes: "",
      meetingDate: null
    });

    expect(plan.timeBudget.status).toBe("over");
    expect(plan.timeBudget.warnings[0]).toContain("over your 30-minute meeting");
  });
});