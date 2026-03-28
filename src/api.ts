import type {
  AdminCurriculumDetail,
  AdminCurriculumListItem,
  AdminCurriculumWrite,
  ActivitySwapRequest,
  Adventure,
  AdventureTrailData,
  ContentStatus,
  CurriculumEntityType,
  DenProfile,
  OpeningGenerationRequest,
  OpeningGenerationResponse,
  MeetingPlan,
  Requirement,
  MeetingRecap,
  PackWorkspace,
  SaveMeetingPlanRequest,
  SaveRecapRequest,
  SavedMeetingPlan
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
  listAdminCurriculum(): Promise<{ items: AdminCurriculumListItem[] }> {
    return readJson("/api/admin/curriculum");
  },
  getAdminCurriculumDetail(entityType: CurriculumEntityType, id: string): Promise<AdminCurriculumDetail> {
    return readJson(`/api/admin/curriculum/${entityType}/${id}`);
  },
  saveAdminCurriculumRecord(request: AdminCurriculumWrite): Promise<AdminCurriculumDetail> {
    return readJson(`/api/admin/curriculum/${request.entityType}`, {
      method: "POST",
      body: JSON.stringify(request)
    });
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
  generateOpening(request: OpeningGenerationRequest): Promise<OpeningGenerationResponse> {
    return readJson("/api/plans/opening", {
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
};