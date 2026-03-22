import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { App } from "../src/App.js";
import { demoContent } from "../shared/demo.js";
import type { MeetingPlan, SavedMeetingPlan, YearPlan } from "../shared/types.js";

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

function buildGeneratedPlan(): MeetingPlan {
  return {
    id: "plan-1",
    denId: demoContent.denProfiles[0].id,
    denName: demoContent.denProfiles[0].name,
    rank: demoContent.rank,
    adventure: demoContent.adventure,
    request: {
      denId: demoContent.denProfiles[0].id,
      rankId: demoContent.rank.id,
      adventureId: demoContent.adventure.id,
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
      subject: `${demoContent.denProfiles[0].name}: ${demoContent.adventure.name} meeting update`,
      message: "Tonight we will be working on Bobcat Lion."
    }
  };
}

function buildYearPlan(savedPlans: SavedMeetingPlan[] = []): YearPlan {
  return {
    den: demoContent.denProfiles[0],
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
  beforeEach(() => {
    fetchMock.mockReset();

    const generatedPlan = buildGeneratedPlan();
    const swappedPlan: MeetingPlan = {
      ...generatedPlan,
      id: "plan-1b",
      agenda: [
        {
          ...generatedPlan.agenda[0],
          title: "The Compliment Game",
          activityId: demoContent.activities[1].id,
          selectedActivityId: demoContent.activities[1].id,
          alternativeActivityIds: [
            demoContent.activities[0].id,
            demoContent.activities[2].id,
            demoContent.activities[3].id
          ],
          selectionSource: "swapped",
          coverageStatus: "leader-review",
          description: "Everyone pays a compliment."
        }
      ],
      coverage: [
        {
          requirementId: demoContent.requirements[0].id,
          requirementNumber: 1,
          requirementText: demoContent.requirements[0].text,
          activityId: demoContent.activities[1].id,
          activityName: demoContent.activities[1].name,
          covered: true,
          coverageStatus: "leader-review",
          reason:
            "Uses The Compliment Game. Review the requirement before marking it complete because this activity was suggested for a different part of the adventure."
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
      if (url.includes(`/api/dens/${demoContent.denProfiles[0].id}/adventures`)) {
        return Promise.resolve(new Response(JSON.stringify([demoContent.adventure])));
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
              adventureId: generatedPlan.adventure.id,
              title: `${generatedPlan.denName} - ${generatedPlan.adventure.name}`,
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
              adventureId: generatedPlan.adventure.id,
              title: `${generatedPlan.denName} - ${generatedPlan.adventure.name}`,
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

  test("renders den planning inputs and can generate a leader packet", async () => {
    render(<App />);

    expect(await screen.findByText(/Plan for the den\. Print for the room\./i)).toBeInTheDocument();
    expect(await screen.findByText("Generate Leader Packet")).toBeInTheDocument();
    expect(await screen.findByText(demoContent.denProfiles[0].name)).toBeInTheDocument();
    expect(await screen.findByText(/Dataset:/i)).toBeInTheDocument();
  });

  test("lets the leader preview options and swap an activity", async () => {
    render(<App />);

    fireEvent.click((await screen.findAllByText("Generate Leader Packet"))[0]);
    fireEvent.click(await screen.findByText("Preview and Swap Activity"));
    expect(await screen.findByText("Activity Options")).toBeInTheDocument();
    fireEvent.click(screen.getByText("The Compliment Game"));
    expect(await screen.findByText(/requirement completion will move to leader review/i)).toBeInTheDocument();
    fireEvent.click(screen.getByText("Use This Activity"));

    expect(await screen.findByText("Leader review")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/plans/swap",
      expect.objectContaining({ method: "POST" })
    );
  });

  test("saves recap data and folds follow-up into the parent update", async () => {
    render(<App />);

    fireEvent.click((await screen.findAllByText("Generate Leader Packet"))[0]);
    fireEvent.click(await screen.findByLabelText(/Requirement 1 completed/i));
    fireEvent.change(screen.getByLabelText("Family Follow-up"), { target: { value: "Wear class A next week." } });
    fireEvent.click(screen.getByText("Save Meeting Recap"));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      "/api/plans/recap",
      expect.objectContaining({ method: "POST" })
    ));
    expect(await screen.findByDisplayValue(/Family follow-up: Wear class A next week\./i)).toBeInTheDocument();
  });
});