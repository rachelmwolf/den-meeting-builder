import type {
  ActivitySwapRequest,
  Adventure,
  AdventureTrailData,
  ContentStatus,
  DenProfile,
  MeetingPlan,
  Requirement,
  MeetingRecap,
  PackWorkspace,
  SaveMeetingPlanRequest,
  SaveRecapRequest,
  SavedMeetingPlan,
  YearPlan
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
  getWorkspace(): Promise<PackWorkspace | null> {
    return readJson("/api/workspace");
  },
  getContentStatus(): Promise<ContentStatus> {
    return readJson("/api/content-status");
  },
  listDens(): Promise<DenProfile[]> {
    return readJson("/api/dens");
  },
  listAdventures(denId: string): Promise<Adventure[]> {
    return readJson(`/api/dens/${denId}/adventures`);
  },
  getAdventureTrail(denId: string): Promise<AdventureTrailData> {
    return readJson(`/api/dens/${denId}/adventure-trail`);
  },
  listRequirements(denId: string, adventureIds: string[]): Promise<Requirement[]> {
    return readJson(`/api/dens/${denId}/requirements?adventureIds=${encodeURIComponent(adventureIds.join(","))}`);
  },
  generatePlan(request: MeetingPlan["request"]): Promise<MeetingPlan> {
    return readJson("/api/plans/generate", {
      method: "POST",
      body: JSON.stringify(request)
    });
  },
  savePlan(request: SaveMeetingPlanRequest): Promise<SavedMeetingPlan> {
    return readJson("/api/plans/save", {
      method: "POST",
      body: JSON.stringify(request)
    });
  },
  swapActivity(request: ActivitySwapRequest): Promise<MeetingPlan> {
    return readJson("/api/plans/swap", {
      method: "POST",
      body: JSON.stringify(request)
    });
  },
  saveRecap(request: SaveRecapRequest): Promise<MeetingRecap> {
    return readJson("/api/plans/recap", {
      method: "POST",
      body: JSON.stringify(request)
    });
  },
  duplicatePlan(savedPlanId: string, monthKey: string, monthLabel: string, theme: string): Promise<SavedMeetingPlan> {
    return readJson(`/api/plans/${savedPlanId}/duplicate`, {
      method: "POST",
      body: JSON.stringify({ monthKey, monthLabel, theme })
    });
  },
  getYearPlan(denId: string): Promise<YearPlan> {
    return readJson(`/api/dens/${denId}/year-plan`);
  }
};