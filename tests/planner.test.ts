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
      requirementIds: [],
      durationMinutes: 60,
      scoutCount: 6,
      environment: "indoor",
      notes: "",
      meetingDate: "2026-09-17"
    });

    expect(plan.agenda[0].kind).toBe("opening");
    expect(plan.adventures).toHaveLength(2);
    expect(plan.coverage.every((item) => item.covered)).toBe(true);
    expect(plan.materials).toContain("Basic craft supplies");
    expect(plan.agenda.find((item) => item.kind === "activity")?.alternativeActivityIds.length).toBeGreaterThan(0);
    expect(plan.parentUpdate.subject).toContain(demoContent.denProfiles[0].name);
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
      environment: "indoor",
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
      environment: "outdoor",
      notes: "",
      meetingDate: null
    });

    expect(plan.coverage.some((item) => !item.covered)).toBe(true);
    expect(plan.leaderNotes).toContain("Do not mark uncovered requirements complete");
  });

  test("preserves automatic coverage when swapping to another activity for the same requirement", () => {
    const plan = buildMeetingPlan(demoContent.denProfiles[0], demoContent.rank, [bundles[0]], {
      denId: demoContent.denProfiles[0].id,
      rankId: demoContent.rank.id,
      adventureIds: [bundles[0].adventure.id],
      requirementIds: [],
      durationMinutes: 60,
      scoutCount: 6,
      environment: "indoor",
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

  test("changes coverage to leader review when swapping to a different adventure's activity", () => {
    const plan = buildMeetingPlan(demoContent.denProfiles[0], demoContent.rank, bundles, {
      denId: demoContent.denProfiles[0].id,
      rankId: demoContent.rank.id,
      adventureIds: bundles.map((bundle) => bundle.adventure.id),
      requirementIds: [],
      durationMinutes: 60,
      scoutCount: 6,
      environment: "indoor",
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
      "leader-review"
    );
    expect(swapped.leaderNotes).toContain("leader review");
  });
});