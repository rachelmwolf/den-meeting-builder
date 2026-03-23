export type MeetingSpace = "indoor" | "outing-with-travel" | "outdoor";
export type ActivityMeetingSpace = MeetingSpace | "indoor-or-outdoor" | "unknown";
export type AdventureKind = "required" | "elective";
export type CoverageStatus = "automatic" | "leader-review" | "uncovered";
export type SelectionSource = "recommended" | "swapped" | "added";
export type AdventureTrailBucketKey =
  | "character-leadership"
  | "outdoors"
  | "personal-fitness"
  | "citizenship"
  | "personal-safety"
  | "family-reverence"
  | "electives";
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

export interface ActivityFieldCoverage {
  totalActivities: number;
  meetingSpaceCount: number;
  energyLevelCount: number;
  supplyLevelCount: number;
  prepLevelCount: number;
  materialsCount: number;
}

export interface ContentStatus {
  datasetMode: DatasetMode;
  importedRanks: ImportedRankStatus[];
  lastRefreshedAt: string | null;
  activityFieldCoverage: ActivityFieldCoverage;
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

export interface AdventureTrailBucket {
  key: AdventureTrailBucketKey;
  label: string;
  required: boolean;
  adventures: Adventure[];
}

export interface AdventureTrailProgressBucket {
  key: AdventureTrailBucketKey;
  label: string;
  required: boolean;
  targetCount: number;
  completedCount: number;
  completedAdventureIds: string[];
}

export interface AdventureTrailProgress {
  buckets: AdventureTrailProgressBucket[];
  electiveTargetCount: number;
  electiveCompletedCount: number;
}

export interface AdventureTrailData {
  buckets: AdventureTrailBucket[];
  progress: AdventureTrailProgress;
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
  meetingSpace: ActivityMeetingSpace;
  energyLevel: number | null;
  supplyLevel: number | null;
  prepLevel: number | null;
  durationMinutes: number | null;
  materials: string[];
  notes: string;
  previewDetails: string;
}

export interface MeetingRequest {
  denId: string;
  rankId: string;
  adventureIds: string[];
  requirementIds?: string[];
  durationMinutes: number;
  scoutCount: number;
  meetingSpace: MeetingSpace;
  maxEnergyLevel: number;
  maxSupplyLevel: number;
  maxPrepLevel: number;
  notes: string;
  meetingDate: string | null;
}

export interface CoverageItem {
  adventureId: string;
  adventureName: string;
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
  adventureId: string | null;
  adventureName: string | null;
  requirementIds: string[];
  requirementNumber: number | null;
  requirementText: string | null;
  activityId: string | null;
  primaryRequirementId: string | null;
  selectedActivityId: string | null;
  alternativeActivityIds: string[];
  selectionSource: SelectionSource | null;
  coverageStatus: CoverageStatus | null;
  addedFromSelection: boolean;
  editableNotes: string;
}

export interface ParentUpdateTemplate {
  subject: string;
  message: string;
}

export type TimeBudgetStatus = "fits" | "tight" | "over";

export interface TimeBudgetSummary {
  targetMinutes: number;
  plannedMinutes: number;
  minimumSuggestedMinutes: number;
  recommendedMinutes: number;
  activityCount: number;
  status: TimeBudgetStatus;
  warnings: string[];
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
  adventures: Adventure[];
  request: MeetingRequest;
  prepNotes: string[];
  materials: string[];
  agenda: MeetingAgendaItem[];
  coverage: CoverageItem[];
  activityLibrary: Activity[];
  leaderNotes: string;
  timeBudget: TimeBudgetSummary;
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
  trailProgress: AdventureTrailProgress;
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