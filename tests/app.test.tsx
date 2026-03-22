import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { App } from "../src/App.js";
import { demoContent } from "../shared/demo.js";

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

describe("App", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockImplementation((input: string | URL, _init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/api/ranks")) {
        return Promise.resolve(new Response(JSON.stringify([demoContent.rank])));
      }
      if (url.includes("/api/ranks/lion/adventures")) {
        return Promise.resolve(new Response(JSON.stringify([demoContent.adventure])));
      }
      if (url.includes("/api/ranks/lion/year-plan")) {
        return Promise.resolve(new Response(JSON.stringify({ rank: demoContent.rank, items: [] })));
      }
      if (url.endsWith("/api/plans/generate")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              id: "plan-1",
              rank: demoContent.rank,
              adventure: demoContent.adventure,
              request: {
                rankId: demoContent.rank.id,
                adventureId: demoContent.adventure.id,
                durationMinutes: 60,
                scoutCount: 6,
                environment: "indoor",
                notes: ""
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
              generatedAt: new Date().toISOString()
            })
          )
        );
      }
      if (url.endsWith("/api/plans/swap")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              id: "plan-1b",
              rank: demoContent.rank,
              adventure: demoContent.adventure,
              request: {
                rankId: demoContent.rank.id,
                adventureId: demoContent.adventure.id,
                durationMinutes: 60,
                scoutCount: 6,
                environment: "indoor",
                notes: ""
              },
              prepNotes: ["Review the official adventure page."],
              materials: ["Basic craft supplies"],
              agenda: [
                {
                  id: "agenda-1",
                  kind: "activity",
                  title: "The Compliment Game",
                  durationMinutes: 15,
                  description: "Everyone pays a compliment.",
                  requirementIds: [demoContent.requirements[0].id],
                  activityId: demoContent.activities[1].id,
                  primaryRequirementId: demoContent.requirements[0].id,
                  selectedActivityId: demoContent.activities[1].id,
                  alternativeActivityIds: [demoContent.activities[0].id, demoContent.activities[2].id, demoContent.activities[3].id],
                  selectionSource: "swapped",
                  coverageStatus: "leader-review",
                  editableNotes: "Use the official activity card."
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
                  reason: "Uses The Compliment Game. Review the requirement before marking it complete because this activity was suggested for a different part of the adventure."
                }
              ],
              activityLibrary: demoContent.activities,
              leaderNotes: "One or more swapped activities support the meeting but need leader review before you mark the requirement complete.",
              generatedAt: new Date().toISOString()
            })
          )
        );
      }
      return Promise.resolve(new Response(JSON.stringify({})));
    });
  });

  test("renders inputs and can generate a meeting plan", async () => {
    render(<App />);

    expect(await screen.findByText(/Build a den meeting/i)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText(/Generate Meeting Plan/i)).toBeInTheDocument());
  });

  test("lets the leader preview options and swap an activity", async () => {
    render(<App />);

    const generateButtons = await screen.findAllByText("Generate Meeting Plan");
    fireEvent.click(generateButtons[0]);
    fireEvent.click(await screen.findByText("Preview and Swap Activity"));
    expect(await screen.findByText("Activity Options")).toBeInTheDocument();
    fireEvent.click(screen.getByText("The Compliment Game"));
    fireEvent.click(screen.getByText("Use This Activity"));

    expect(await screen.findByText("Leader review")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/plans/swap",
      expect.objectContaining({ method: "POST" })
    );
  });
});