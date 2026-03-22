import { describe, expect, test } from "vitest";
import { buildMeetingPlan, swapMeetingActivity } from "../planner/buildMeetingPlan.js";
import { demoContent } from "../shared/demo.js";

describe("buildMeetingPlan", () => {
  test("creates a usable agenda and coverage for a normal meeting", () => {
    const plan = buildMeetingPlan(
      demoContent.denProfiles[0],
      demoContent.rank,
      {
        adventure: demoContent.adventure,
        requirements: demoContent.requirements,
        activities: demoContent.activities
      },
      {
        denId: demoContent.denProfiles[0].id,
        rankId: demoContent.rank.id,
        adventureId: demoContent.adventure.id,
        durationMinutes: 60,
        scoutCount: 6,
        environment: "indoor",
        notes: "",
        meetingDate: "2026-09-17"
      }
    );

    expect(plan.agenda[0].kind).toBe("opening");
    expect(plan.coverage.every((item) => item.covered)).toBe(true);
    expect(plan.materials).toContain("Basic craft supplies");
    expect(plan.agenda.find((item) => item.kind === "activity")?.alternativeActivityIds.length).toBeGreaterThan(0);
    expect(plan.denName).toBe(demoContent.denProfiles[0].name);
    expect(plan.parentUpdate.subject).toContain(demoContent.denProfiles[0].name);
  });

  test("keeps core structure for a short meeting", () => {
    const plan = buildMeetingPlan(
      demoContent.denProfiles[0],
      demoContent.rank,
      {
        adventure: demoContent.adventure,
        requirements: demoContent.requirements,
        activities: demoContent.activities
      },
      {
        denId: demoContent.denProfiles[0].id,
        rankId: demoContent.rank.id,
        adventureId: demoContent.adventure.id,
        durationMinutes: 35,
        scoutCount: 4,
        environment: "indoor",
        notes: "Short weeknight meeting",
        meetingDate: null
      }
    );

    expect(plan.agenda.some((item) => item.kind === "opening")).toBe(true);
    expect(plan.agenda.some((item) => item.kind === "closing")).toBe(true);
    expect(plan.prepNotes.at(-1)).toContain("Short weeknight meeting");
  });

  test("flags uncovered requirements when no official activity exists", () => {
    const plan = buildMeetingPlan(
      demoContent.denProfiles[0],
      demoContent.rank,
      {
        adventure: demoContent.adventure,
        requirements: demoContent.requirements,
        activities: demoContent.activities.slice(0, 1)
      },
      {
        denId: demoContent.denProfiles[0].id,
        rankId: demoContent.rank.id,
        adventureId: demoContent.adventure.id,
        durationMinutes: 45,
        scoutCount: 5,
        environment: "outdoor",
        notes: "",
        meetingDate: null
      }
    );

    expect(plan.coverage.some((item) => !item.covered)).toBe(true);
    expect(plan.leaderNotes).toContain("Do not mark uncovered requirements complete");
  });

  test("preserves automatic coverage when swapping to another activity for the same requirement", () => {
    const plan = buildMeetingPlan(
      demoContent.denProfiles[0],
      demoContent.rank,
      {
        adventure: demoContent.adventure,
        requirements: demoContent.requirements,
        activities: demoContent.activities
      },
      {
        denId: demoContent.denProfiles[0].id,
        rankId: demoContent.rank.id,
        adventureId: demoContent.adventure.id,
        durationMinutes: 60,
        scoutCount: 6,
        environment: "indoor",
        notes: "",
        meetingDate: null
      }
    );

    const agendaItem = plan.agenda.find((item) => item.primaryRequirementId === demoContent.requirements[0].id)!;
    const swapped = swapMeetingActivity(
      demoContent.denProfiles[0],
      demoContent.rank,
      {
        adventure: demoContent.adventure,
        requirements: demoContent.requirements,
        activities: demoContent.activities
      },
      plan,
      agendaItem.id,
      demoContent.activities.find((activity) => activity.name === "Den Flag Lion")!.id
    );

    expect(swapped.coverage.find((item) => item.requirementId === demoContent.requirements[0].id)?.coverageStatus).toBe(
      "automatic"
    );
  });

  test("changes coverage to leader review when swapping to a different requirement's activity", () => {
    const plan = buildMeetingPlan(
      demoContent.denProfiles[0],
      demoContent.rank,
      {
        adventure: demoContent.adventure,
        requirements: demoContent.requirements,
        activities: demoContent.activities
      },
      {
        denId: demoContent.denProfiles[0].id,
        rankId: demoContent.rank.id,
        adventureId: demoContent.adventure.id,
        durationMinutes: 60,
        scoutCount: 6,
        environment: "indoor",
        notes: "",
        meetingDate: null
      }
    );

    const agendaItem = plan.agenda.find((item) => item.primaryRequirementId === demoContent.requirements[0].id)!;
    const swapped = swapMeetingActivity(
      demoContent.denProfiles[0],
      demoContent.rank,
      {
        adventure: demoContent.adventure,
        requirements: demoContent.requirements,
        activities: demoContent.activities
      },
      plan,
      agendaItem.id,
      demoContent.activities.find((activity) => activity.name === "The Compliment Game")!.id
    );

    expect(swapped.coverage.find((item) => item.requirementId === demoContent.requirements[0].id)?.coverageStatus).toBe(
      "leader-review"
    );
    expect(swapped.leaderNotes).toContain("leader review");
  });
});