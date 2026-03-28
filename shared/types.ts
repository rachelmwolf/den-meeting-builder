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
}

export type CurriculumEntityType = "ranks" | "adventures" | "requirements" | "activities";

export interface SourceSnapshot {
  sourceUrl: string;
  rawHtml: string;
  fetchedAt: string;
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

export interface AdminCurriculumListItem {
  entityType: CurriculumEntityType;
  id: string;
  title: string;
  subtitle: string;
  sourceUrl: string;
  refreshedAt: string | null;
  tags: string[];
}

export interface AdminRankRecord extends Rank {
  adventureCount: number;
  denCount: number;
  sourceSnapshot: SourceSnapshot | null;
}

export interface AdminAdventureRecord extends Adventure {
  rankName: string;
  requirementCount: number;
  activityCount: number;
  sourceSnapshot: SourceSnapshot | null;
}

export interface AdminRequirementRecord extends Requirement {
  rankName: string;
  adventureName: string;
  activityCount: number;
  sourceSnapshot: SourceSnapshot | null;
}

export interface AdminActivityRecord extends Activity {
  rankName: string;
  adventureName: string;
  requirementNumber: number | null;
  sourceSnapshot: SourceSnapshot | null;
}

export type AdminCurriculumDetail =
  | { entityType: "ranks"; record: AdminRankRecord }
  | { entityType: "adventures"; record: AdminAdventureRecord }
  | { entityType: "requirements"; record: AdminRequirementRecord }
  | { entityType: "activities"; record: AdminActivityRecord };

export type AdminCurriculumWrite =
  | { entityType: "ranks"; record: Rank }
  | { entityType: "adventures"; record: Adventure }
  | { entityType: "requirements"; record: Requirement }
  | { entityType: "activities"; record: Activity };

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
  safetyMoment?: string;
  alternatePath?: string;
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

export interface ActivityDirectionStep {
  text: string;
  bullets: string[];
}

export interface ActivityDirectionSection {
  heading: string;
  steps: ActivityDirectionStep[];
}

export interface ActivityDirections {
  atHomeOption: ActivityDirectionSection | null;
  before: ActivityDirectionSection | null;
  during: ActivityDirectionSection | null;
  after: ActivityDirectionSection | null;
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
  previewDetails: string;
  supplyNote?: string;
  directions?: ActivityDirections | null;
  hasAdditionalResources?: boolean;
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

export interface OpeningPromptVariables {
  rank: string;
  grade: string;
  adventures: string;
  requirements: string;
  activities: string;
}

export interface OpeningPromptEnvelope {
  prompt: {
    id: string;
    version: string;
    variables: OpeningPromptVariables;
  };
}

export type OpeningGenerationRequest = OpeningPromptEnvelope;

export interface OpeningGenerationResponse {
  openingText: string;
}

export interface SaveMeetingPlanRequest {
  denId: string;
  title: string;
  plannedDate: string | null;
  payload: MeetingPlan;
}

export interface SavedMeetingPlan {
  id: string;
  denId: string;
  title: string;
  plannedDate: string | null;
  payload: MeetingPlan;
  recap: MeetingRecap | null;
  createdAt: string;
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