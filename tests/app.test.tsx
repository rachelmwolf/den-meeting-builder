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
      durationMinutes: 50,
      scoutCount: 6,
      meetingSpace: "indoor",
      maxEnergyLevel: 3,
      maxSupplyLevel: 3,
      maxPrepLevel: 3,
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
        description: "The den doodle is a craft project. Chosen because it matched indoor, energy 2/3 stays within your preference, supplies 4/3 is above your preferred limit, prep 2/3 stays within your preference.",
        adventureId: demoContent.adventures[0].id,
        adventureName: demoContent.adventures[0].name,
        requirementIds: [demoContent.requirements[0].id],
        requirementNumber: 1,
        requirementText: demoContent.requirements[0].text,
        activityId: demoContent.activities[0].id,
        primaryRequirementId: demoContent.requirements[0].id,
        selectedActivityId: demoContent.activities[0].id,
        alternativeActivityIds: demoContent.activities.slice(1).map((activity) => activity.id),
        selectionSource: "recommended",
        coverageStatus: "automatic",
        addedFromSelection: false,
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
    timeBudget: {
      targetMinutes: 50,
      plannedMinutes: 50,
      minimumSuggestedMinutes: 35,
      recommendedMinutes: 40,
      activityCount: 1,
      status: "fits",
      warnings: []
    },
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
        generatedPlan.agenda[0],
        {
          id: "agenda-2",
          kind: "activity",
          title: "Animal Warmups",
          durationMinutes: 15,
          description: "Scouts move like animals while learning simple warm-up motions. Chosen because it works in either indoor or outdoor space, energy 3/3 stays within your preference, supplies 1/3 stays within your preference, prep 1/3 stays within your preference.",
          adventureId: demoContent.adventures[1].id,
          adventureName: demoContent.adventures[1].name,
          requirementIds: [demoContent.requirements[4].id],
          requirementNumber: 1,
          requirementText: demoContent.requirements[4].text,
          activityId: demoContent.activities.find((activity) => activity.name === "Animal Warmups")!.id,
          primaryRequirementId: demoContent.requirements[4].id,
          selectedActivityId: demoContent.activities.find((activity) => activity.name === "Animal Warmups")!.id,
          alternativeActivityIds: demoContent.activities
            .filter((activity) => activity.id !== demoContent.activities.find((candidate) => candidate.name === "Animal Warmups")!.id)
            .map((activity) => activity.id),
          selectionSource: "added",
          coverageStatus: "automatic",
          addedFromSelection: true,
          editableNotes: "Scouts move like animals while learning simple warm-up motions."
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
        },
        {
          adventureId: demoContent.adventures[1].id,
          adventureName: demoContent.adventures[1].name,
          requirementId: demoContent.requirements[4].id,
          requirementNumber: 1,
          requirementText: demoContent.requirements[4].text,
          activityId: demoContent.activities.find((activity) => activity.name === "Animal Warmups")!.id,
          activityName: "Animal Warmups",
          covered: true,
          coverageStatus: "automatic",
          reason: "Covered with Animal Warmups."
        }
      ],
      leaderNotes:
        "This plan covers each selected requirement with an official linked activity. Confirm completion based on actual meeting delivery.",
      timeBudget: {
        targetMinutes: 50,
        plannedMinutes: 65,
        minimumSuggestedMinutes: 45,
        recommendedMinutes: 55,
        activityCount: 2,
        status: "over",
        warnings: ["This packet is scheduled for 65 minutes, which is 15 minutes over your 50-minute meeting."]
      }
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

    expect(await screen.findByText("Den Leader Planning Workspace")).toBeInTheDocument();
    expect(await screen.findByText("Step 1 · Den and Meeting Basics")).toBeInTheDocument();
    expect(await screen.findByText("Adventure Trail Progress")).toBeInTheDocument();
    expect(await screen.findByDisplayValue("50")).toBeInTheDocument();
    expect(await screen.findByLabelText("Meeting Space")).toHaveValue("indoor");
    expect((await screen.findAllByText(/Maximum allowed: 3\/5/i)).length).toBeGreaterThan(0);
  });

  test("walks through the wizard, reviews a packet first, and then swaps an activity", async () => {
    render(<App />);

    fireEvent.click(await screen.findByText("Continue to Adventure Trail"));
    fireEvent.click(await screen.findByLabelText(/Bobcat Lion/i));
    fireEvent.click(await screen.findByLabelText(/Fun on the Run/i));
    fireEvent.click(await screen.findByText("Refine Requirements"));
    fireEvent.click(await screen.findByText("Generate Leader Packet"));

    expect(await screen.findByText("Step 4 · Leader Packet")).toBeInTheDocument();
    expect((await screen.findAllByText(/Bobcat Lion, Fun on the Run/i)).length).toBeGreaterThan(0);
    expect(await screen.findByText("Customize this plan")).toBeInTheDocument();
    expect(screen.queryByText("Preview and Swap Activity")).not.toBeInTheDocument();
    expect(await screen.findByText(/Planned minutes: 50 \/ 50/i)).toBeInTheDocument();

    fireEvent.click(screen.getByText("Customize this plan"));

    fireEvent.click(await screen.findByText("Preview and Swap Activity"));
    expect(await screen.findByText("Activity Options")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Animal Warmups"));
    expect(
      await screen.findByText(/Using it will add that requirement as its own agenda block/i)
    ).toBeInTheDocument();
    expect((await screen.findAllByText(/Energy 3\/5/i)).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByText("Use This Activity"));

    expect(await screen.findByText("Leader-added requirement")).toBeInTheDocument();
    expect((await screen.findAllByText("Animal Warmups")).length).toBeGreaterThan(0);
    expect(fetchMock).toHaveBeenCalledWith("/api/plans/swap", expect.objectContaining({ method: "POST" }));
  });

  test("moves year-plan metadata to step 4 and removes recap from the packet view", async () => {
    render(<App />);

    fireEvent.click(await screen.findByText("Continue to Adventure Trail"));
    fireEvent.click(await screen.findByLabelText(/Bobcat Lion/i));
    fireEvent.click(await screen.findByText("Refine Requirements"));
    fireEvent.click(await screen.findByText("Generate Leader Packet"));

    expect(screen.queryByText("Meeting Recap")).not.toBeInTheDocument();
    expect(screen.queryByText("Parent Update Template")).not.toBeInTheDocument();
    expect((await screen.findAllByText("Save to Year Plan")).length).toBeGreaterThan(0);
    expect(await screen.findByDisplayValue("September 2026")).toBeInTheDocument();
    expect(await screen.findByDisplayValue("Kickoff and den culture")).toBeInTheDocument();
  });

  test("step 1 keeps only planning inputs and step 3 generates the packet directly", async () => {
    render(<App />);

    expect(screen.queryByText("Leader Notes")).not.toBeInTheDocument();
    expect(screen.queryByText("Year Plan Month")).not.toBeInTheDocument();
    expect(screen.queryByText("Month Key")).not.toBeInTheDocument();
    expect(screen.queryByText("Theme")).not.toBeInTheDocument();

    fireEvent.click(await screen.findByText("Continue to Adventure Trail"));
    fireEvent.click(await screen.findByLabelText(/Bobcat Lion/i));
    fireEvent.click(await screen.findByText("Refine Requirements"));
    fireEvent.click(await screen.findByText("Generate Leader Packet"));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith("/api/plans/generate", expect.objectContaining({ method: "POST" }))
    );
    expect(await screen.findByText("Step 4 · Leader Packet")).toBeInTheDocument();
    expect((await screen.findAllByText("Materials Checklist")).length).toBeGreaterThan(0);
  });

  test("shows a pre-generation time warning when the selected scope is too large", async () => {
    render(<App />);

    fireEvent.click(await screen.findByText("Continue to Adventure Trail"));
    fireEvent.click(await screen.findByLabelText(/Bobcat Lion/i));
    fireEvent.click(await screen.findByLabelText(/Fun on the Run/i));
    fireEvent.click(await screen.findByText("Refine Requirements"));

    expect(await screen.findByText(/likely too large for 50 minutes/i)).toBeInTheDocument();
    expect(await screen.findByText(/Minimum likely time:/i)).toBeInTheDocument();
  });
});