import type {
  ActivitySwapRequest,
  Adventure,
  MeetingPlan,
  MeetingRequest,
  Rank,
  SavedMeetingPlan,
  YearPlanOutline
} from "../shared/types.js";

async function readJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    headers: {
      "content-type": "application/json"
    },
    ...init
  });
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return (await response.json()) as T;
}

export const api = {
  listRanks(): Promise<Rank[]> {
    return readJson("/api/ranks");
  },
  listAdventures(rankId: string): Promise<Adventure[]> {
    return readJson(`/api/ranks/${rankId}/adventures`);
  },
  generatePlan(request: MeetingRequest): Promise<MeetingPlan> {
    return readJson("/api/plans/generate", {
      method: "POST",
      body: JSON.stringify(request)
    });
  },
  savePlan(title: string, plannedDate: string | null, payload: MeetingPlan): Promise<SavedMeetingPlan> {
    return readJson("/api/plans/save", {
      method: "POST",
      body: JSON.stringify({ title, plannedDate, payload })
    });
  },
  swapActivity(request: ActivitySwapRequest): Promise<MeetingPlan> {
    return readJson("/api/plans/swap", {
      method: "POST",
      body: JSON.stringify(request)
    });
  },
  getYearPlan(rankId: string): Promise<YearPlanOutline> {
    return readJson(`/api/ranks/${rankId}/year-plan`);
  }
};