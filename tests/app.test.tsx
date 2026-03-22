import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { App } from "../src/App.js";
import { demoContent } from "../shared/demo.js";
import type {
  AdventureTrailData,
  MeetingPlan,
  SavedMeetingPlan,
  YearPlan
} from "../shared/types.js";

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

function buildTrailData(): AdventureTrailData {
  return {
    buckets: [
      {
        key: "character-leadership",
        label: "Character & Leadership",
        required: true,
        adventures: [demoContent.adventures[0]]
      },
      {
        key: "personal-fitness",
        label: "Personal Fitness",
        required: true,
        adventures: [demoContent.adventures[1]]
      },
      {
        key: "electives",
        label: "Electives",
        required: false,
        adventures: [demoContent.adventures[2]]
      }
    ],
    progress: {
      buckets: [
        { key: "character-leadership", label: "Character & Leadership", required: true, targetCount: 1, completedCount: 1, completedAdventureIds: [demoContent.adventures[0].id] },
        { key: "outdoors", label: "Outdoors", required: true, targetCount: 1, completedCount: 0, completedAdventureIds: [] },
        { key: "personal-fitness", label: "Personal Fitness", required: true, targetCount: 1, completedCount: 0, completedAdventureIds: [] },
        { key: "citizenship", label: "Citizenship", required: true, targetCount: 1, completedCount: 0, completedAdventureIds: [] },
        { key: "personal-safety", label: "Personal Safety", required: true, targetCount: 1, completedCount: 0, completedAdventureIds: [] },
        { key: "family-reverence", label: "Family & Reverence", required: true, targetCount: 1, completedCount: 0, completedAdventureIds: [] },
        { key: "electives", label: "Electives", required: false, targetCount: 2, completedCount: 1, completedAdventureIds: [demoContent.adventures[2].id] }
      ],
      electiveTargetCount: 2,
      electiveCompletedCount: 1
    }
  };
}

function buildGeneratedPlan(): MeetingPlan {
  return {
    id: "plan-1",
    denId: demoContent.denProfiles[0].id,
    denName: demoContent.denProfiles[0].name,
    rank: demoContent.rank,
    adventures: [demoContent.adventures[0], demoContent.adventures[1]],
    request: {
      denId: demoContent.denProfiles[0].id,
      rankId: demoContent.rank.id,
      adventureIds: [demoContent.adventures[0].id, demoContent.adventures[1].id],
      requirementIds: [demoContent.requirements[0].id, demoContent.requirements[3].id],
      durationMinutes: 60,
      scoutCount: 6,
      environment: "indoor",
      notes: "",
      meetingDate: "2026-09-17"
    },
    prepNotes: ["Review the official adventure page."],
    materials: ["Basic craft supplies"],
    agenda: [
      {
        id: "agenda-1",
        kind: "activity",
        title: "Den Doodle Lion",
        durationMinutes: 15,
        description: "The den doodle is a craft project.",
        adventureId: demoContent.adventures[0].id,
        adventureName: demoContent.adventures[0].name,
        requirementIds: [demoContent.requirements[0].id],
        activityId: demoContent.activities[0].id,
        primaryRequirementId: demoContent.requirements[0].id,
        selectedActivityId: demoContent.activities[0].id,
        alternativeActivityIds: demoContent.activities.slice(1).map((activity) => activity.id),
        selectionSource: "recommended",
        coverageStatus: "automatic",
        editableNotes: "Use the official activity card."
      }
    ],
    coverage: [
      {
        adventureId: demoContent.adventures[0].id,
        adventureName: demoContent.adventures[0].name,
        requirementId: demoContent.requirements[0].id,
        requirementNumber: 1,
        requirementText: demoContent.requirements[0].text,
        activityId: demoContent.activities[0].id,
        activityName: demoContent.activities[0].name,
        covered: true,
        coverageStatus: "automatic",
        reason: "Covered with Den Doodle Lion."
      }
    ],
    activityLibrary: demoContent.activities,
    leaderNotes: "Leader guidance",
    generatedAt: new Date().toISOString(),
    printSections: ["Opening and gathering", "Main activity flow"],
    parentUpdate: {
      subject: `${demoContent.denProfiles[0].name}: ${demoContent.adventures[0].name} + ${demoContent.adventures[1].name} meeting update`,
      message: "Tonight we will be working on Bobcat Lion and Fun on the Run."
    }
  };
}

function buildYearPlan(savedPlans: SavedMeetingPlan[] = []): YearPlan {
  return {
    den: demoContent.denProfiles[0],
    trailProgress: buildTrailData().progress,
    months: savedPlans.length
      ? [
          {
            monthKey: "2026-09",
            monthLabel: "September 2026",
            theme: "Kickoff and den culture",
            items: savedPlans
          }
        ]
      : []
  };
}

describe("App", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    fetchMock.mockReset();

    const generatedPlan = buildGeneratedPlan();
    const swappedPlan: MeetingPlan = {
      ...generatedPlan,
      id: "plan-1b",
      agenda: [
        {
          ...generatedPlan.agenda[0],
          title: "Animal Warmups",
          adventureId: demoContent.adventures[1].id,
          adventureName: demoContent.adventures[1].name,
          activityId: demoContent.activities.find((activity) => activity.name === "Animal Warmups")!.id,
          selectedActivityId: demoContent.activities.find((activity) => activity.name === "Animal Warmups")!.id,
          selectionSource: "swapped",
          coverageStatus: "leader-review",
          description: "Scouts move like animals while learning simple warm-up motions."
        }
      ],
      coverage: [
        {
          adventureId: demoContent.adventures[0].id,
          adventureName: demoContent.adventures[0].name,
          requirementId: demoContent.requirements[0].id,
          requirementNumber: 1,
          requirementText: demoContent.requirements[0].text,
          activityId: demoContent.activities.find((activity) => activity.name === "Animal Warmups")!.id,
          activityName: "Animal Warmups",
          covered: true,
          coverageStatus: "leader-review",
          reason: "Uses Animal Warmups. Review the requirement before marking it complete because this activity was suggested for a different requirement or adventure."
        }
      ],
      leaderNotes:
        "One or more swapped activities support the meeting but need leader review before you mark the requirement complete."
    };

    fetchMock.mockImplementation((input: string | URL, _init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/api/workspace")) {
        return Promise.resolve(new Response(JSON.stringify(demoContent.workspace)));
      }
      if (url.endsWith("/api/content-status")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              datasetMode: "mixed",
              importedRanks: [
                {
                  rankId: demoContent.rank.id,
                  rankName: demoContent.rank.name,
                  refreshedAt: "2026-03-22T10:00:00.000Z"
                }
              ],
              lastRefreshedAt: "2026-03-22T10:00:00.000Z"
            })
          )
        );
      }
      if (url.endsWith("/api/dens")) {
        return Promise.resolve(new Response(JSON.stringify(demoContent.denProfiles)));
      }
      if (url.includes(`/api/dens/${demoContent.denProfiles[0].id}/adventure-trail`)) {
        return Promise.resolve(new Response(JSON.stringify(buildTrailData())));
      }
      if (url.includes(`/api/dens/${demoContent.denProfiles[0].id}/requirements`)) {
        const params = new URL(url, "http://localhost").searchParams;
        const ids = params.get("adventureIds")?.split(",") ?? [];
        return Promise.resolve(
          new Response(
            JSON.stringify(demoContent.requirements.filter((requirement) => ids.includes(requirement.adventureId)))
          )
        );
      }
      if (url.includes(`/api/dens/${demoContent.denProfiles[0].id}/year-plan`)) {
        return Promise.resolve(new Response(JSON.stringify(buildYearPlan())));
      }
      if (url.endsWith("/api/plans/generate")) {
        return Promise.resolve(new Response(JSON.stringify(generatedPlan)));
      }
      if (url.endsWith("/api/plans/swap")) {
        return Promise.resolve(new Response(JSON.stringify(swappedPlan)));
      }
      if (url.endsWith("/api/plans/save")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              id: generatedPlan.id,
              denId: generatedPlan.denId,
              rankId: generatedPlan.rank.id,
              adventureId: generatedPlan.adventures[0].id,
              title: `${generatedPlan.denName} - ${generatedPlan.adventures.map((adventure) => adventure.name).join(" + ")}`,
              plannedDate: generatedPlan.request.meetingDate,
              monthKey: "2026-09",
              monthLabel: "September 2026",
              theme: "Kickoff and den culture",
              payload: generatedPlan,
              recap: null,
              createdAt: new Date().toISOString()
            } satisfies SavedMeetingPlan)
          )
        );
      }
      if (url.endsWith("/api/plans/recap")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              meetingPlanId: generatedPlan.id,
              completedRequirementIds: [demoContent.requirements[0].id],
              recapNotes: "Scouts stayed engaged.",
              familyFollowUp: "Wear class A next week.",
              reuseNotes: "Open with a faster gathering game next time.",
              recordedAt: new Date().toISOString()
            })
          )
        );
      }
      if (url.includes("/duplicate")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              id: "saved-copy",
              denId: generatedPlan.denId,
              rankId: generatedPlan.rank.id,
              adventureId: generatedPlan.adventures[0].id,
              title: `${generatedPlan.denName} - ${generatedPlan.adventures.map((adventure) => adventure.name).join(" + ")}`,
              plannedDate: generatedPlan.request.meetingDate,
              monthKey: "2026-09",
              monthLabel: "September 2026",
              theme: "Kickoff and den culture",
              payload: generatedPlan,
              recap: null,
              createdAt: new Date().toISOString()
            } satisfies SavedMeetingPlan)
          )
        );
      }
      return Promise.resolve(new Response(JSON.stringify({})));
    });
  });

  test("renders the wizard and trail progress", async () => {
    render(<App />);

    expect(await screen.findByText(/Guide the setup\. Focus the packet\./i)).toBeInTheDocument();
    expect(await screen.findByText("Step 1 · Den and Meeting Basics")).toBeInTheDocument();
    expect(await screen.findByText("Adventure Trail Progress")).toBeInTheDocument();
  });

  test("walks through the wizard, generates a packet, and swaps an activity", async () => {
    render(<App />);

    fireEvent.click(await screen.findByText("Continue to Adventure Trail"));
    fireEvent.click(await screen.findByLabelText(/Bobcat Lion/i));
    fireEvent.click(await screen.findByLabelText(/Fun on the Run/i));
    fireEvent.click(await screen.findByText("Refine Requirements"));
    fireEvent.click(await screen.findByText("Continue to Leader Packet"));
    fireEvent.click(await screen.findByText("Generate Leader Packet"));

    expect(await screen.findByText("Leader Packet")).toBeInTheDocument();
    expect((await screen.findAllByText(/Bobcat Lion, Fun on the Run/i)).length).toBeGreaterThan(0);

    fireEvent.click(await screen.findByText("Preview and Swap Activity"));
    expect(await screen.findByText("Activity Options")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Animal Warmups"));
    expect(await screen.findByText(/requirement completion will move to leader review/i)).toBeInTheDocument();
    fireEvent.click(screen.getByText("Use This Activity"));

    expect(await screen.findByText("Leader review")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/api/plans/swap", expect.objectContaining({ method: "POST" }));
  });

  test("saves recap data and folds follow-up into the parent update", async () => {
    render(<App />);

    fireEvent.click(await screen.findByText("Continue to Adventure Trail"));
    fireEvent.click(await screen.findByLabelText(/Bobcat Lion/i));
    fireEvent.click(await screen.findByText("Refine Requirements"));
    fireEvent.click(await screen.findByText("Continue to Leader Packet"));
    fireEvent.click(await screen.findByText("Generate Leader Packet"));
    fireEvent.click(await screen.findByLabelText(/Bobcat Lion requirement 1 completed/i));
    fireEvent.change(screen.getByLabelText("Family Follow-up"), { target: { value: "Wear class A next week." } });
    fireEvent.click(screen.getByText("Save Meeting Recap"));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith("/api/plans/recap", expect.objectContaining({ method: "POST" }))
    );
    expect(await screen.findByDisplayValue(/Family follow-up: Wear class A next week\./i)).toBeInTheDocument();
  });
});