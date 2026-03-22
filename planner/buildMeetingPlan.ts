import type {
  Activity,
  AdventureBundle,
  CoverageItem,
  CoverageStatus,
  DenProfile,
  MeetingAgendaItem,
  MeetingPlan,
  MeetingRequest,
  Rank,
  Requirement,
  SelectionSource
} from "../shared/types.js";
import { chunkedDuration, makeId } from "../shared/utils.js";

type RequirementSelection = {
  requirement: Requirement;
  activity: Activity | null;
  selectionSource: SelectionSource | null;
  coverageStatus: CoverageStatus;
};

function chooseRecommendedActivity(
  requirement: Requirement,
  activities: Activity[],
  environment: MeetingRequest["environment"]
): Activity | null {
  const requirementActivities = activities.filter((activity) => activity.requirementId === requirement.id);
  const compatible = requirementActivities.filter((activity) => {
    if (environment === "either") {
      return true;
    }
    return activity.location.toLowerCase().includes(environment);
  });
  return compatible[0] ?? requirementActivities[0] ?? null;
}

function inferCoverageStatus(requirement: Requirement, activity: Activity | null): CoverageStatus {
  if (!activity) {
    return "uncovered";
  }
  return activity.requirementId === requirement.id ? "automatic" : "leader-review";
}

function buildSelections(
  requirements: Requirement[],
  activities: Activity[],
  request: MeetingRequest,
  overrides: Map<string, string> = new Map()
): RequirementSelection[] {
  return requirements.map((requirement) => {
    const overrideActivityId = overrides.get(requirement.id);
    const activity = overrideActivityId
      ? activities.find((candidate) => candidate.id === overrideActivityId) ?? null
      : chooseRecommendedActivity(requirement, activities, request.environment);
    const selectionSource: SelectionSource | null = activity
      ? overrideActivityId
        ? "swapped"
        : "recommended"
      : null;
    return {
      requirement,
      activity,
      selectionSource,
      coverageStatus: inferCoverageStatus(requirement, activity)
    };
  });
}

function buildCoverage(selections: RequirementSelection[]): CoverageItem[] {
  return selections.map(({ requirement, activity, coverageStatus }) => ({
    requirementId: requirement.id,
    requirementNumber: requirement.requirementNumber,
    requirementText: requirement.text,
    activityId: activity?.id ?? null,
    activityName: activity?.name ?? null,
    covered: coverageStatus !== "uncovered",
    coverageStatus,
    reason:
      coverageStatus === "automatic"
        ? `Covered with ${activity?.name}.`
        : coverageStatus === "leader-review"
          ? `Uses ${activity?.name}. Review the requirement before marking it complete because this activity was suggested for a different part of the adventure.`
          : "No official linked activity was found. Leader review is needed before claiming completion."
  }));
}

function buildMaterials(activities: Activity[]): string[] {
  const materials = new Set<string>();
  for (const activity of activities) {
    if (/craft|make|draw|color|flag|doodle/i.test(activity.name + activity.summary + activity.previewDetails)) {
      materials.add("Basic craft supplies");
    }
    if (/game|circle|share|discussion/i.test(activity.name + activity.summary + activity.previewDetails)) {
      materials.add("Open floor or circle seating");
    }
  }
  materials.add("Printed requirement checklist");
  return Array.from(materials);
}

function buildActivityAgendaItems(
  adventureId: string,
  selections: RequirementSelection[],
  allActivities: Activity[],
  request: MeetingRequest,
  activityDurations: number[]
): MeetingAgendaItem[] {
  const agendaItems: MeetingAgendaItem[] = [];
  selections
    .filter((selection) => selection.activity)
    .forEach((selection, index, filteredSelections) => {
      const activity = selection.activity!;
      agendaItems.push({
        id: makeId(adventureId, selection.requirement.id, "activity"),
        kind: "activity",
        title: activity.name,
        durationMinutes: activityDurations[index] ?? 10,
        description: activity.summary,
        requirementIds: [selection.requirement.id],
        activityId: activity.id,
        primaryRequirementId: selection.requirement.id,
        selectedActivityId: activity.id,
        alternativeActivityIds: allActivities
          .filter((candidate) => candidate.id !== activity.id)
          .map((candidate) => candidate.id),
        selectionSource: selection.selectionSource,
        coverageStatus: selection.coverageStatus,
        editableNotes:
          activity.notes ||
          `Use the official activity card for ${activity.name} and adjust delivery for ${request.scoutCount} scouts.`
      });

      if (index < filteredSelections.length - 1) {
        agendaItems.push({
          id: makeId(adventureId, activity.id, "transition"),
          kind: "transition",
          title: "Transition",
          durationMinutes: 5,
          description: "Reset the room, move supplies, and connect the last activity to the next requirement.",
          requirementIds: [],
          activityId: null,
          primaryRequirementId: null,
          selectedActivityId: null,
          alternativeActivityIds: [],
          selectionSource: null,
          coverageStatus: null,
          editableNotes: "Use a quick movement break or call-and-response to keep scouts focused."
        });
      }
    });
  return agendaItems;
}

function buildLeaderNotes(coverage: CoverageItem[]): string {
  if (coverage.some((item) => item.coverageStatus === "leader-review")) {
    return "One or more swapped activities support the meeting but need leader review before you mark the requirement complete.";
  }
  if (coverage.some((item) => item.coverageStatus === "uncovered")) {
    return "Do not mark uncovered requirements complete until you review the official requirement text and choose a supporting activity.";
  }
  return "This plan covers each requirement with an official linked activity. Confirm completion based on actual meeting delivery.";
}

function buildPlan(
  den: DenProfile,
  rank: Rank,
  bundle: AdventureBundle,
  request: MeetingRequest,
  overrides: Map<string, string> = new Map()
): MeetingPlan {
  const selections = buildSelections(bundle.requirements, bundle.activities, request, overrides);
  const coverage = buildCoverage(selections);
  const chosenActivities = selections
    .map((selection) => selection.activity)
    .filter((activity): activity is Activity => Boolean(activity));

  const introMinutes = 10;
  const transitionCount = Math.max(chosenActivities.length - 1, 0);
  const transitionMinutes = transitionCount * 5;
  const closingMinutes = 10;
  const mainMinutes = Math.max(request.durationMinutes - introMinutes - transitionMinutes - closingMinutes, 15);
  const activityDurations = chunkedDuration(mainMinutes, Math.max(chosenActivities.length, 1), 10);

  const agenda: MeetingAgendaItem[] = [
    {
      id: makeId(bundle.adventure.id, "opening"),
      kind: "opening",
      title: "Opening Gathering",
      durationMinutes: 10,
      description: "Gather the den, review the adventure goal, and set expectations for behavior and participation.",
      requirementIds: [],
      activityId: null,
      primaryRequirementId: null,
      selectedActivityId: null,
      alternativeActivityIds: [],
      selectionSource: null,
      coverageStatus: null,
      editableNotes: "Welcome scouts, collect any needed forms, and preview tonight's adventure."
    },
    ...buildActivityAgendaItems(bundle.adventure.id, selections, bundle.activities, request, activityDurations)
  ];

  const uncovered = coverage.filter((item) => item.coverageStatus === "uncovered");
  if (uncovered.length > 0) {
    agenda.push({
      id: makeId(bundle.adventure.id, "reflection"),
      kind: "reflection",
      title: "Leader Review Checkpoint",
      durationMinutes: 5,
      description: "Review any uncovered requirements before marking the adventure complete.",
      requirementIds: uncovered.map((item) => item.requirementId),
      activityId: null,
      primaryRequirementId: null,
      selectedActivityId: null,
      alternativeActivityIds: [],
      selectionSource: null,
      coverageStatus: null,
      editableNotes: uncovered.map((item) => `Requirement ${item.requirementNumber}: ${item.requirementText}`).join(" ")
    });
  }

  agenda.push({
    id: makeId(bundle.adventure.id, "closing"),
    kind: "closing",
    title: "Closing Reflection",
    durationMinutes: 10,
    description: "Reflect on what scouts practiced, celebrate progress, and preview the next meeting.",
    requirementIds: [],
    activityId: null,
    primaryRequirementId: null,
    selectedActivityId: null,
    alternativeActivityIds: [],
    selectionSource: null,
    coverageStatus: null,
    editableNotes: "Invite each scout to share one thing they learned or enjoyed."
  });

  const prepNotes = [
    `Review the official ${bundle.adventure.name} adventure page before the meeting.`,
    `Confirm space and setup for a ${request.environment} meeting.`,
    `Prepare materials for ${chosenActivities.length || 1} main activity block(s).`
  ];

  if (request.notes.trim()) {
    prepNotes.push(`Leader constraint: ${request.notes.trim()}`);
  }

  return {
    id: makeId(bundle.adventure.id, new Date().toISOString()),
    denId: den.id,
    denName: den.name,
    rank,
    adventure: bundle.adventure,
    request,
    prepNotes,
    materials: buildMaterials(chosenActivities),
    agenda,
    coverage,
    activityLibrary: bundle.activities,
    leaderNotes: buildLeaderNotes(coverage),
    printSections: [
      "Opening and gathering",
      "Main activity flow",
      "Materials and prep",
      "Requirement coverage",
      "Leader notes and reminders"
    ],
    parentUpdate: {
      subject: `${den.name}: ${bundle.adventure.name} meeting update`,
      message: [
        `Tonight we will be working on ${bundle.adventure.name}.`,
        `This meeting is planned for ${request.environment}. Please dress accordingly.`,
        `We will focus on ${coverage
          .map((item) => `requirement ${item.requirementNumber}`)
          .join(", ")}.`,
        `Materials to have ready: ${buildMaterials(chosenActivities).join(", ")}.`,
        request.notes.trim() ? `Leader note for families: ${request.notes.trim()}` : "We'll share any follow-up after the meeting."
      ].join(" ")
    },
    generatedAt: new Date().toISOString()
  };
}

export function buildMeetingPlan(den: DenProfile, rank: Rank, bundle: AdventureBundle, request: MeetingRequest): MeetingPlan {
  return buildPlan(den, rank, bundle, request);
}

export function swapMeetingActivity(
  den: DenProfile,
  rank: Rank,
  bundle: AdventureBundle,
  plan: MeetingPlan,
  agendaItemId: string,
  selectedActivityId: string
): MeetingPlan {
  const overrides = new Map<string, string>();
  for (const item of plan.agenda) {
    if (item.kind !== "activity" || !item.primaryRequirementId || !item.selectedActivityId) {
      continue;
    }
    if (item.selectionSource === "swapped") {
      overrides.set(item.primaryRequirementId, item.selectedActivityId);
    }
  }

  const agendaItem = plan.agenda.find((item) => item.id === agendaItemId && item.kind === "activity");
  if (!agendaItem?.primaryRequirementId) {
    return plan;
  }

  overrides.set(agendaItem.primaryRequirementId, selectedActivityId);
  return buildPlan(den, rank, bundle, plan.request, overrides);
}