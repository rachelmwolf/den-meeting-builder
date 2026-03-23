import type {
  Activity,
  ActivityMeetingSpace,
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
import { chunkedDuration, labelMeetingSpace, makeId } from "../shared/utils.js";

type RequirementSelection = {
  adventureId: string;
  adventureName: string;
  requirement: Requirement;
  activity: Activity | null;
  selectionSource: SelectionSource | null;
  coverageStatus: CoverageStatus;
};

function scoreMeetingSpace(
  activitySpace: ActivityMeetingSpace,
  requestedSpace: MeetingRequest["meetingSpace"]
): { score: number; reason: string } {
  if (activitySpace === requestedSpace) {
    return { score: 0, reason: `matched ${labelMeetingSpace(requestedSpace).toLowerCase()}` };
  }
  if (activitySpace === "indoor-or-outdoor") {
    return { score: 1, reason: "works in either indoor or outdoor space" };
  }
  if (requestedSpace === "outdoor" && activitySpace === "outing-with-travel") {
    return { score: 2, reason: "supports travel-based outdoor planning" };
  }
  if (requestedSpace === "outing-with-travel" && activitySpace === "outdoor") {
    return { score: 2, reason: "keeps the meeting outside with lighter travel needs" };
  }
  return { score: 4, reason: `does not fully match the ${labelMeetingSpace(requestedSpace).toLowerCase()} preference` };
}

function scoreMaxPreference(value: number | null, maxAllowed: number, label: string): { score: number; reason: string } {
  if (value === null) {
    return { score: 2, reason: `${label} is not listed on the official activity card` };
  }
  if (value <= maxAllowed) {
    return { score: 0, reason: `${label} ${value}/${maxAllowed} stays within your preference` };
  }
  return { score: value - maxAllowed + 1, reason: `${label} ${value}/${maxAllowed} is above your preferred limit` };
}

function buildSelectionReason(activity: Activity, request: MeetingRequest): string {
  const reasons = [
    scoreMeetingSpace(activity.meetingSpace, request.meetingSpace).reason,
    scoreMaxPreference(activity.energyLevel, request.maxEnergyLevel, "energy").reason,
    scoreMaxPreference(activity.supplyLevel, request.maxSupplyLevel, "supplies").reason,
    scoreMaxPreference(activity.prepLevel, request.maxPrepLevel, "prep").reason
  ];
  return reasons[0]
    ? `Chosen because it ${reasons.join(", ")}.`
    : "Chosen as the best fit among the official linked activities.";
}

function chooseRecommendedActivity(
  requirement: Requirement,
  activities: Activity[],
  request: MeetingRequest
): Activity | null {
  const requirementActivities = activities.filter((activity) => activity.requirementId === requirement.id);
  return (
    requirementActivities
      .slice()
      .sort((left, right) => {
        const leftScore =
          scoreMeetingSpace(left.meetingSpace, request.meetingSpace).score +
          scoreMaxPreference(left.energyLevel, request.maxEnergyLevel, "energy").score +
          scoreMaxPreference(left.supplyLevel, request.maxSupplyLevel, "supplies").score +
          scoreMaxPreference(left.prepLevel, request.maxPrepLevel, "prep").score;
        const rightScore =
          scoreMeetingSpace(right.meetingSpace, request.meetingSpace).score +
          scoreMaxPreference(right.energyLevel, request.maxEnergyLevel, "energy").score +
          scoreMaxPreference(right.supplyLevel, request.maxSupplyLevel, "supplies").score +
          scoreMaxPreference(right.prepLevel, request.maxPrepLevel, "prep").score;
        if (leftScore !== rightScore) {
          return leftScore - rightScore;
        }
        return left.name.localeCompare(right.name);
      })[0] ?? null
  );
}

function inferCoverageStatus(requirement: Requirement, activity: Activity | null): CoverageStatus {
  if (!activity) {
    return "uncovered";
  }
  return activity.requirementId === requirement.id ? "automatic" : "leader-review";
}

function buildSelections(
  bundles: AdventureBundle[],
  request: MeetingRequest,
  overrides: Map<string, string> = new Map(),
  addedRequirementIds: Set<string> = new Set()
): RequirementSelection[] {
  const selectedRequirementIds = new Set(request.requirementIds?.filter(Boolean) ?? []);

  return bundles.flatMap((bundle) =>
    bundle.requirements
      .filter((requirement) => selectedRequirementIds.size === 0 || selectedRequirementIds.has(requirement.id))
      .map((requirement) => {
        const overrideActivityId = overrides.get(requirement.id);
        const activity = overrideActivityId
          ? bundles
              .flatMap((candidateBundle) => candidateBundle.activities)
              .find((candidate) => candidate.id === overrideActivityId) ?? null
          : chooseRecommendedActivity(requirement, bundle.activities, request);

        return {
          adventureId: bundle.adventure.id,
          adventureName: bundle.adventure.name,
          requirement,
          activity,
          selectionSource: activity
            ? overrideActivityId
              ? addedRequirementIds.has(requirement.id)
                ? "added"
                : "swapped"
              : "recommended"
            : null,
          coverageStatus: inferCoverageStatus(requirement, activity)
        };
      })
  );
}

function buildCoverage(selections: RequirementSelection[]): CoverageItem[] {
  return selections.map(({ adventureId, adventureName, requirement, activity, coverageStatus }) => ({
    adventureId,
    adventureName,
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
          ? `Uses ${activity?.name}. Review the requirement before marking it complete because this activity was suggested for a different requirement or adventure.`
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
    if (/outside|walk|outdoor|trail|relay/i.test(activity.name + activity.summary + activity.previewDetails)) {
      materials.add("Outdoor movement space or weather-appropriate alternate");
    }
  }
  materials.add("Printed requirement checklist");
  return Array.from(materials);
}

function buildActivityAgendaItems(
  selections: RequirementSelection[],
  allActivities: Activity[],
  request: MeetingRequest,
  activityDurations: number[]
): MeetingAgendaItem[] {
  const agendaItems: MeetingAgendaItem[] = [];
  const filteredSelections = selections.filter((selection) => selection.activity);
  filteredSelections.forEach((selection, index) => {
    const activity = selection.activity!;
    agendaItems.push({
      id: makeId(selection.adventureId, selection.requirement.id, "activity"),
      kind: "activity",
      title: activity.name,
      durationMinutes: activityDurations[index] ?? 10,
      description: `${activity.summary} ${buildSelectionReason(activity, request)}`.trim(),
      adventureId: selection.adventureId,
      adventureName: selection.adventureName,
      requirementIds: [selection.requirement.id],
      requirementNumber: selection.requirement.requirementNumber,
      requirementText: selection.requirement.text,
      activityId: activity.id,
      primaryRequirementId: selection.requirement.id,
      selectedActivityId: activity.id,
      alternativeActivityIds: allActivities.filter((candidate) => candidate.id !== activity.id).map((candidate) => candidate.id),
      selectionSource: selection.selectionSource,
      coverageStatus: selection.coverageStatus,
      addedFromSelection: selection.selectionSource === "added",
      editableNotes:
        activity.notes ||
        `Use the official activity card for ${activity.name} and adjust delivery for ${request.scoutCount} scouts. ${buildSelectionReason(activity, request)}`
    });

    if (index < filteredSelections.length - 1) {
      agendaItems.push({
        id: makeId(selection.adventureId, activity.id, "transition"),
        kind: "transition",
        title: "Transition",
        durationMinutes: 5,
        description: "Reset the room, move supplies, and connect the last activity to the next requirement.",
        adventureId: null,
        adventureName: null,
        requirementIds: [],
        requirementNumber: null,
        requirementText: null,
        activityId: null,
        primaryRequirementId: null,
        selectedActivityId: null,
        alternativeActivityIds: [],
        selectionSource: null,
        coverageStatus: null,
        addedFromSelection: false,
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
  return "This plan covers each selected requirement with an official linked activity. Confirm completion based on actual meeting delivery.";
}

function describeMeetingShape(request: MeetingRequest): string {
  return `${labelMeetingSpace(request.meetingSpace)} meeting, energy up to ${request.maxEnergyLevel}, supplies up to ${request.maxSupplyLevel}, prep up to ${request.maxPrepLevel}.`;
}

function buildPlan(
  den: DenProfile,
  rank: Rank,
  bundles: AdventureBundle[],
  request: MeetingRequest,
  overrides: Map<string, string> = new Map(),
  addedRequirementIds: Set<string> = new Set()
): MeetingPlan {
  const selectedBundles = bundles.filter((bundle) => request.adventureIds.includes(bundle.adventure.id));
  const allActivities = selectedBundles.flatMap((bundle) => bundle.activities);
  const selections = buildSelections(selectedBundles, request, overrides, addedRequirementIds);
  const coverage = buildCoverage(selections);
  const chosenActivities = selections.map((selection) => selection.activity).filter((activity): activity is Activity => Boolean(activity));

  const introMinutes = 10;
  const transitionCount = Math.max(chosenActivities.length - 1, 0);
  const transitionMinutes = transitionCount * 5;
  const closingMinutes = 10;
  const mainMinutes = Math.max(request.durationMinutes - introMinutes - transitionMinutes - closingMinutes, 15);
  const activityDurations = chunkedDuration(mainMinutes, Math.max(chosenActivities.length, 1), 10);

  const adventureNames = selectedBundles.map((bundle) => bundle.adventure.name);
  const agenda: MeetingAgendaItem[] = [
    {
      id: makeId(rank.id, "opening"),
      kind: "opening",
      title: "Opening Gathering",
      durationMinutes: 10,
      description: "Gather the den, review the meeting goal, and set expectations for behavior and participation.",
      adventureId: null,
      adventureName: null,
      requirementIds: [],
      requirementNumber: null,
      requirementText: null,
      activityId: null,
      primaryRequirementId: null,
      selectedActivityId: null,
      alternativeActivityIds: [],
      selectionSource: null,
      coverageStatus: null,
      addedFromSelection: false,
      editableNotes: `Welcome scouts and preview tonight's focus: ${adventureNames.join(", ")}.`
    },
    ...buildActivityAgendaItems(selections, allActivities, request, activityDurations)
  ];

  const uncovered = coverage.filter((item) => item.coverageStatus === "uncovered");
  if (uncovered.length > 0) {
    agenda.push({
      id: makeId(rank.id, "reflection"),
      kind: "reflection",
      title: "Leader Review Checkpoint",
      durationMinutes: 5,
      description: "Review any uncovered requirements before marking the selected adventures complete.",
      adventureId: null,
      adventureName: null,
      requirementIds: uncovered.map((item) => item.requirementId),
      requirementNumber: null,
      requirementText: null,
      activityId: null,
      primaryRequirementId: null,
      selectedActivityId: null,
      alternativeActivityIds: [],
      selectionSource: null,
      coverageStatus: null,
      addedFromSelection: false,
      editableNotes: uncovered
        .map((item) => `${item.adventureName} · Requirement ${item.requirementNumber}: ${item.requirementText}`)
        .join(" ")
    });
  }

  agenda.push({
    id: makeId(rank.id, "closing"),
    kind: "closing",
    title: "Closing Reflection",
    durationMinutes: 10,
    description: "Reflect on what scouts practiced, celebrate progress, and preview the next meeting.",
    adventureId: null,
    adventureName: null,
    requirementIds: [],
    requirementNumber: null,
    requirementText: null,
    activityId: null,
    primaryRequirementId: null,
    selectedActivityId: null,
    alternativeActivityIds: [],
    selectionSource: null,
    coverageStatus: null,
    addedFromSelection: false,
    editableNotes: "Invite each scout to share one thing they learned or enjoyed."
  });

  const prepNotes = [
    `Review the official adventure pages for ${adventureNames.join(", ")} before the meeting.`,
    `Confirm space and setup for a ${labelMeetingSpace(request.meetingSpace).toLowerCase()} meeting.`,
    `Use the official activity key as a guide: ${describeMeetingShape(request)}`,
    `Prepare materials for ${chosenActivities.length || 1} main activity block(s).`
  ];
  if (request.notes.trim()) {
    prepNotes.push(`Leader constraint: ${request.notes.trim()}`);
  }

  const materials = buildMaterials(chosenActivities);

  return {
    id: makeId(rank.id, new Date().toISOString()),
    denId: den.id,
    denName: den.name,
    rank,
    adventures: selectedBundles.map((bundle) => bundle.adventure),
    request,
    prepNotes,
    materials,
    agenda,
    coverage,
    activityLibrary: allActivities,
    leaderNotes: buildLeaderNotes(coverage),
    printSections: [
      "Opening and gathering",
      "Main activity flow",
      "Materials and prep",
      "Requirement coverage",
      "Leader notes and reminders"
    ],
    parentUpdate: {
      subject: `${den.name}: ${adventureNames.join(" + ")} meeting update`,
      message: [
        `Tonight we will be working on ${adventureNames.join(" and ")}.`,
        `This meeting is planned for ${labelMeetingSpace(request.meetingSpace).toLowerCase()}. Please dress accordingly.`,
        `We will focus on ${coverage.map((item) => `${item.adventureName} requirement ${item.requirementNumber}`).join(", ")}.`,
        `Materials to have ready: ${materials.join(", ")}.`,
        request.notes.trim() ? `Leader note for families: ${request.notes.trim()}` : "We'll share any follow-up after the meeting."
      ].join(" ")
    },
    generatedAt: new Date().toISOString()
  };
}

export function buildMeetingPlan(
  den: DenProfile,
  rank: Rank,
  bundles: AdventureBundle[],
  request: MeetingRequest
): MeetingPlan {
  return buildPlan(den, rank, bundles, request);
}

export function swapMeetingActivity(
  den: DenProfile,
  rank: Rank,
  bundles: AdventureBundle[],
  plan: MeetingPlan,
  agendaItemId: string,
  selectedActivityId: string
): MeetingPlan {
  const overrides = new Map<string, string>();
  for (const item of plan.agenda) {
    if (item.kind !== "activity" || !item.primaryRequirementId || !item.selectedActivityId) {
      continue;
    }
    if (item.selectionSource === "swapped" || item.selectionSource === "added") {
      overrides.set(item.primaryRequirementId, item.selectedActivityId);
    }
  }

  const agendaItem = plan.agenda.find((item) => item.id === agendaItemId && item.kind === "activity");
  if (!agendaItem?.primaryRequirementId) {
    return plan;
  }

  const selectedActivity = bundles
    .flatMap((bundle) => bundle.activities)
    .find((activity) => activity.id === selectedActivityId);

  if (!selectedActivity) {
    return plan;
  }

  const targetRequirementId = selectedActivity.requirementId;
  if (!targetRequirementId || targetRequirementId === agendaItem.primaryRequirementId) {
    overrides.set(agendaItem.primaryRequirementId, selectedActivityId);
    return buildPlan(den, rank, bundles, plan.request, overrides);
  }

  const existingRequirementIds = new Set(
    plan.agenda
      .filter((item) => item.kind === "activity" && item.primaryRequirementId)
      .map((item) => item.primaryRequirementId as string)
  );
  const nextRequirementIds = new Set(plan.request.requirementIds?.filter(Boolean) ?? []);
  nextRequirementIds.add(agendaItem.primaryRequirementId);
  nextRequirementIds.add(targetRequirementId);
  overrides.set(targetRequirementId, selectedActivityId);
  const addedRequirementIds = existingRequirementIds.has(targetRequirementId)
    ? new Set<string>()
    : new Set<string>([targetRequirementId]);

  return buildPlan(den, rank, bundles, {
    ...plan.request,
    requirementIds: Array.from(nextRequirementIds)
  }, overrides, addedRequirementIds);
}