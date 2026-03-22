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

export interface PackWorkspace {
  id: string;
  name: string;
  planningNotes: string;
}

export type DatasetMode = "demo" | "imported" | "mixed";

export interface ImportedRankStatus {
  rankId: string;
  rankName: string;
  refreshedAt: string;
}

export interface ContentStatus {
  datasetMode: DatasetMode;
  importedRanks: ImportedRankStatus[];
  lastRefreshedAt: string | null;
}

export interface Rank {
  id: string;
  name: string;
  grade: string;
  slug: string;
  sourceUrl: string;
}

export interface DenProfile {
  id: string;
  workspaceId: string;
  rankId: string;
  name: string;
  leaderName: string;
  meetingLocation: string;
  typicalMeetingDay: string;
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
  denId: string;
  rankId: string;
  adventureId: string;
  durationMinutes: number;
  scoutCount: number;
  environment: Environment;
  notes: string;
  meetingDate: string | null;
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

export interface ParentUpdateTemplate {
  subject: string;
  message: string;
}

export interface MeetingRecap {
  meetingPlanId: string;
  completedRequirementIds: string[];
  recapNotes: string;
  familyFollowUp: string;
  reuseNotes: string;
  recordedAt: string;
}

export interface MeetingPlan {
  id: string;
  denId: string;
  denName: string;
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
  printSections: string[];
  parentUpdate: ParentUpdateTemplate;
}

export interface SaveMeetingPlanRequest {
  denId: string;
  title: string;
  plannedDate: string | null;
  monthKey: string;
  monthLabel: string;
  theme: string;
  payload: MeetingPlan;
}

export interface SavedMeetingPlan {
  id: string;
  denId: string;
  rankId: string;
  adventureId: string;
  title: string;
  plannedDate: string | null;
  monthKey: string;
  monthLabel: string;
  theme: string;
  payload: MeetingPlan;
  recap: MeetingRecap | null;
  createdAt: string;
}

export interface YearPlanMonth {
  monthKey: string;
  monthLabel: string;
  theme: string;
  items: SavedMeetingPlan[];
}

export interface YearPlan {
  den: DenProfile;
  months: YearPlanMonth[];
}

export interface AdventureBundle {
  adventure: Adventure;
  requirements: Requirement[];
  activities: Activity[];
}

export interface ActivitySwapRequest {
  plan: MeetingPlan;
  selectedActivityId: string;
  agendaItemId: string;
}

export interface SaveRecapRequest {
  meetingPlanId: string;
  completedRequirementIds: string[];
  recapNotes: string;
  familyFollowUp: string;
  reuseNotes: string;
}