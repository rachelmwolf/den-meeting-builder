import { useEffect, useMemo, useState, type ReactNode } from "react";
import { api } from "./api";
import { AdminConfigPage } from "./AdminConfig";
import { buildOpeningPromptEnvelope } from "../shared/openingPrompt.js";
import type {
  Activity,
  ActivityDirectionSection,
  Adventure,
  AdventureTrailData,
  ContentStatus,
  CoverageStatus,
  DenProfile,
  CoverageItem,
  MeetingSpace,
  MeetingAgendaItem,
  MeetingPlan,
  MeetingRequest,
  PackWorkspace,
  ParentUpdateTemplate,
  Requirement,
  TimeBudgetSummary
} from "../shared/types.js";
import {
  chunkedDuration,
  isNoSuppliesMaterialsList,
  labelMeetingSpace,
  newGuid
} from "../shared/utils.js";

const defaultRequest = {
  durationMinutes: 50,
  scoutCount: 6,
  meetingSpace: "indoor" as MeetingSpace,
  maxEnergyLevel: 3,
  maxSupplyLevel: 3,
  maxPrepLevel: 3,
  notes: "",
  meetingDate: ""
};

const steps = [
  { id: 1, title: "Basics" },
  { id: 2, title: "Adventure Trail" },
  { id: 3, title: "Requirements" },
  { id: 4, title: "Leader Packet" }
];

function coverageLabel(status: CoverageStatus | null): string | null {
  if (status === "automatic") return "Auto coverage";
  if (status === "leader-review") return "Leader review";
  if (status === "uncovered") return "Uncovered";
  return null;
}

function formatOfficialMetric(label: string, value: number | null): string {
  return value === null ? `${label} not listed` : `${label} ${value}/5`;
}

function shortenRequirementText(text: string | null, maxLength = 110): string {
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trimEnd()}...`;
}

function iconForMeetingSpace(space: Activity["meetingSpace"]): string {
  if (space === "indoor") return "🏠";
  if (space === "outing-with-travel") return "🧭";
  return "🌲";
}

type ActivityFitRequest = Pick<MeetingRequest, "meetingSpace" | "maxEnergyLevel" | "maxSupplyLevel" | "maxPrepLevel">;

function buildActivityKeyIndicators(activity: Activity): Array<{ icon: string; label: string }> {
  return [
    { icon: iconForMeetingSpace(activity.meetingSpace), label: labelMeetingSpace(activity.meetingSpace) },
    { icon: "⚡", label: formatOfficialMetric("Energy", activity.energyLevel) },
    { icon: "🧰", label: formatOfficialMetric("Supplies", activity.supplyLevel) },
    { icon: "⏳", label: formatOfficialMetric("Prep", activity.prepLevel) }
  ];
}

function renderDirectionSection(title: string, section: ActivityDirectionSection | null | undefined): ReactNode {
  if (!section || !section.steps.length) {
    return null;
  }

  return (
    <section className="activity-detail-section">
      <h5>{title}</h5>
      <ol className="activity-detail-steps">
        {section.steps.map((step, index) => (
          <li key={`${title}-${index}`} className="activity-detail-step">
            <div className="activity-detail-step-body">
              <div className="activity-detail-step-head">
                <span>{step.text}</span>
              </div>
              {step.bullets.length ? (
                <ul>
                  {step.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function renderPrintDirectionSteps(section: ActivityDirectionSection | null | undefined): ReactNode {
  if (!section || !section.steps.length) {
    return null;
  }

  return (
    <ol className="print-direction-steps">
      {section.steps.map((step, index) => (
        <li key={`${section.heading}-${index}`}>
          <p>{step.text}</p>
          {step.bullets.length ? (
            <ul>
              {step.bullets.map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>
          ) : null}
        </li>
      ))}
    </ol>
  );
}

function getPrintableDirectionSections(
  activity: Activity,
  stage: "before" | "during"
): Array<{ heading: string; section: ActivityDirectionSection }> {
  const sections: Array<{ heading: string; section: ActivityDirectionSection }> = [];
  if (stage === "before") {
    if (activity.directions?.before) {
      sections.push({ heading: "Before the Meeting", section: activity.directions.before });
    }
    return sections;
  }

  if (activity.directions?.during) {
    sections.push({ heading: "During the Meeting", section: activity.directions.during });
  }
  if (activity.directions?.atHomeOption) {
    sections.push({ heading: "At Home Option", section: activity.directions.atHomeOption });
  }
  if (activity.directions?.after) {
    sections.push({ heading: "After the Meeting", section: activity.directions.after });
  }
  return sections;
}

function scoreActivityFit(activity: Activity, request: ActivityFitRequest): number {
  const meetingSpaceScore =
    activity.meetingSpace === request.meetingSpace
      ? 0
      : activity.meetingSpace === "indoor-or-outdoor"
        ? 1
        : request.meetingSpace === "outing-with-travel" && activity.meetingSpace === "outdoor"
          ? 2
          : request.meetingSpace === "outdoor" && activity.meetingSpace === "outing-with-travel"
            ? 2
            : 3;
  const energyScore = activity.energyLevel === null ? 1 : Math.max(0, activity.energyLevel - request.maxEnergyLevel);
  const supplyScore = activity.supplyLevel === null ? 1 : Math.max(0, activity.supplyLevel - request.maxSupplyLevel);
  const prepScore = activity.prepLevel === null ? 1 : Math.max(0, activity.prepLevel - request.maxPrepLevel);
  return meetingSpaceScore * 100 + energyScore * 10 + supplyScore * 10 + prepScore;
}

function buildActivityFitSummary(activity: Activity, request: ActivityFitRequest): string {
  return [
    labelMeetingSpace(activity.meetingSpace),
    formatOfficialMetric("Energy", activity.energyLevel),
    formatOfficialMetric("Supplies", activity.supplyLevel),
    formatOfficialMetric("Prep", activity.prepLevel)
  ].join(" · ");
}

function splitActivityNotes(activity: Activity): string[] {
  return [
    activity.supplyNote ?? "",
    activity.previewDetails,
    ...(isNoSuppliesMaterialsList(activity.materials) ? [] : activity.materials ?? [])
  ]
    .flatMap((value) => value.split(/\n{2,}/))
    .map((part) => part.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function getActivityMaterials(activity: Activity): string[] {
  if (isNoSuppliesMaterialsList(activity.materials)) {
    return [];
  }
  if (Array.isArray(activity.materials) && activity.materials.length > 0) {
    return activity.materials;
  }
  const blocks = splitActivityNotes(activity);
  return blocks.filter((block) => /(\bbring\b|\bsuppl(y|ies)\b|\bmaterials?\b|\bhandbook\b|\bcrayons?\b|\bpencils?\b|\bmarkers?\b|\bcards?\b|\bpaper\b|\btape\b|\bcones?\b|\brope\b|\bwater bottle\b|\bwhistle\b|\bflashlight\b|\bsunscreen\b|\bhat\b|\bsunglasses\b|\btrail mix\b|\bfirst aid kit\b|\bgear\b)/i.test(block)).slice(0, 4);
}

function getActivityOverview(activity: Activity): string {
  const blocks = splitActivityNotes(activity);
  return blocks.find((block) => block !== activity.summary && !getActivityMaterials(activity).includes(block)) ?? activity.summary;
}

function getActivitySnapshot(activity: Activity): string {
  return activity.summary?.trim() || "Activity snapshot unavailable.";
}

function buildSuccessSummary(plan: MeetingPlan): string {
  const firstRequirement = plan.coverage[0];
  if (!firstRequirement) {
    return "The den stays engaged, finishes the selected activity, and leaves knowing what tonight was meant to teach.";
  }
  return `Scouts complete ${plan.coverage.length} requirement${plan.coverage.length === 1 ? "" : "s"} and leave with a clear record of what was covered.`;
}

function buildPlanMaterials(activities: Activity[]): string[] {
  const materials = new Set<string>();
  for (const activity of activities) {
    for (const hint of getActivityMaterials(activity)) {
      materials.add(hint);
    }
    if (/craft|make|draw|color|flag|doodle/i.test(`${activity.name} ${activity.summary} ${activity.previewDetails}`)) {
      materials.add("Basic craft supplies");
    }
    if (/game|circle|share|discussion/i.test(`${activity.name} ${activity.summary} ${activity.previewDetails}`)) {
      materials.add("Open floor or circle seating");
    }
    if (/outside|walk|outdoor|trail|relay/i.test(`${activity.name} ${activity.summary} ${activity.previewDetails}`)) {
      materials.add("Outdoor movement space or weather-appropriate alternate");
    }
  }
  materials.add("Printed requirement checklist");
  return Array.from(materials);
}

function buildPlanCoverage(
  plan: MeetingPlan,
  agenda: MeetingAgendaItem[],
  requirementLookup: Map<string, Requirement>,
  activityLookup: Map<string, Activity>
): CoverageItem[] {
  const requirementIds = new Set<string>(plan.request.requirementIds?.filter(Boolean) ?? []);
  for (const item of agenda) {
    if (item.kind === "activity" && item.primaryRequirementId) {
      requirementIds.add(item.primaryRequirementId);
    }
  }

  const currentCoverage = new Map(plan.coverage.map((item) => [item.requirementId, item] as const));

  return Array.from(requirementIds)
    .map((requirementId) => {
      const requirement = requirementLookup.get(requirementId);
      const fallback = currentCoverage.get(requirementId) ?? null;
      if (!requirement && fallback) {
        return fallback;
      }

      const relatedItems = agenda.filter(
        (item) => item.kind === "activity" && item.primaryRequirementId === requirementId && item.selectedActivityId
      );
      const matchedItem =
        relatedItems.find((item) => {
          const selectedActivity = item.selectedActivityId ? activityLookup.get(item.selectedActivityId) ?? null : null;
          return Boolean(selectedActivity && selectedActivity.requirementId === requirementId);
        }) ?? relatedItems[0] ?? null;
      const selectedActivity = matchedItem?.selectedActivityId ? activityLookup.get(matchedItem.selectedActivityId) ?? null : null;
      const coverageStatus: CoverageStatus = !selectedActivity
        ? "uncovered"
        : selectedActivity.requirementId === requirementId
          ? "automatic"
          : "leader-review";

      const adventure =
        plan.adventures.find((item) => item.id === requirement?.adventureId) ??
        (fallback ? plan.adventures.find((item) => item.id === fallback.adventureId) ?? null : null);

      return {
        adventureId: adventure?.id ?? requirement?.adventureId ?? fallback?.adventureId ?? "",
        adventureName: adventure?.name ?? fallback?.adventureName ?? "Adventure",
        requirementId,
        requirementNumber: requirement?.requirementNumber ?? fallback?.requirementNumber ?? 0,
        requirementText: requirement?.text ?? fallback?.requirementText ?? "",
        activityId: selectedActivity?.id ?? null,
        activityName: selectedActivity?.name ?? null,
        covered: coverageStatus !== "uncovered",
        coverageStatus,
        reason:
          coverageStatus === "automatic"
            ? `Covered with ${selectedActivity?.name}.`
            : coverageStatus === "leader-review"
              ? `Uses ${selectedActivity?.name}. Review the requirement before marking it complete because this activity was suggested for a different requirement or adventure.`
              : "No official linked activity was found. Leader review is needed before claiming completion."
      };
    })
    .filter((item): item is CoverageItem => Boolean(item.requirementId));
}

function buildPlanTimeBudget(plan: MeetingPlan, agenda: MeetingAgendaItem[], chosenActivities: Activity[]): TimeBudgetSummary {
  const fixedMinutes = 20;
  const minimumSuggestedMinutes = fixedMinutes + chosenActivities.length * 10;
  const recommendedMinutes = fixedMinutes + chosenActivities.reduce((total, activity) => total + (activity.durationMinutes ?? 15), 0);
  const plannedMinutes = agenda.reduce((total, item) => total + item.durationMinutes, 0);
  const delta = plannedMinutes - plan.request.durationMinutes;
  const warnings: string[] = [];

  if (plannedMinutes > plan.request.durationMinutes) {
    warnings.push(
      `This packet is scheduled for ${plannedMinutes} minutes, which is ${delta} minute${delta === 1 ? "" : "s"} over your ${plan.request.durationMinutes}-minute meeting.`
    );
  }
  if (minimumSuggestedMinutes > plan.request.durationMinutes) {
    warnings.push(
      `Even a compressed version of these requirements needs about ${minimumSuggestedMinutes} minutes. Consider splitting this meeting across two dates or trimming requirements.`
    );
  } else if (recommendedMinutes > plan.request.durationMinutes) {
    warnings.push(
      `The selected scope usually needs about ${recommendedMinutes} minutes with the official activities. This meeting can work, but it will be tight unless you simplify delivery.`
    );
  } else if (plan.request.durationMinutes - plannedMinutes <= 5) {
    warnings.push("This plan fits, but it leaves almost no extra buffer for late starts or den discussion.");
  }

  let status: TimeBudgetSummary["status"] = "fits";
  if (plannedMinutes > plan.request.durationMinutes || minimumSuggestedMinutes > plan.request.durationMinutes) {
    status = "over";
  } else if (recommendedMinutes > plan.request.durationMinutes || plan.request.durationMinutes - plannedMinutes <= 5) {
    status = "tight";
  }

  return {
    targetMinutes: plan.request.durationMinutes,
    plannedMinutes,
    minimumSuggestedMinutes,
    recommendedMinutes,
    activityCount: chosenActivities.length,
    status,
    warnings
  };
}

function buildPlanParentUpdate(plan: MeetingPlan, coverage: CoverageItem[], materials: string[]): ParentUpdateTemplate {
  const adventureNames = plan.adventures.map((adventure) => adventure.name);
  return {
    subject: `${plan.denName}: ${adventureNames.join(" + ")} meeting update`,
    message: [
      `Tonight we will be working on ${adventureNames.join(" and ")}.`,
      `This meeting is planned for ${labelMeetingSpace(plan.request.meetingSpace).toLowerCase()}. Please dress accordingly.`,
      `We will focus on ${coverage.map((item) => `${item.adventureName} requirement ${item.requirementNumber}`).join(", ")}.`,
      `Materials to have ready: ${materials.join(", ")}.`,
      plan.request.notes.trim() ? `Leader note for families: ${plan.request.notes.trim()}` : "We'll share any follow-up after the meeting."
    ].join(" ")
  };
}

function rebuildMeetingPlan(plan: MeetingPlan, agenda: MeetingAgendaItem[], requirementLookup: Map<string, Requirement>): MeetingPlan {
  const activityLookup = new Map(plan.activityLibrary.map((activity) => [activity.id, activity]));
  const selectedActivities = agenda
    .filter((item): item is MeetingAgendaItem & { selectedActivityId: string } => item.kind === "activity" && Boolean(item.selectedActivityId))
    .map((item) => activityLookup.get(item.selectedActivityId))
    .filter((activity): activity is Activity => Boolean(activity));

  let activityIndex = 0;
  const activityDurations = chunkedDuration(Math.max(plan.request.durationMinutes - 20, 15), Math.max(selectedActivities.length, 1), 10);
  const nextAgenda = agenda.map((item) => {
    if (item.kind !== "activity") {
      return item;
    }
    const durationMinutes = activityDurations[activityIndex++] ?? item.durationMinutes;
    return { ...item, durationMinutes };
  });

  const coverage = buildPlanCoverage(plan, nextAgenda, requirementLookup, activityLookup);
  const materials = buildPlanMaterials(selectedActivities);
  const timeBudget = buildPlanTimeBudget(plan, nextAgenda, selectedActivities);

  return {
    ...plan,
    agenda: nextAgenda,
    coverage,
    materials,
    leaderNotes:
      coverage.some((item) => item.coverageStatus === "leader-review")
        ? "One or more swapped activities support the meeting but need leader review before you mark the requirement complete."
        : coverage.some((item) => item.coverageStatus === "uncovered")
          ? "Do not mark uncovered requirements complete until you review the official requirement text and choose a supporting activity."
          : "This plan covers each selected requirement with an official linked activity. Confirm completion based on actual meeting delivery.",
    timeBudget,
    prepNotes: [
      `Review the official adventure pages for ${plan.adventures.map((adventure) => adventure.name).join(", ")} before the meeting.`,
      `Confirm space and setup for a ${labelMeetingSpace(plan.request.meetingSpace).toLowerCase()} meeting.`,
      `Use the official activity key as a guide: ${labelMeetingSpace(plan.request.meetingSpace)} meeting, energy up to ${plan.request.maxEnergyLevel}, supplies up to ${plan.request.maxSupplyLevel}, prep up to ${plan.request.maxPrepLevel}.`,
      `Prepare materials for ${selectedActivities.length || 1} main activity block(s).`,
      ...(plan.request.notes.trim() ? [`Leader constraint: ${plan.request.notes.trim()}`] : [])
    ],
    parentUpdate: buildPlanParentUpdate(plan, coverage, materials)
  };
}

function buildActivityAgendaItem(
  plan: MeetingPlan,
  activity: Activity,
  requirement: Requirement | null,
  source: "recommended" | "swapped" | "added"
): MeetingAgendaItem {
  const adventure = requirement
    ? plan.adventures.find((item) => item.id === requirement.adventureId) ?? null
    : plan.adventures.find((item) => item.id === activity.adventureId) ?? null;
  const requirementId = requirement?.id ?? activity.requirementId;
  return {
    id: newGuid(),
    kind: "activity",
    title: activity.name,
    durationMinutes: activity.durationMinutes ?? 10,
    description: activity.summary,
    adventureId: adventure?.id ?? activity.adventureId,
    adventureName: adventure?.name ?? requirement?.adventureId ?? "",
    requirementIds: requirementId ? [requirementId] : [],
    requirementNumber: requirement?.requirementNumber ?? null,
    requirementText: requirement?.text ?? null,
    activityId: activity.id,
    primaryRequirementId: requirementId,
    selectedActivityId: activity.id,
    alternativeActivityIds: plan.activityLibrary.filter((candidate) => candidate.id !== activity.id).map((candidate) => candidate.id),
    selectionSource: source,
    coverageStatus: requirementId ? "automatic" : null,
    addedFromSelection: source === "added",
    editableNotes: activity.summary
  };
}

function countActivitiesForRequirement(plan: MeetingPlan, requirementId: string): number {
  return plan.agenda.filter((item) => item.kind === "activity" && item.primaryRequirementId === requirementId).length;
}

function describeAgendaItemContext(item: MeetingAgendaItem): string | null {
  if (item.requirementNumber) {
    return item.adventureName ? `Requirement ${item.requirementNumber} · ${item.adventureName}` : `Requirement ${item.requirementNumber}`;
  }
  return item.adventureName ?? null;
}

export function App() {
  if (typeof window !== "undefined" && window.location.pathname.startsWith("/admin-config")) {
    return <AdminConfigPage />;
  }

  const [workspace, setWorkspace] = useState<PackWorkspace | null>(null);
  const [contentStatus, setContentStatus] = useState<ContentStatus | null>(null);
  const [dens, setDens] = useState<DenProfile[]>([]);
  const [selectedRankId, setSelectedRankId] = useState("");
  const [selectedDenId, setSelectedDenId] = useState("");
  const [trailData, setTrailData] = useState<AdventureTrailData | null>(null);
  const [trailError, setTrailError] = useState("");
  const [trailLoading, setTrailLoading] = useState(false);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [selectedAdventureIds, setSelectedAdventureIds] = useState<string[]>([]);
  const [selectedRequirementIds, setSelectedRequirementIds] = useState<string[]>([]);
  const [request, setRequest] = useState(defaultRequest);
  const [plan, setPlan] = useState<MeetingPlan | null>(null);
  const [openingMessage, setOpeningMessage] = useState("");
  const [openingLoading, setOpeningLoading] = useState(false);
  const [openingGenerated, setOpeningGenerated] = useState(false);
  const [activeAgendaItemId, setActiveAgendaItemId] = useState<string | null>(null);
  const [activePreviewActivityId, setActivePreviewActivityId] = useState<string | null>(null);
  const [drawerMode, setDrawerMode] = useState<"swap" | "add">("swap");
  const [currentStep, setCurrentStep] = useState(1);
  const [openElectiveBuckets, setOpenElectiveBuckets] = useState<Set<string>>(() => new Set());
  const [removalWarningAgendaItemId, setRemovalWarningAgendaItemId] = useState<string | null>(null);

  useEffect(() => {
    api.getWorkspace().then(setWorkspace);
    api.getContentStatus().then(setContentStatus).catch(() => setContentStatus(null));
    api.listDens().then((nextDens) => {
      setDens(nextDens);
    });
  }, []);

  useEffect(() => {
    const importedRanks = contentStatus?.importedRanks ?? [];
    if (!importedRanks.length && !dens.length) {
      return;
    }
    if (!selectedRankId) {
      setSelectedRankId(importedRanks[0]?.rankId ?? dens[0]?.rankId ?? "");
      return;
    }
    if (importedRanks.length && !importedRanks.some((rank) => rank.rankId === selectedRankId)) {
      setSelectedRankId(importedRanks[0].rankId);
    }
  }, [contentStatus, dens, selectedRankId]);

  const rankOptions = useMemo(() => {
    if (contentStatus?.importedRanks.length) {
      return contentStatus.importedRanks;
    }
    const rankNames = new Map<string, string>();
    for (const den of dens) {
      if (!rankNames.has(den.rankId)) {
        rankNames.set(den.rankId, den.rankId);
      }
    }
    return Array.from(rankNames.entries()).map(([rankId, rankName]) => ({
      rankId,
      rankName,
      refreshedAt: ""
    }));
  }, [contentStatus, dens]);

  const denOptions = useMemo(
    () => dens.filter((den) => !selectedRankId || den.rankId === selectedRankId),
    [dens, selectedRankId]
  );

  useEffect(() => {
    if (!denOptions.length) {
      return;
    }
    if (!selectedDenId || !denOptions.some((den) => den.id === selectedDenId)) {
      setSelectedDenId(denOptions[0].id);
    }
  }, [denOptions, selectedDenId]);

  useEffect(() => {
    if (!selectedDenId) {
      setTrailData(null);
      setTrailError("");
      setTrailLoading(false);
      return;
    }
    setTrailLoading(true);
    setTrailError("");
    api.getAdventureTrail(selectedDenId)
      .then((nextTrail) => {
        setTrailData(nextTrail);
        setSelectedAdventureIds((current) =>
          current.filter((id) => nextTrail.buckets.some((bucket) => bucket.adventures.some((adventure) => adventure.id === id)))
        );
      })
      .catch((error) => {
        setTrailData(null);
        setSelectedAdventureIds([]);
        setTrailError(error instanceof Error ? error.message : "Unable to load the Adventure Trail right now.");
      })
      .finally(() => {
        setTrailLoading(false);
      });
  }, [selectedDenId]);

  useEffect(() => {
    if (!selectedDenId || selectedAdventureIds.length === 0) {
      setRequirements([]);
      setSelectedRequirementIds([]);
      return;
    }
    api.listRequirements(selectedDenId, selectedAdventureIds).then((nextRequirements) => {
      setRequirements(nextRequirements);
      setSelectedRequirementIds((current) => {
        const allowed = new Set(nextRequirements.map((requirement) => requirement.id));
        const kept = current.filter((id) => allowed.has(id));
        return kept.length > 0 ? kept : nextRequirements.map((requirement) => requirement.id);
      });
    });
  }, [selectedAdventureIds, selectedDenId]);

  const selectedDen = denOptions.find((den) => den.id === selectedDenId) ?? dens.find((den) => den.id === selectedDenId) ?? denOptions[0] ?? dens[0] ?? null;
  const allTrailAdventures = useMemo(
    () => trailData?.buckets.flatMap((bucket) => bucket.adventures) ?? [],
    [trailData]
  );
  const requiredTrailBuckets = useMemo(
    () => trailData?.buckets.filter((bucket) => bucket.required) ?? [],
    [trailData]
  );
  const electiveTrailBuckets = useMemo(
    () => trailData?.buckets.filter((bucket) => !bucket.required) ?? [],
    [trailData]
  );
  const selectedAdventures = allTrailAdventures.filter((adventure) => selectedAdventureIds.includes(adventure.id));
  const selectedRank = rankOptions.find((rank) => rank.rankId === selectedRankId) ?? null;
  const packetTitleBase = selectedRank?.rankName ?? selectedDen?.name.replace(/\s+Imported Den$/, "") ?? "";
  const packetTitle = packetTitleBase ? `${packetTitleBase} Den` : "Den";
  const activityLookup = useMemo(
    () => new Map((plan?.activityLibrary ?? []).map((activity) => [activity.id, activity])),
    [plan]
  );
  const requirementLookup = useMemo(
    () => new Map(requirements.map((requirement) => [requirement.id, requirement])),
    [requirements]
  );
  const activeAgendaItem = useMemo(
    () => plan?.agenda.find((item) => item.id === activeAgendaItemId && item.kind === "activity") ?? null,
    [activeAgendaItemId, plan]
  );
  const openingAgendaItem = useMemo(
    () => plan?.agenda.find((item) => item.kind === "opening") ?? null,
    [plan]
  );
  const printableActivityItems = useMemo(
    () => {
      if (!plan) {
        return [];
      }
      return plan.agenda
        .filter((item): item is MeetingAgendaItem & { selectedActivityId: string } => item.kind === "activity" && Boolean(item.selectedActivityId))
        .map((agendaItem) => ({
          agendaItem,
          activity: activityLookup.get(agendaItem.selectedActivityId) ?? null
        }))
        .filter((entry): entry is { agendaItem: MeetingAgendaItem & { selectedActivityId: string }; activity: Activity } => Boolean(entry.activity));
    },
    [activityLookup, plan]
  );
  const packetReady = useMemo(
    () =>
      plan?.agenda.filter((item) => item.kind === "activity").every((item) => Boolean(item.selectedActivityId)) ?? false,
    [plan]
  );
  const previewOptions = useMemo(() => {
    if (!activeAgendaItem) return [] as Activity[];
    const selected = activeAgendaItem.selectedActivityId
      ? activityLookup.get(activeAgendaItem.selectedActivityId)
      : null;
    const alternatives = activeAgendaItem.alternativeActivityIds
      .map((activityId) => activityLookup.get(activityId))
      .filter((activity): activity is Activity => Boolean(activity));
    const deduped = new Map<string, Activity>();
    for (const activity of selected ? [selected, ...alternatives] : alternatives) {
      deduped.set(activity.id, activity);
    }
    return Array.from(deduped.values());
  }, [activeAgendaItem, activityLookup]);
  const previewOptionCards = useMemo(() => {
    if (!activeAgendaItem) return [];
    const chooserRequest: ActivityFitRequest = plan?.request
      ? {
          meetingSpace: plan.request.meetingSpace,
          maxEnergyLevel: plan.request.maxEnergyLevel,
          maxSupplyLevel: plan.request.maxSupplyLevel,
          maxPrepLevel: plan.request.maxPrepLevel
        }
      : {
          meetingSpace: request.meetingSpace,
          maxEnergyLevel: request.maxEnergyLevel,
          maxSupplyLevel: request.maxSupplyLevel,
          maxPrepLevel: request.maxPrepLevel
        };

    const primaryRequirementId = activeAgendaItem.primaryRequirementId;
    return previewOptions
      .map((activity) => {
        const requirement = activity.requirementId ? requirementLookup.get(activity.requirementId) ?? null : null;
        const isCurrent = activity.id === activeAgendaItem.selectedActivityId;
        const matchesPrimaryRequirement = Boolean(primaryRequirementId && activity.requirementId === primaryRequirementId);
        const sameAdventure = activity.adventureId === activeAgendaItem.adventureId;
        const section = matchesPrimaryRequirement ? "matching" : "other";
        let badge = "Other official activity";
        if (isCurrent) {
          badge = "Current choice";
        } else if (matchesPrimaryRequirement) {
          badge = "Requirement match";
        } else if (sameAdventure) {
          badge = "Same adventure";
        }

        return {
          activity,
          requirement,
          isCurrent,
          matchesPrimaryRequirement,
          sameAdventure,
          section,
          badge,
          fitScore: scoreActivityFit(activity, chooserRequest),
          fitSummary: buildActivityFitSummary(activity, chooserRequest)
        };
      })
      .sort((left, right) => {
        if (left.section !== right.section) {
          return left.section === "matching" ? -1 : 1;
        }
        if (left.isCurrent !== right.isCurrent) {
          return left.isCurrent ? -1 : 1;
        }
        if (left.fitScore !== right.fitScore) {
          return left.fitScore - right.fitScore;
        }
        return left.activity.name.localeCompare(right.activity.name);
      });
  }, [activeAgendaItem, plan?.request, previewOptions, requirementLookup, request]);
  const matchingOptionCards = previewOptionCards.filter((card) => card.section === "matching");
  const otherOptionCards = previewOptionCards.filter((card) => card.section === "other");
  const activePreviewActivity =
    (activePreviewActivityId ? activityLookup.get(activePreviewActivityId) : null) ?? previewOptions[0] ?? null;

  function invalidateGeneratedPlan(): void {
    setPlan(null);
    setOpeningMessage("");
    setOpeningLoading(false);
    setOpeningGenerated(false);
    setActiveAgendaItemId(null);
    setActivePreviewActivityId(null);
    setDrawerMode("swap");
    setRemovalWarningAgendaItemId(null);
  }

  function markPacketDirty(): void {
    setOpeningMessage("");
    setOpeningLoading(false);
    setOpeningGenerated(false);
    setRemovalWarningAgendaItemId(null);
  }

  function removeAgendaItem(itemId: string): void {
    if (!plan) return;
    const nextAgenda = plan.agenda.filter((agendaItem) => agendaItem.id !== itemId);
    applyAgendaUpdate(nextAgenda, null);
    setActivePreviewActivityId(null);
  }

  function toggleAdventure(adventureId: string): void {
    setSelectedAdventureIds((current) => {
      const next = current.includes(adventureId)
        ? current.filter((id) => id !== adventureId)
        : [...current, adventureId];
      return next;
    });
    invalidateGeneratedPlan();
  }

  function toggleRequirement(requirementId: string): void {
    setSelectedRequirementIds((current) => {
      const next = current.includes(requirementId)
        ? current.filter((id) => id !== requirementId)
        : [...current, requirementId];
      return next;
    });
    invalidateGeneratedPlan();
  }

  async function handleGenerate(): Promise<void> {
    if (!selectedDen || selectedAdventureIds.length === 0) return;
    const nextPlan = await api.generatePlan({
      denId: selectedDen.id,
      rankId: selectedDen.rankId,
      adventureIds: selectedAdventureIds,
      requirementIds: selectedRequirementIds,
      durationMinutes: request.durationMinutes,
      scoutCount: request.scoutCount,
      meetingSpace: request.meetingSpace,
      maxEnergyLevel: request.maxEnergyLevel,
      maxSupplyLevel: request.maxSupplyLevel,
      maxPrepLevel: request.maxPrepLevel,
      notes: request.notes,
      meetingDate: request.meetingDate || null
    });
    setPlan(nextPlan);
    setCurrentStep(4);
    setOpeningGenerated(false);
  }

  async function handleGenerateOpening(): Promise<void> {
    if (!plan || !openingAgendaItem) return;
    if (!packetReady || openingGenerated) {
      return;
    }
    setOpeningLoading(true);
    setOpeningMessage("");
    try {
      const { openingText } = await api.generateOpening(buildOpeningPromptEnvelope(plan));
      updateAgendaItem(openingAgendaItem.id, { editableNotes: openingText });
      setOpeningMessage("Opening generated.");
      setOpeningGenerated(true);
    } catch (error) {
      setOpeningMessage(error instanceof Error ? error.message : "Unable to generate opening right now.");
    } finally {
      setOpeningLoading(false);
    }
  }

  function updateAgendaItem(itemId: string, patch: Partial<MeetingAgendaItem>): void {
    setPlan((current) =>
      current
        ? { ...current, agenda: current.agenda.map((item) => (item.id === itemId ? { ...item, ...patch } : item)) }
        : current
    );
  }

  function applyAgendaUpdate(nextAgenda: MeetingAgendaItem[], nextActiveAgendaItemId: string | null = activeAgendaItemId): void {
    setPlan((current) => {
      if (!current) {
        return current;
      }
      const nextPlan = rebuildMeetingPlan(current, nextAgenda, requirementLookup);
      return nextPlan;
    });
    setActiveAgendaItemId(nextActiveAgendaItemId);
    setOpeningGenerated(false);
    setOpeningMessage("");
    setRemovalWarningAgendaItemId(null);
  }

  function handleUseActivity(selectedActivityId: string): void {
    if (!plan || !activeAgendaItem) return;
    const selectedActivity = activityLookup.get(selectedActivityId);
    if (!selectedActivity) return;
    const requirement =
      selectedActivity.requirementId ? requirementLookup.get(selectedActivity.requirementId) ?? null : null;
    const currentIndex = plan.agenda.findIndex((item) => item.id === activeAgendaItem.id);
    if (currentIndex < 0) {
      return;
    }
    const nextAgenda = [...plan.agenda];

    if (
      drawerMode === "swap" &&
      activeAgendaItem.primaryRequirementId &&
      selectedActivity.requirementId === activeAgendaItem.primaryRequirementId
    ) {
      nextAgenda[currentIndex] = {
        ...buildActivityAgendaItem(plan, selectedActivity, requirement ?? null, activeAgendaItem.selectionSource ?? "swapped"),
        id: activeAgendaItem.id,
        durationMinutes: activeAgendaItem.durationMinutes,
        selectionSource: activeAgendaItem.selectionSource ?? "swapped",
        addedFromSelection: activeAgendaItem.addedFromSelection
      };
      applyAgendaUpdate(nextAgenda, activeAgendaItem.id);
      setActivePreviewActivityId(selectedActivityId);
      return;
    }

    const nextAgendaItem = buildActivityAgendaItem(plan, selectedActivity, requirement ?? null, "added");
    const insertIndex = nextAgenda.findIndex((item) => item.kind === "closing");
    if (insertIndex >= 0) {
      nextAgenda.splice(insertIndex, 0, nextAgendaItem);
    } else {
      nextAgenda.push(nextAgendaItem);
    }
    applyAgendaUpdate(nextAgenda, nextAgendaItem.id);
    setActivePreviewActivityId(selectedActivityId);
  }

  function openAddActivityDrawer(): void {
    if (!plan) return;
    const lastActivity = [...plan.agenda].reverse().find((item) => item.kind === "activity");
    if (!lastActivity?.selectedActivityId) return;
    setDrawerMode("add");
    setActiveAgendaItemId(lastActivity.id);
    setActivePreviewActivityId(lastActivity.selectedActivityId);
    setRemovalWarningAgendaItemId(null);
  }

  const stepReady = {
    1: Boolean(selectedRankId),
    2: selectedAdventureIds.length > 0,
    3: selectedRequirementIds.length > 0,
    4: Boolean(plan)
  };

  function renderCapControl(
    label: string,
    value: number,
    helper: string,
    onChange: (value: number) => void
  ) {
    return (
      <div className="cap-control">
        <div className="cap-control-head">
          <span>{label}</span>
          <span className="tooltip-wrap">
            <button type="button" className="control-help" aria-label={`${label} help`}>
              i
            </button>
            <span className="tooltip-popover" role="tooltip">
              {helper}
            </span>
          </span>
          <strong>{value}/5</strong>
        </div>
        <input
          type="range"
          min={1}
          max={5}
          step={1}
          value={value}
          onChange={(event) => {
            onChange(Number(event.target.value));
            invalidateGeneratedPlan();
          }}
        />
        <span className="subtle-line cap-limit">Maximum allowed: {value}/5</span>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">{workspace?.name ?? "Pack Workspace"}</p>
          <h1>Den Leader Planning Workspace</h1>
          <p className="hero-copy">
            Move through a simple den-planning flow, use the Adventure Trail to choose what matters tonight, then customize the final packet without carrying the whole system on one screen.
          </p>
        </div>
      </section>

      <main className="wizard-layout">
        <section className="panel panel-large">
          <div className="stepper">
            {steps.map((step) => (
              <button
                key={step.id}
                className={`step-pill ${currentStep === step.id ? "step-pill-active" : ""}`}
                disabled={step.id > currentStep && !stepReady[currentStep as 1 | 2 | 3 | 4]}
                onClick={() => setCurrentStep(step.id)}
              >
                <span>{step.id}</span>
                {step.title}
              </button>
            ))}
          </div>
          <p className="stepper-hint">Complete each step to unlock the next one.</p>

          {currentStep === 1 ? (
            <div className="step-panel">
              <div className="panel-header">
                <div>
                  <h2>Step 1 · Den and Meeting Basics</h2>
                  <p>Set the den, meeting date, and planning limits.</p>
                </div>
              </div>

              <div className="setup-sections">
                <section className="setup-section">
                  <div className="setup-section-head">
                    <span className="section-eyebrow">Meeting Basics</span>
                    <p>Choose the rank and date for tonight’s meeting.</p>
                  </div>
                  <div className="setup-grid setup-grid-basics">
                    <label className="setup-field setup-field-rank">
                      Rank
                      <select
                        className="basic-select"
                        value={selectedRankId}
                        onChange={(event) => {
                          const nextRankId = event.target.value;
                          setSelectedRankId(nextRankId);
                          const nextDen = dens.find((den) => den.rankId === nextRankId) ?? dens[0] ?? null;
                          setSelectedDenId(nextDen?.id ?? "");
                          setSelectedAdventureIds([]);
                          setSelectedRequirementIds([]);
                          invalidateGeneratedPlan();
                        }}
                      >
                        {rankOptions.map((rank) => (
                          <option key={rank.rankId} value={rank.rankId}>
                            {rank.rankName}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="setup-field setup-field-date">
                      Meeting Date
                      <input
                        type="date"
                        value={request.meetingDate}
                        onChange={(event) => {
                          setRequest((current) => ({ ...current, meetingDate: event.target.value }));
                          invalidateGeneratedPlan();
                        }}
                      />
                    </label>
                  </div>
                </section>

                <section className="setup-section">
                  <div className="setup-section-head">
                    <span className="section-eyebrow">Activity Constraints</span>
                    <p>Soft preferences. The planner looks for the best-fit official activity.</p>
                  </div>
                  <div className="setup-grid setup-grid-constraints">
                    <label className="setup-field setup-field-space">
                      <span className="setup-field-head">
                        <span>Meeting Space</span>
                        <span className="tooltip-wrap">
                          <button type="button" className="control-help" aria-label="Meeting space help">
                            i
                          </button>
                          <span className="tooltip-popover" role="tooltip">
                            Indoor, outing with travel, or outdoor. Use the most realistic setting for tonight&apos;s meeting.
                          </span>
                        </span>
                      </span>
                      <select
                        className="basic-select"
                        aria-label="Meeting Space"
                        value={request.meetingSpace}
                        onChange={(event) => {
                          setRequest((current) => ({ ...current, meetingSpace: event.target.value as MeetingSpace }));
                          invalidateGeneratedPlan();
                        }}
                      >
                        <option value="indoor">Indoor</option>
                        <option value="outing-with-travel">Outing with travel</option>
                        <option value="outdoor">Outdoor</option>
                      </select>
                    </label>

                    <div className="setup-caps">
                      {renderCapControl("Max Cub Scout Energy", request.maxEnergyLevel, "Energy: 1 Very Low Energy - talking, listening, sharing, and sitting. 5 Very High Energy - walking, moving, long distances, or running.", (value) =>
                        setRequest((current) => ({ ...current, maxEnergyLevel: value }))
                      )}
                      {renderCapControl("Max Supply List", request.maxSupplyLevel, "Supply List: 1 None - no supplies are needed. 5 Custom - items for the activity are custom or uncommon.", (value) =>
                        setRequest((current) => ({ ...current, maxSupplyLevel: value }))
                      )}
                      {renderCapControl("Max Prep Time", request.maxPrepLevel, "Prep Time: 1 Minimal prep. 5 Something needs to be done a week or more ahead of time.", (value) =>
                        setRequest((current) => ({ ...current, maxPrepLevel: value }))
                      )}
                    </div>
                  </div>
                </section>
              </div>

              <div className="wizard-actions">
                <button className="primary-button" disabled={!selectedRankId} onClick={() => setCurrentStep(2)}>
                  Continue to Adventure Trail
                </button>
              </div>
            </div>
          ) : null}

          {currentStep === 2 ? (
            <div className="step-panel">
              <div className="panel-header">
                <div>
                  <h2>Step 2 · Choose Adventures From the Trail</h2>
                  <p>Choose the adventures that belong in tonight’s plan.</p>
                </div>
              </div>

              <section className="trail-section">
                {trailLoading ? <div className="empty-state">Loading Adventure Trail...</div> : null}
                {!trailLoading && trailError ? <div className="empty-state">Adventure Trail could not be loaded: {trailError}</div> : null}
                {!trailLoading && !trailError
                  ? (
                    <>
                      <div className="trail-section-head">
                        <div>
                          <span className="section-eyebrow">Required Trail</span>
                        </div>
                      </div>
                      <div className="trail-grid trail-grid-required">
                        {requiredTrailBuckets.map((bucket) => {
                  const content = (
                    <div className="trail-options">
                      {bucket.adventures.length ? (
                        bucket.adventures.map((adventure) => (
                          <label key={adventure.id} className={`trail-option ${selectedAdventureIds.includes(adventure.id) ? "trail-option-active" : ""}`}>
                            <input
                              type="checkbox"
                              checked={selectedAdventureIds.includes(adventure.id)}
                              onChange={() => toggleAdventure(adventure.id)}
                            />
                            <div>
                              <strong>{adventure.name}</strong>
                            </div>
                          </label>
                        ))
                      ) : (
                        <div className="empty-state compact-empty">No adventures imported for this bucket yet.</div>
                      )}
                    </div>
                  );
                  return (
                    <article key={bucket.key} className="trail-card">
                      <div className="trail-card-header">
                        <div>
                          <h3>{bucket.label}</h3>
                        </div>
                      </div>
                      {content}
                    </article>
                          );
                        })}
                      </div>

                      <div className="trail-section-head trail-section-head-electives">
                        <div>
                          <span className="section-eyebrow">Elective Trail</span>
                        </div>
                      </div>
                      <div className="trail-grid trail-grid-electives">
                        {electiveTrailBuckets.map((bucket) => {
                          const content = (
                            <div className="trail-options">
                              {bucket.adventures.length ? (
                                bucket.adventures.map((adventure) => (
                                  <label key={adventure.id} className={`trail-option ${selectedAdventureIds.includes(adventure.id) ? "trail-option-active" : ""}`}>
                                    <input
                                      type="checkbox"
                                      checked={selectedAdventureIds.includes(adventure.id)}
                                      onChange={() => toggleAdventure(adventure.id)}
                                    />
                            <div>
                              <strong>{adventure.name}</strong>
                            </div>
                          </label>
                                ))
                              ) : (
                                <div className="empty-state compact-empty">No adventures imported for this bucket yet.</div>
                              )}
                            </div>
                          );
                          return (
                            <article key={bucket.key} className="trail-card trail-card-elective">
                              {content}
                            </article>
                          );
                        })}
                      </div>
                    </>
                  )
                  : null}
              </section>

              <div className="wizard-actions">
                <button className="secondary-button" onClick={() => setCurrentStep(1)}>
                  Back
                </button>
                <button className="primary-button" disabled={selectedAdventureIds.length === 0} onClick={() => setCurrentStep(3)}>
                  Refine Requirements
                </button>
              </div>
            </div>
          ) : null}

          {currentStep === 3 ? (
            <div className="step-panel">
              <div className="panel-header">
                <div>
                  <h2>Step 3 · Narrow Requirements</h2>
                  <p>Refine the requirement set before generating the packet.</p>
                </div>
              </div>

              <div className="callout">
                <strong>Selected adventures</strong>
                <p>{selectedAdventures.map((adventure) => adventure.name).join(", ") || "None selected yet."}</p>
              </div>

              <div className="requirements-grid">
                {selectedAdventures.map((adventure) => {
                  const adventureRequirements = requirements.filter((requirement) => requirement.adventureId === adventure.id);
                  const adventureRequirementIds = adventureRequirements.map((requirement) => requirement.id);
                  return (
                    <article key={adventure.id} className="list-block">
                      <div className="list-block-head">
                        <h3>{adventure.name}</h3>
                        <div className="wizard-inline-actions">
                          <button
                            className="text-button"
                            onClick={() =>
                              setSelectedRequirementIds((current) => Array.from(new Set([...current, ...adventureRequirementIds])))
                            }
                          >
                            Select all
                          </button>
                          <button
                            className="text-button"
                            onClick={() =>
                              setSelectedRequirementIds((current) => current.filter((id) => !adventureRequirementIds.includes(id)))
                            }
                          >
                            Clear all
                          </button>
                        </div>
                      </div>
                      {adventureRequirements.map((requirement) => (
                        <label key={requirement.id} className="checkbox-row">
                          <input
                            type="checkbox"
                            checked={selectedRequirementIds.includes(requirement.id)}
                            onChange={() => toggleRequirement(requirement.id)}
                          />
                          Requirement {requirement.requirementNumber}: {requirement.text}
                        </label>
                      ))}
                    </article>
                  );
                })}
              </div>

              <div className="wizard-actions">
                <button className="secondary-button" onClick={() => setCurrentStep(2)}>
                  Back
                </button>
                <button className="primary-button" disabled={selectedRequirementIds.length === 0} onClick={() => void handleGenerate()}>
                  Generate Leader Packet
                </button>
              </div>
            </div>
          ) : null}

          {currentStep === 4 ? (
            <div className="step-panel">
              <div className="panel-header">
                <div>
                  <h2>Step 4 · Leader Packet</h2>
                  <p>Review the packet, then print when the plan feels right.</p>
                </div>
                <div className="packet-header-actions">
                  <button className="primary-button" onClick={() => window.print()}>
                    Print Packet
                  </button>
                </div>
              </div>

              {!plan ? (
                <div className="empty-state">
                  <p>Generate the packet from Step 3. Any change to basics, adventures, or requirements will clear the current packet so you can rebuild it cleanly.</p>
                </div>
              ) : (
                <div className="packet-workbench">
                  <section className="packet-canvas">
                    <article className="packet-page">
                      <header className="packet-page-header">
                        <div>
                          <span className="section-eyebrow">Meeting Plan</span>
                          <h2>{packetTitle}</h2>
                          <p>
                            {plan.request.meetingDate || "Date TBD"} · {plan.adventures.map((adventure) => adventure.name).join(", ")}
                          </p>
                        </div>
                      </header>

                      <section className="packet-block">
                        <h3>Meeting Flow</h3>
                        <div className="packet-activity-list">
                          {plan.agenda.map((item) =>
                            item.kind === "opening" && openingAgendaItem ? (
                              <article key={`packet-opening-${item.id}`} className="packet-activity-row packet-activity-row-card packet-opening-row">
                                <div className="packet-activity-title-block">
                                  <div className="packet-activity-head">
                                    <strong>{item.title}</strong>
                                    {describeAgendaItemContext(item) ? <p>{describeAgendaItemContext(item)}</p> : null}
                                  </div>
                                </div>
                                <textarea
                                  className="packet-opening-textarea"
                                  aria-label="Opening gathering script"
                                  value={openingAgendaItem.editableNotes}
                                  onChange={(event) =>
                                    updateAgendaItem(openingAgendaItem.id, { editableNotes: event.target.value })
                                  }
                                  rows={8}
                                />
                                <p className="subtle-line">
                                  Generate or edit the opening here. It stays editable after generation and is saved with the packet.
                                </p>
                                {openingMessage ? <p className="save-message">{openingMessage}</p> : null}
                                <div className="packet-activity-actions packet-opening-actions">
                                  <button
                                    type="button"
                                    className="packet-activity-explore"
                                    disabled={openingLoading || openingGenerated || !packetReady}
                                    onClick={() => void handleGenerateOpening()}
                                  >
                                    {openingLoading ? "Generating..." : openingGenerated ? "Opening generated" : "Generate opening"}
                                  </button>
                                </div>
                              </article>
                            ) : item.kind === "activity" && item.selectedActivityId && activityLookup.get(item.selectedActivityId) ? (() => {
                              const selectedActivity = activityLookup.get(item.selectedActivityId) as Activity;
                              const keyIndicators = buildActivityKeyIndicators(selectedActivity);
                              const summary = shortenRequirementText(selectedActivity.summary, 180);
                              const showRemovalWarning = removalWarningAgendaItemId === item.id;
                              return (
                                <article key={`packet-activity-${item.id}`} className="packet-activity-row packet-activity-row-card">
                                  <button
                                    type="button"
                                    className="packet-activity-row-main"
                                    onClick={() => {
                                      setActiveAgendaItemId(item.id);
                                      setActivePreviewActivityId(item.selectedActivityId);
                                    }}
                                  >
                                    <div className="packet-activity-title-block">
                                      <div className="packet-activity-head">
                                        <strong>{item.title}</strong>
                                        {describeAgendaItemContext(item) ? <p>{describeAgendaItemContext(item)}</p> : null}
                                      </div>
                                      <div className="packet-activity-section">
                                        <span className="packet-activity-label">Activity Key</span>
                                        <div className="packet-activity-key-grid" aria-hidden="true">
                                          {keyIndicators.map((indicator) => (
                                            <span key={`${item.id}-${indicator.label}`} className="packet-activity-key">
                                              <span className="option-key-icon">{indicator.icon}</span>
                                              <span>{indicator.label}</span>
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                      <div className="packet-activity-section">
                                        <span className="packet-activity-label">Summary</span>
                                        <p>{summary}</p>
                                      </div>
                                    </div>
                                  </button>
                                  <div className="packet-activity-actions">
                                    {showRemovalWarning ? (
                                      <div className="review-banner review-banner-warning packet-remove-warning">
                                        Removing this activity leaves Requirement{" "}
                                        {item.primaryRequirementId
                                          ? requirementLookup.get(item.primaryRequirementId)?.requirementNumber ?? "?"
                                          : "?"}{" "}
                                        uncovered.
                                        <div className="review-banner-actions">
                                          <button className="text-button" onClick={() => setRemovalWarningAgendaItemId(null)}>
                                            Keep activity
                                          </button>
                                          <button
                                            className="text-button"
                                            onClick={() => {
                                              removeAgendaItem(item.id);
                                            }}
                                          >
                                            Remove anyway
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      <>
                                        <button
                                          type="button"
                                          className="packet-activity-explore packet-activity-explore-primary"
                                          onClick={() => {
                                            setDrawerMode("swap");
                                            setActiveAgendaItemId(item.id);
                                            setActivePreviewActivityId(item.selectedActivityId);
                                          }}
                                        >
                                          Explore or Swap Activity
                                        </button>
                                        <button
                                          type="button"
                                          className="packet-activity-remove packet-activity-remove-secondary"
                                          onClick={(event) => {
                                            event.stopPropagation();
                                            if (!item.primaryRequirementId) return;
                                            const sameRequirementCount = countActivitiesForRequirement(plan, item.primaryRequirementId);
                                            if (sameRequirementCount <= 1) {
                                              setRemovalWarningAgendaItemId(item.id);
                                              return;
                                            }
                                            const nextAgenda = plan.agenda.filter((agendaItem) => agendaItem.id !== item.id);
                                            applyAgendaUpdate(nextAgenda, null);
                                            setActivePreviewActivityId(null);
                                          }}
                                        >
                                          Remove activity
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </article>
                              );
                            })() : (
                              <div key={`packet-activity-${item.id}`} className="packet-activity-row">
                                <div className="packet-activity-head">
                                  <strong>{item.title}</strong>
                                  {describeAgendaItemContext(item) ? <p>{describeAgendaItemContext(item)}</p> : null}
                                </div>
                                <p>{shortenRequirementText(item.editableNotes || item.description, 120)}</p>
                              </div>
                            )
                          )}
                          <article className="packet-activity-row packet-activity-row-add">
                            <button
                              type="button"
                              className="packet-activity-row-main packet-activity-row-main-add"
                              onClick={openAddActivityDrawer}
                            >
                              <div className="packet-activity-head packet-activity-head-add">
                                <strong>+ Add another activity</strong>
                                <p>Open the activity picker and append another official activity to the packet.</p>
                              </div>
                              <span className="packet-activity-explore packet-activity-explore-add">Add activity</span>
                            </button>
                          </article>
                        </div>
                      </section>
                    </article>
                  </section>

                  <section className="print-sheet print-only">
                    <article className="print-stage print-stage-before">
                      <header className="print-stage-header">
                        <div>
                          <p className="section-eyebrow">Print Packet</p>
                          <h2>Before the Meeting</h2>
                          <p>Stage materials and review setup notes before the meeting.</p>
                        </div>
                        <div className="print-stage-meta">
                          <strong>{packetTitle}</strong>
                          <span>{plan.request.meetingDate || "Date TBD"}</span>
                        </div>
                      </header>

                      <section className="print-section">
                        <h3>Materials</h3>
                        <div className="print-stage-list">
                          {printableActivityItems.map(({ agendaItem, activity }) => (
                            <article key={`print-before-materials-${agendaItem.id}`} className="print-stage-card print-stage-card-compact">
                              <div className="print-stage-card-head">
                                <strong>{agendaItem.title}</strong>
                              </div>
                              {getActivityMaterials(activity).length ? (
                                <ul className="print-checklist">
                                  {getActivityMaterials(activity).map((material) => (
                                    <li key={`before-${agendaItem.id}-${material}`}>
                                      <span className="print-checkbox" aria-hidden="true" />
                                      {material}
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="print-empty-note">No materials are listed for this activity.</p>
                              )}
                            </article>
                          ))}
                        </div>
                      </section>

                      <section className="print-section">
                        <h3>Activities</h3>
                        <div className="print-stage-list">
                          {printableActivityItems.map(({ agendaItem, activity }) => (
                            <article key={`print-before-${agendaItem.id}`} className="print-stage-card print-stage-card-compact">
                              <div className="print-stage-card-head">
                                <div>
                                  <strong>{agendaItem.title}</strong>
                                </div>
                              </div>
                              <section className="print-stage-subsection">
                                <h4>Before the Meeting</h4>
                                {renderPrintDirectionSteps(activity.directions?.before) ?? (
                                  <p className="print-empty-note">No before-the-meeting directions are listed for this activity.</p>
                                )}
                              </section>
                            </article>
                          ))}
                        </div>
                      </section>
                    </article>

                    <article className="print-stage print-stage-during">
                      <header className="print-stage-header">
                        <div>
                          <p className="section-eyebrow">Print Packet</p>
                          <h2>During the Meeting</h2>
                          <p>Keep the opening script and activity details close at hand.</p>
                        </div>
                        <div className="print-stage-meta">
                          <strong>{packetTitle}</strong>
                          <span>{plan.adventures.map((adventure) => adventure.name).join(", ")}</span>
                        </div>
                      </header>

                      <section className="print-section">
                        <h3>Opening Script</h3>
                        {openingAgendaItem ? (
                          <div className="print-opening-script">{openingAgendaItem.editableNotes}</div>
                        ) : (
                          <p className="print-empty-note">No opening script is available yet.</p>
                        )}
                      </section>

                      <section className="print-section">
                        <h3>Activities</h3>
                        <div className="print-stage-list">
                          {printableActivityItems.map(({ agendaItem, activity }) => (
                            <article key={`print-during-${agendaItem.id}`} className="print-stage-card">
                              <div className="print-stage-card-head">
                                <div>
                                  <strong>{agendaItem.title}</strong>
                                  {agendaItem.adventureName ? <p>Adventure · {agendaItem.adventureName}</p> : null}
                                  {agendaItem.requirementText ? (
                                    <p className="print-stage-card-context">
                                      Requirement {agendaItem.requirementNumber ?? "?"} · {agendaItem.requirementText}
                                    </p>
                                  ) : null}
                                </div>
                                <div className="print-stage-card-snapshot">
                                  <p className="print-stage-card-label">Snapshot</p>
                                  <p>{shortenRequirementText(agendaItem.requirementText || agendaItem.description, 180)}</p>
                                </div>
                              </div>
                              {renderPrintDirectionSteps(activity.directions?.during) ?? (
                                <p className="print-empty-note">No during-the-meeting directions are listed for this activity.</p>
                              )}
                            </article>
                          ))}
                        </div>
                      </section>
                    </article>

                    <article className="print-stage print-stage-after">
                      <header className="print-stage-header">
                        <div>
                          <p className="section-eyebrow">Print Packet</p>
                          <h2>After the Meeting</h2>
                          <p>Reset the space and capture quick reflections after the meeting.</p>
                        </div>
                        <div className="print-stage-meta">
                          <strong>{packetTitle}</strong>
                          <span>Cleanup and reflection</span>
                        </div>
                      </header>

                      <section className="print-section">
                        <h3>Clean Space Checklist</h3>
                        <ul className="print-checklist">
                          <li><span className="print-checkbox" aria-hidden="true" /> Floors tidy, with no paper scraps, crumbs, or outside debris</li>
                          <li><span className="print-checkbox" aria-hidden="true" /> Tables returned and arranged as they were found</li>
                          <li><span className="print-checkbox" aria-hidden="true" /> Chairs stacked or pushed in as needed</li>
                          <li><span className="print-checkbox" aria-hidden="true" /> Paint, marker lines, pencil drawings, and other marks removed from surfaces</li>
                          <li><span className="print-checkbox" aria-hidden="true" /> Trash, recycling, and used supplies collected</li>
                          <li><span className="print-checkbox" aria-hidden="true" /> Shared tools, markers, and activity materials returned to storage</li>
                          <li><span className="print-checkbox" aria-hidden="true" /> Lost-and-found sweep completed</li>
                          <li><span className="print-checkbox" aria-hidden="true" /> Lights, doors, and any borrowed spaces reset</li>
                        </ul>
                      </section>

                      <section className="print-section">
                        <h3>Quick Reflection</h3>
                        <div className="print-reflect-grid">
                          <div className="print-reflect-block">
                            <strong>What was completed?</strong>
                            <div className="print-reflect-box" />
                          </div>
                          <div className="print-reflect-block">
                            <strong>Notes on per-scout participation</strong>
                            <div className="print-reflect-box" />
                          </div>
                          <div className="print-reflect-block">
                            <strong>Other reflection points</strong>
                            <div className="print-reflect-box print-reflect-box-tall" />
                          </div>
                        </div>
                      </section>
                    </article>
                  </section>

                  <div className="wizard-actions wizard-actions-single">
                    <button className="secondary-button" onClick={() => setCurrentStep(3)}>
                      Back
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </section>

      </main>

      {activeAgendaItem && activePreviewActivity ? (
        <div className="drawer-backdrop" role="dialog" aria-modal="true">
          <div className="drawer">
            <div className="drawer-header">
              <div>
                <p className="eyebrow">Activity Options</p>
                <h2>{activeAgendaItem.title}</h2>
                {activeAgendaItem.primaryRequirementId ? (
                  <p className="drawer-subtitle">
                    Requirement {requirementLookup.get(activeAgendaItem.primaryRequirementId)?.requirementNumber ?? "?"}
                    {requirementLookup.get(activeAgendaItem.primaryRequirementId)?.text
                      ? ` · ${shortenRequirementText(requirementLookup.get(activeAgendaItem.primaryRequirementId)?.text ?? "", 96)}`
                      : ""}
                  </p>
                ) : null}
              </div>
              <button
                className="close-button"
                onClick={() => {
                  setDrawerMode("swap");
                  setActiveAgendaItemId(null);
                }}
              >
                Close
              </button>
            </div>
            <div className="drawer-layout">
              <aside className="options-list">
                <section className="options-group">
                  <div className="options-group-head">
                    <h3>Recommended for this requirement</h3>
                    <p>These activities directly support the selected requirement.</p>
                  </div>
                  <div className="options-grid">
                    {(matchingOptionCards.length ? matchingOptionCards : previewOptionCards).length ? (
                      (matchingOptionCards.length ? matchingOptionCards : previewOptionCards).map(({ activity, requirement, badge, fitSummary }) => (
                        <button key={activity.id} className={`option-card ${activity.id === activePreviewActivity.id ? "option-card-active" : ""}`} onClick={() => setActivePreviewActivityId(activity.id)}>
                          <span className="option-card-kicker">
                            Requirement {requirement?.requirementNumber ?? "?"}
                          </span>
                          <strong className="option-card-title">{activity.name}</strong>
                          <p className="option-card-requirement">
                            {requirement ? shortenRequirementText(requirement.text, 78) : "Requirement mapping unavailable"}
                          </p>
                          <p className="option-card-fit">{fitSummary}</p>
                          <div className="option-key-grid" aria-hidden="true">
                            {buildActivityKeyIndicators(activity).map((indicator, index) => (
                              <span key={`${activity.id}-${index}`} className="option-key">
                                <span className="option-key-icon">{indicator.icon}</span>
                                <span>{indicator.label}</span>
                              </span>
                            ))}
                          </div>
                          <span className="option-badge">{badge}</span>
                        </button>
                      ))
                    ) : (
                      <div className="empty-state compact-empty">No matching official activities were found for this requirement.</div>
                    )}
                  </div>
                </section>

                {otherOptionCards.length ? (
                  <section className="options-group">
                    <div className="options-group-head">
                      <h3>More official activities</h3>
                      <p>These remain available if you want to stretch, trim, or swap the plan.</p>
                    </div>
                    <div className="options-grid">
                      {otherOptionCards.map(({ activity, requirement, badge, fitSummary }) => (
                        <button key={activity.id} className={`option-card ${activity.id === activePreviewActivity.id ? "option-card-active" : ""}`} onClick={() => setActivePreviewActivityId(activity.id)}>
                          <span className="option-card-kicker">
                            Requirement {requirement?.requirementNumber ?? "?"}
                          </span>
                          <strong className="option-card-title">{activity.name}</strong>
                          <p className="option-card-requirement">
                            {requirement ? shortenRequirementText(requirement.text, 78) : "Requirement mapping unavailable"}
                          </p>
                          <p className="option-card-fit">{fitSummary}</p>
                          <div className="option-key-grid" aria-hidden="true">
                            {buildActivityKeyIndicators(activity).map((indicator, index) => (
                              <span key={`${activity.id}-${index}`} className="option-key">
                                <span className="option-key-icon">{indicator.icon}</span>
                                <span>{indicator.label}</span>
                              </span>
                            ))}
                          </div>
                          <span className="option-badge">{badge}</span>
                        </button>
                      ))}
                    </div>
                  </section>
                ) : null}
              </aside>
              <section className="preview-panel">
                <div className="activity-detail-title-row">
                  <h3>{activePreviewActivity.name}</h3>
                  {activePreviewActivity.requirementId ? (
                    <div className="activity-requirement-pill">
                      Requirement {requirementLookup.get(activePreviewActivity.requirementId)?.requirementNumber ?? "?"}
                    </div>
                  ) : null}
                </div>
                <section className="activity-detail-section activity-key-section">
                  <div className="activity-key-strip preview-meta">
                    {buildActivityKeyIndicators(activePreviewActivity).map((detail, index) => (
                      <span key={`${activePreviewActivity.id}-${index}`}>
                        <span className="option-key-icon">{detail.icon}</span>
                        {detail.label}
                      </span>
                    ))}
                  </div>
                </section>
                <section className="activity-detail-section activity-detail-section-snapshot">
                  <h4>Activity Snapshot</h4>
                  {activePreviewActivity.requirementId ? (
                    <p className="activity-detail-lead">
                      {requirementLookup.get(activePreviewActivity.requirementId)?.text ?? "Requirement text unavailable."}
                    </p>
                  ) : null}
                  <p>{getActivitySnapshot(activePreviewActivity)}</p>
                </section>
                <section className="activity-detail-section activity-detail-section-materials">
                  <h4>Materials Needed</h4>
                  {activePreviewActivity.supplyNote ? (
                    <p className="activity-detail-muted">
                      <span className="activity-detail-inline-label">Supply Note</span> {activePreviewActivity.supplyNote}
                    </p>
                  ) : null}
                  {getActivityMaterials(activePreviewActivity).length ? (
                    <ul
                      className={`activity-material-list ${
                        getActivityMaterials(activePreviewActivity).length > 3 ? "activity-material-list-columns" : ""
                      }`}
                    >
                      {getActivityMaterials(activePreviewActivity).map((material) => (
                        <li key={material}>{material}</li>
                      ))}
                    </ul>
                  ) : (
                    <p>No supplies are required.</p>
                  )}
                </section>
                {activePreviewActivity.directions ? (
                  <section className="activity-detail-section activity-detail-section-directions">
                    <h4>Directions</h4>
                    {renderDirectionSection("At Home Option", activePreviewActivity.directions.atHomeOption)}
                    {renderDirectionSection("Before the Meeting", activePreviewActivity.directions.before)}
                    {renderDirectionSection("During the Meeting", activePreviewActivity.directions.during)}
                    {renderDirectionSection("After the Meeting", activePreviewActivity.directions.after)}
                  </section>
                ) : null}
                <div className="activity-detail-footer">
                  {activePreviewActivity.hasAdditionalResources ? (
                    <span className="activity-detail-footer-note">Additional official resources available on the source page.</span>
                  ) : null}
                  <a href={activePreviewActivity.sourceUrl} target="_blank" rel="noreferrer">
                    View official source
                  </a>
                </div>
                {activeAgendaItem.primaryRequirementId &&
                ((activePreviewActivity.requirementId && activePreviewActivity.requirementId !== activeAgendaItem.primaryRequirementId) ||
                  activePreviewActivity.adventureId !== activeAgendaItem.adventureId) ? (
                  <div className="review-banner">
                    This option belongs to a different requirement or adventure in the current meeting. Using it will add that requirement as its own agenda block instead of replacing the current one.
                  </div>
                ) : null}
                <div className="preview-actions">
                  {activePreviewActivity.id !== activeAgendaItem.selectedActivityId ? (
                    <button className="primary-button" onClick={() => handleUseActivity(activePreviewActivity.id)}>
                      Use This Activity
                    </button>
                  ) : (
                    <span className="current-pill">Currently selected</span>
                  )}
                </div>
              </section>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}