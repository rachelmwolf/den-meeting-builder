export type Environment = "indoor" | "outdoor" | "either";
export type AdventureKind = "required" | "elective";
export type CoverageStatus = "automatic" | "leader-review" | "uncovered";
export type SelectionSource = "recommended" | "swapped";
export type AgendaSectionKind =
  | "opening"
  | "activity"
  | "transition"
  | "reflection"
  | "closing";

export interface Rank {
  id: string;
  name: string;
  grade: string;
  slug: string;
  sourceUrl: string;
}

export interface Adventure {
  id: string;
  rankId: string;
  name: string;
  slug: string;
  kind: AdventureKind;
  category: string;
  sourceUrl: string;
  snapshot: string;
}

export interface Requirement {
  id: string;
  adventureId: string;
  requirementNumber: number;
  text: string;
}

export interface Activity {
  id: string;
  adventureId: string;
  requirementId: string | null;
  name: string;
  slug: string;
  sourceUrl: string;
  summary: string;
  location: string;
  prepMinutes: number | null;
  durationMinutes: number | null;
  difficulty: number | null;
  notes: string;
  previewDetails: string;
}

export interface MeetingRequest {
  rankId: string;
  adventureId: string;
  durationMinutes: number;
  scoutCount: number;
  environment: Environment;
  notes: string;
}

export interface CoverageItem {
  requirementId: string;
  requirementNumber: number;
  requirementText: string;
  activityId: string | null;
  activityName: string | null;
  covered: boolean;
  reason: string;
  coverageStatus: CoverageStatus;
}

export interface MeetingAgendaItem {
  id: string;
  kind: AgendaSectionKind;
  title: string;
  durationMinutes: number;
  description: string;
  requirementIds: string[];
  activityId: string | null;
  primaryRequirementId: string | null;
  selectedActivityId: string | null;
  alternativeActivityIds: string[];
  selectionSource: SelectionSource | null;
  coverageStatus: CoverageStatus | null;
  editableNotes: string;
}

export interface MeetingPlan {
  id: string;
  rank: Rank;
  adventure: Adventure;
  request: MeetingRequest;
  prepNotes: string[];
  materials: string[];
  agenda: MeetingAgendaItem[];
  coverage: CoverageItem[];
  activityLibrary: Activity[];
  leaderNotes: string;
  generatedAt: string;
}

export interface ActivitySwapRequest {
  plan: MeetingPlan;
  selectedActivityId: string;
  agendaItemId: string;
}

export interface SavedMeetingPlan {
  id: string;
  rankId: string;
  adventureId: string;
  title: string;
  plannedDate: string | null;
  payload: MeetingPlan;
  createdAt: string;
}

export interface YearPlanOutlineItem {
  savedPlanId: string;
  title: string;
  adventureName: string;
  plannedDate: string | null;
}

export interface YearPlanOutline {
  rank: Rank;
  items: YearPlanOutlineItem[];
}

export interface AdventureBundle {
  adventure: Adventure;
  requirements: Requirement[];
  activities: Activity[];
}