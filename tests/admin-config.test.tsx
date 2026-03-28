import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { App } from "../src/App.js";
import { demoContent } from "../shared/demo.js";

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

describe("AdminConfig", () => {
  afterEach(() => {
    cleanup();
    window.history.pushState({}, "", "/");
  });

  beforeEach(() => {
    window.history.pushState({}, "", "/admin-config");
    fetchMock.mockReset();

    fetchMock.mockImplementation((input: string | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/api/content-status")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              datasetMode: "imported",
              importedRanks: [],
              lastRefreshedAt: "2026-03-22T10:00:00.000Z",
              activityFieldCoverage: {
                totalActivities: 1,
                meetingSpaceCount: 1,
                energyLevelCount: 1,
                supplyLevelCount: 1,
                prepLevelCount: 1,
                materialsCount: 1
              }
            })
          )
        );
      }
      if (url.endsWith("/api/admin/curriculum")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              items: [
                {
                  entityType: "ranks",
                  id: demoContent.rank.id,
                  title: demoContent.rank.name,
                  subtitle: "Grade K",
                  sourceUrl: demoContent.rank.sourceUrl,
                  refreshedAt: "2026-03-22T10:00:00.000Z",
                  tags: ["1 adventure", "1 den"]
                },
                {
                  entityType: "adventures",
                  id: demoContent.adventures[0].id,
                  title: demoContent.adventures[0].name,
                  subtitle: `${demoContent.rank.name} · required · Character & Leadership`,
                  sourceUrl: demoContent.adventures[0].sourceUrl,
                  refreshedAt: "2026-03-22T10:00:00.000Z",
                  tags: ["1 requirement", "4 activities"]
                },
                {
                  entityType: "requirements",
                  id: demoContent.requirements[0].id,
                  title: "Requirement 1",
                  subtitle: `${demoContent.rank.name} · ${demoContent.adventures[0].name}`,
                  sourceUrl: demoContent.adventures[0].sourceUrl,
                  refreshedAt: "2026-03-22T10:00:00.000Z",
                  tags: ["4 activities"]
                },
                {
                  entityType: "activities",
                  id: demoContent.activities[0].id,
                  title: demoContent.activities[0].name,
                  subtitle: `${demoContent.rank.name} · ${demoContent.adventures[0].name} · Requirement 1`,
                  sourceUrl: demoContent.activities[0].sourceUrl,
                  refreshedAt: "2026-03-22T10:00:00.000Z",
                  tags: ["Indoor", "Energy 2/5", "Supplies 1/5", "Prep 1/5"]
                }
              ]
            })
          )
        );
      }
      if (url.includes("/api/admin/curriculum/activities/")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              entityType: "activities",
              record: {
                ...demoContent.activities[0],
                rankName: demoContent.rank.name,
                adventureName: demoContent.adventures[0].name,
                requirementNumber: 1,
                sourceSnapshot: {
                  sourceUrl: demoContent.activities[0].sourceUrl,
                  rawHtml: "<html>snapshot</html>",
                  fetchedAt: "2026-03-22T10:00:00.000Z"
                }
              }
            })
          )
        );
      }
      if (url.endsWith("/api/admin/curriculum/activities") && init?.method === "POST") {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              entityType: "activities",
              record: {
                ...demoContent.activities[0],
                name: "Admin Edited Activity",
                rankName: demoContent.rank.name,
                adventureName: demoContent.adventures[0].name,
                requirementNumber: 1,
                sourceSnapshot: {
                  sourceUrl: demoContent.activities[0].sourceUrl,
                  rawHtml: "<html>snapshot</html>",
                  fetchedAt: "2026-03-22T10:00:00.000Z"
                }
              }
            })
          )
        );
      }
      return Promise.resolve(new Response(JSON.stringify({})));
    });
  });

  test("loads the hidden admin curriculum editor and saves an activity", async () => {
    render(<App />);

    expect(await screen.findByText("Curriculum Editor")).toBeInTheDocument();
    expect(await screen.findByText("Record browser")).toBeInTheDocument();
    expect(screen.getByText(/Activities/, { selector: "button" })).toBeInTheDocument();

    fireEvent.click(await screen.findByText("New activity"));
    fireEvent.change(await screen.findByLabelText("Name"), { target: { value: "Admin Edited Activity" } });
    fireEvent.click(await screen.findByText("Save record"));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/admin/curriculum/activities",
        expect.objectContaining({ method: "POST" })
      )
    );
    expect(await screen.findByText("Saved.")).toBeInTheDocument();
  });
});