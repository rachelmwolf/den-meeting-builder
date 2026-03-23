import { useEffect, useMemo, useState } from "react";
import { api } from "./api";
import type {
  Activity,
  Adventure,
  AdventureTrailData,
  CoverageStatus,
  DenProfile,
  MeetingSpace,
  MeetingAgendaItem,
  MeetingPlan,
  PackWorkspace,
  Requirement,
  SavedMeetingPlan,
  YearPlan
} from "../shared/types.js";
import { labelMeetingSpace } from "../shared/utils.js";

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

const defaultMonth = {
  monthKey: "2026-09",
  monthLabel: "September 2026",
  theme: "Kickoff and den culture"
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

function describeProgress(current: number, target: number, required: boolean): string {
  if (!required) {
    return `${current}/${target} electives planned`;
  }
  return current >= target ? "Covered in year plan" : `${current}/${target} planned`;
}

function shortenRequirementText(text: string | null, maxLength = 110): string {
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trimEnd()}...`;
}

function describeActivityKey(activity: Activity): string[] {
  const details = [labelMeetingSpace(activity.meetingSpace)];
  if (activity.energyLevel) details.push(`Energy ${activity.energyLevel}/5`);
  if (activity.supplyLevel) details.push(`Supplies ${activity.supplyLevel}/5`);
  if (activity.prepLevel) details.push(`Prep ${activity.prepLevel}/5`);
  if (activity.durationMinutes) details.push(`${activity.durationMinutes} min`);
  return details;
}

function splitActivityNotes(activity: Activity): string[] {
  return [activity.notes, activity.previewDetails]
    .flatMap((value) => value.split(/\n{2,}/))
    .map((part) => part.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function getActivityMaterials(activity: Activity): string[] {
  const blocks = splitActivityNotes(activity);
  return blocks.filter((block) => /(\bbring\b|\bsuppl(y|ies)\b|\bmaterials?\b|\bhandbook\b|\bcrayons?\b|\bpencils?\b|\bmarkers?\b|\bcards?\b|\bpaper\b|\btape\b|\bcones?\b|\brope\b|\bwater bottle\b|\bwhistle\b|\bflashlight\b|\bsunscreen\b|\bhat\b|\bsunglasses\b|\btrail mix\b|\bfirst aid kit\b|\bgear\b)/i.test(block)).slice(0, 4);
}

function getActivityOverview(activity: Activity): string {
  const blocks = splitActivityNotes(activity);
  return blocks.find((block) => block !== activity.summary && !getActivityMaterials(activity).includes(block)) ?? activity.summary;
}

function timeBudgetLabel(status: MeetingPlan["timeBudget"]["status"]): string {
  if (status === "over") return "Over time";
  if (status === "tight") return "Tight fit";
  return "Fits time";
}

function formatMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split("-");
  if (!year || !month) return monthKey;
  const date = new Date(Number(year), Number(month) - 1, 1);
  if (Number.isNaN(date.getTime())) return monthKey;
  return date.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

function deriveMonthKey(meetingDate: string, fallback: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(meetingDate)) {
    return meetingDate.slice(0, 7);
  }
  return fallback;
}

function buildSuccessSummary(plan: MeetingPlan): string {
  const firstRequirement = plan.coverage[0];
  if (!firstRequirement) {
    return "The den stays engaged, finishes the selected activity, and leaves knowing what tonight was meant to teach.";
  }
  return `Scouts complete ${plan.coverage.length} requirement${plan.coverage.length === 1 ? "" : "s"} with enough time to close calmly and note what still needs to be logged.`;
}

function buildTimeShortNote(plan: MeetingPlan): string {
  if (plan.timeBudget.status === "fits") {
    return "Keep the core requirement activity intact and use the closing reflection only if the den needs it.";
  }

  const candidate = [...plan.agenda]
    .reverse()
    .find((item) => item.kind === "activity" || item.kind === "transition");

  if (!candidate) {
    return "Trim transitions first and keep the requirement-linked work moving.";
  }

  return `Defer or shorten "${candidate.title}" first if the meeting runs long, then capture any unfinished requirement work in Scoutbook later.`;
}

export function App() {
  const [workspace, setWorkspace] = useState<PackWorkspace | null>(null);
  const [dens, setDens] = useState<DenProfile[]>([]);
  const [selectedDenId, setSelectedDenId] = useState("");
  const [trailData, setTrailData] = useState<AdventureTrailData | null>(null);
  const [trailError, setTrailError] = useState("");
  const [trailLoading, setTrailLoading] = useState(false);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [selectedAdventureIds, setSelectedAdventureIds] = useState<string[]>([]);
  const [selectedRequirementIds, setSelectedRequirementIds] = useState<string[]>([]);
  const [request, setRequest] = useState(defaultRequest);
  const [monthPlan, setMonthPlan] = useState(defaultMonth);
  const [plan, setPlan] = useState<MeetingPlan | null>(null);
  const [yearPlan, setYearPlan] = useState<YearPlan | null>(null);
  const [saveMessage, setSaveMessage] = useState("");
  const [activeAgendaItemId, setActiveAgendaItemId] = useState<string | null>(null);
  const [activePreviewActivityId, setActivePreviewActivityId] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [isCustomizingPlan, setIsCustomizingPlan] = useState(false);
  const [openElectiveBuckets, setOpenElectiveBuckets] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    api.getWorkspace().then(setWorkspace);
    api.listDens().then((nextDens) => {
      setDens(nextDens);
      if (nextDens[0]) {
        setSelectedDenId(nextDens[0].id);
      }
    });
  }, []);

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
    api.getYearPlan(selectedDenId).then(setYearPlan).catch(() => setYearPlan(null));
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

  const selectedDen = dens.find((den) => den.id === selectedDenId) ?? null;
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

    return previewOptions
      .map((activity) => {
        const requirement = activity.requirementId ? requirementLookup.get(activity.requirementId) ?? null : null;
        const isCurrent = activity.id === activeAgendaItem.selectedActivityId;
        const sameRequirement = Boolean(
          activeAgendaItem.primaryRequirementId && activity.requirementId === activeAgendaItem.primaryRequirementId
        );
        const sameAdventure = activity.adventureId === activeAgendaItem.adventureId;
        let priority = 3;
        let badge = "Adds another requirement";
        if (isCurrent) {
          priority = 0;
          badge = "Current choice";
        } else if (sameRequirement) {
          priority = 1;
          badge = "Recommended for this requirement";
        } else if (sameAdventure) {
          priority = 2;
          badge = "Same adventure";
        }

        return {
          activity,
          requirement,
          isCurrent,
          badge,
          priority
        };
      })
      .sort((left, right) => {
        if (left.priority !== right.priority) {
          return left.priority - right.priority;
        }
        return left.activity.name.localeCompare(right.activity.name);
      });
  }, [activeAgendaItem, previewOptions, requirementLookup]);
  const activePreviewActivity =
    (activePreviewActivityId ? activityLookup.get(activePreviewActivityId) : null) ?? previewOptions[0] ?? null;
  const trailProgress = yearPlan?.trailProgress ?? trailData?.progress ?? null;
  const selectedRequirementCount = selectedRequirementIds.length;
  const estimatedMinimumMinutes = useMemo(() => {
    if (selectedRequirementCount === 0) return 0;
    const transitionCount = Math.max(selectedRequirementCount - 1, 0);
    return 20 + transitionCount * 5 + selectedRequirementCount * 10;
  }, [selectedRequirementCount]);
  const estimatedRecommendedMinutes = useMemo(() => {
    if (selectedRequirementCount === 0) return 0;
    const transitionCount = Math.max(selectedRequirementCount - 1, 0);
    return 20 + transitionCount * 5 + selectedRequirementCount * 15;
  }, [selectedRequirementCount]);
  const preflightWarning = useMemo(() => {
    if (selectedRequirementCount === 0) return "";
    if (estimatedMinimumMinutes > request.durationMinutes) {
      return `This scope is likely too large for ${request.durationMinutes} minutes. Even a compressed version is about ${estimatedMinimumMinutes} minutes.`;
    }
    if (estimatedRecommendedMinutes > request.durationMinutes) {
      return `This meeting can work, but it will be tight. The selected requirements usually take about ${estimatedRecommendedMinutes} minutes.`;
    }
    return "";
  }, [estimatedMinimumMinutes, estimatedRecommendedMinutes, request.durationMinutes, selectedRequirementCount]);

  function invalidateGeneratedPlan(): void {
    setPlan(null);
    setSaveMessage("");
    setActiveAgendaItemId(null);
    setActivePreviewActivityId(null);
    setIsCustomizingPlan(false);
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
    setIsCustomizingPlan(false);
    setSaveMessage("");
  }

  function updateAgendaItem(itemId: string, patch: Partial<MeetingAgendaItem>): void {
    setPlan((current) =>
      current
        ? { ...current, agenda: current.agenda.map((item) => (item.id === itemId ? { ...item, ...patch } : item)) }
        : current
    );
  }

  async function handleSave(): Promise<void> {
    if (!plan || !selectedDen) return;
    const resolvedMonthKey = deriveMonthKey(request.meetingDate, monthPlan.monthKey);
    const resolvedMonthLabel = monthPlan.monthLabel || formatMonthLabel(resolvedMonthKey);
    await api.savePlan({
      denId: selectedDen.id,
      title: `${selectedDen.name} - ${plan.adventures.map((adventure) => adventure.name).join(" + ")}`,
      plannedDate: request.meetingDate || null,
      monthKey: resolvedMonthKey,
      monthLabel: resolvedMonthLabel,
      theme: monthPlan.theme,
      payload: plan
    });
    setSaveMessage("Saved to the den year plan.");
    setYearPlan(await api.getYearPlan(selectedDen.id));
  }

  async function handleSwap(selectedActivityId: string): Promise<void> {
    if (!plan || !activeAgendaItem) return;
    const nextPlan = await api.swapActivity({
      plan,
      agendaItemId: activeAgendaItem.id,
      selectedActivityId
    });
    setPlan(nextPlan);
    setActivePreviewActivityId(selectedActivityId);
    setIsCustomizingPlan(true);
  }

  async function handleDuplicate(savedPlan: SavedMeetingPlan): Promise<void> {
    if (!selectedDen) return;
    await api.duplicatePlan(savedPlan.id, monthPlan.monthKey, monthPlan.monthLabel, monthPlan.theme);
    setYearPlan(await api.getYearPlan(selectedDen.id));
  }

  const stepReady = {
    1: Boolean(selectedDen),
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

          {currentStep === 1 ? (
            <div className="step-panel">
              <div className="panel-header">
                <div>
                  <h2>Step 1 · Den and Meeting Basics</h2>
                  <p>Choose the den, then set the meeting shape and activity limits.</p>
                </div>
              </div>

              <div className="setup-sections">
                <section className="setup-section">
                  <div className="setup-section-head">
                    <span className="section-eyebrow">Meeting Basics</span>
                    <p>Who, when, and how long tonight’s meeting needs to run.</p>
                  </div>
                  <div className="setup-grid setup-grid-basics">
                    <label>
                      Den
                      <select
                        value={selectedDenId}
                        onChange={(event) => {
                          setSelectedDenId(event.target.value);
                          setSelectedAdventureIds([]);
                          setSelectedRequirementIds([]);
                          invalidateGeneratedPlan();
                        }}
                      >
                        {dens.map((den) => (
                          <option key={den.id} value={den.id}>
                            {den.name} ({den.leaderName})
                          </option>
                          ))}
                      </select>
                    </label>
                    <div className="setup-basics-mini">
                      <label>
                        Meeting Date
                        <input
                          type="date"
                          value={request.meetingDate}
                          onChange={(event) => {
                            const nextDate = event.target.value;
                            const nextMonthKey = deriveMonthKey(nextDate, monthPlan.monthKey);
                            setRequest((current) => ({ ...current, meetingDate: nextDate }));
                            setMonthPlan((current) => ({
                              ...current,
                              monthKey: nextMonthKey,
                              monthLabel: formatMonthLabel(nextMonthKey)
                            }));
                            invalidateGeneratedPlan();
                          }}
                        />
                      </label>

                      <label>
                        Minutes
                        <input
                          type="number"
                          min={30}
                          max={120}
                          value={request.durationMinutes}
                          onChange={(event) => {
                            setRequest((current) => ({ ...current, durationMinutes: Number(event.target.value) }));
                            invalidateGeneratedPlan();
                          }}
                        />
                      </label>

                      <label>
                        Scouts
                        <input
                          type="number"
                          min={1}
                          max={16}
                          value={request.scoutCount}
                          onChange={(event) => {
                            setRequest((current) => ({ ...current, scoutCount: Number(event.target.value) }));
                            invalidateGeneratedPlan();
                          }}
                        />
                      </label>
                    </div>
                  </div>
                </section>

                <section className="setup-section">
                  <div className="setup-section-head">
                    <span className="section-eyebrow">Activity Constraints</span>
                    <p>Use the official activity key to steer the recommendations.</p>
                  </div>
                  <div className="setup-grid setup-grid-constraints">
                    <label>
                      Meeting Space
                      <span className="tooltip-wrap">
                        <button type="button" className="control-help" aria-label="Meeting space help">
                          i
                        </button>
                        <span className="tooltip-popover" role="tooltip">
                          Indoor, outing with travel, or outdoor. Use the most realistic setting for tonight&apos;s meeting.
                        </span>
                      </span>
                      <select
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

              {selectedDen ? (
                <div className="callout">
                  <strong>{selectedDen.name}</strong>
                  <p>
                    {selectedDen.meetingLocation} · {selectedDen.typicalMeetingDay}
                  </p>
                </div>
              ) : null}

              <div className="wizard-actions">
                <button className="primary-button" disabled={!selectedDen} onClick={() => setCurrentStep(2)}>
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
                  <p>Select one or more adventures for this meeting. The trail groups what is required for rank progress and what counts as electives.</p>
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
                          <p className="subtle-line">These adventures shape the rank path and should stay easy to scan.</p>
                        </div>
                      </div>
                      <div className="trail-grid trail-grid-required">
                        {requiredTrailBuckets.map((bucket) => {
                  const progressBucket = trailProgress?.buckets.find((item) => item.key === bucket.key);
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
                  <p>All requirements from the selected adventures are included by default. Trim the meeting scope here if you only want part of an adventure tonight.</p>
                </div>
              </div>

              <div className="callout">
                <strong>Selected adventures</strong>
                <p>{selectedAdventures.map((adventure) => adventure.name).join(", ") || "None selected yet."}</p>
              </div>
              {selectedRequirementCount > 0 ? (
                <div className="callout">
                  <strong>Time estimate</strong>
                  <p>
                    Minimum likely time: {estimatedMinimumMinutes} min · Typical official-activity range: about {estimatedRecommendedMinutes} min
                  </p>
                  {preflightWarning ? <p>{preflightWarning}</p> : <p>This scope should fit the current meeting length.</p>}
                </div>
              ) : null}

              <div className="wizard-inline-actions">
                <button className="text-button" onClick={() => setSelectedRequirementIds(requirements.map((requirement) => requirement.id))}>
                  Select all requirements
                </button>
                <button className="text-button" onClick={() => setSelectedRequirementIds([])}>
                  Clear all
                </button>
              </div>

              <div className="requirements-grid">
                {selectedAdventures.map((adventure) => {
                  const adventureRequirements = requirements.filter((requirement) => requirement.adventureId === adventure.id);
                  return (
                    <article key={adventure.id} className="list-block">
                      <h3>{adventure.name}</h3>
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
                  <p>Generate the packet after the den, trail selection, and requirement scope feel right. Review the proposal first, then opt into customization only if you need to adjust the packet.</p>
                </div>
              {plan ? (
                <button className="secondary-button" onClick={() => window.print()}>
                  Print Packet
                </button>
              ) : null}
              </div>

              {!plan ? (
                <div className="empty-state">
                  <p>Generate the packet from Step 3. Any change to basics, adventures, or requirements will clear the current packet so you can rebuild it cleanly.</p>
                </div>
              ) : (
                <div className="packet-workbench">
                  <aside className="packet-toolbar">
                    <section className="packet-panel">
                      <p className="section-eyebrow">Print Preview</p>
                      <h3>Review first</h3>
                      <p className="packet-copy">
                        {isCustomizingPlan
                          ? "Customizing is on. Adjust timings or preview alternate activities if you need to."
                          : `Ranked for ${labelMeetingSpace(plan.request.meetingSpace).toLowerCase()}, energy up to ${plan.request.maxEnergyLevel}, supplies up to ${plan.request.maxSupplyLevel}, and prep up to ${plan.request.maxPrepLevel}.`}
                      </p>
                      {!isCustomizingPlan ? (
                        <button className="secondary-button" onClick={() => setIsCustomizingPlan(true)}>
                          Customize this plan
                        </button>
                      ) : null}
                    </section>

                    <section className="packet-panel">
                      <h3>Time budget</h3>
                      <p className="packet-copy">
                        Planned minutes: {plan.timeBudget.plannedMinutes} / {plan.timeBudget.targetMinutes} · Minimum likely {plan.timeBudget.minimumSuggestedMinutes} · Recommended {plan.timeBudget.recommendedMinutes}
                      </p>
                      <div className={`packet-budget packet-budget-${plan.timeBudget.status}`}>
                        {timeBudgetLabel(plan.timeBudget.status)}
                      </div>
                      {plan.timeBudget.warnings.length ? (
                        <ul className="packet-list">
                          {plan.timeBudget.warnings.map((warning) => <li key={warning}>{warning}</li>)}
                        </ul>
                      ) : (
                        <p className="packet-copy">The packet fits the selected meeting length with a little room to breathe.</p>
                      )}
                    </section>

                    <section className="packet-panel">
                      <h3>Save to Year Plan</h3>
                      <label>
                        Year Plan Month
                        <input
                          value={monthPlan.monthLabel}
                          onChange={(event) =>
                            setMonthPlan((current) => ({ ...current, monthLabel: event.target.value }))
                          }
                        />
                      </label>
                      <label>
                        Theme
                        <input
                          value={monthPlan.theme}
                          onChange={(event) =>
                            setMonthPlan((current) => ({ ...current, theme: event.target.value }))
                          }
                        />
                      </label>
                      <p className="subtle-line">Month key: {deriveMonthKey(request.meetingDate, monthPlan.monthKey)}</p>
                      <button className="secondary-button" onClick={() => void handleSave()}>
                        Save to Year Plan
                      </button>
                      {saveMessage ? <p className="save-message">{saveMessage}</p> : null}
                    </section>
                  </aside>

                  <section className="packet-canvas">
                    <article className="packet-page">
                      <header className="packet-page-header">
                        <div>
                          <span className="section-eyebrow">Packet Preview</span>
                          <h2>{plan.denName}</h2>
                          <p>
                            {plan.request.meetingDate || "Date TBD"} · {plan.adventures.map((adventure) => adventure.name).join(", ")}
                          </p>
                        </div>
                        <div className={`packet-budget packet-budget-${plan.timeBudget.status}`}>
                          {timeBudgetLabel(plan.timeBudget.status)} · {plan.timeBudget.plannedMinutes}/{plan.timeBudget.targetMinutes} min
                        </div>
                      </header>

                      <section className="packet-block">
                        <h3>Meeting At a Glance</h3>
                        <p>
                          Den: {plan.denName} · Space: {labelMeetingSpace(plan.request.meetingSpace)} · Scouts: {plan.request.scoutCount}
                        </p>
                        <p>Tonight’s success looks like: {buildSuccessSummary(plan)}</p>
                      </section>

                      <section className="packet-columns">
                        <div className="packet-block">
                          <h3>Before Scouts Arrive</h3>
                          <ul className="print-checklist">
                            <li><span className="print-checkbox" aria-hidden="true" /> Materials out</li>
                            <li><span className="print-checkbox" aria-hidden="true" /> Opening ready</li>
                            <li><span className="print-checkbox" aria-hidden="true" /> First activity staged</li>
                          </ul>
                        </div>
                        <div className="packet-block">
                          <h3>Materials Checklist</h3>
                          <ul className="print-checklist">
                            {plan.materials.map((item) => (
                              <li key={`packet-${item}`}>
                                <span className="print-checkbox" aria-hidden="true" />
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </section>

                      <section className="packet-block">
                        <h3>Activity Overview</h3>
                        <div className="packet-activity-list">
                          {plan.agenda.map((item) => (
                            <div key={`packet-activity-${item.id}`} className="packet-activity-row">
                              <div>
                                <strong>{item.title}</strong>
                                <p>
                                  {item.requirementNumber ? `Requirement ${item.requirementNumber}` : "Packet support block"}
                                  {item.adventureName ? ` · ${item.adventureName}` : ""}
                                </p>
                              </div>
                              <div>
                                <strong>{item.durationMinutes} min</strong>
                                <p>{shortenRequirementText(item.editableNotes || item.description, 120)}</p>
                                {item.kind === "activity" && item.selectedActivityId && activityLookup.get(item.selectedActivityId) ? (() => {
                                  const selectedActivity = activityLookup.get(item.selectedActivityId) as Activity;
                                  const materials = getActivityMaterials(selectedActivity);
                                  return (
                                    <div className="packet-activity-meta">
                                      <p>{describeActivityKey(selectedActivity).join(" · ")}</p>
                                      <p>{materials.length ? `Materials: ${materials.join(" · ")}` : `Materials / setup: ${shortenRequirementText(getActivityOverview(selectedActivity), 120)}`}</p>
                                      {item.selectionSource ? (
                                        <span className={`coverage-chip coverage-${item.coverageStatus ?? "automatic"}`}>
                                          {item.selectionSource === "recommended"
                                            ? "Recommended activity"
                                            : item.selectionSource === "added"
                                              ? "Leader-added requirement"
                                              : "Swapped activity"}
                                        </span>
                                      ) : null}
                                      {isCustomizingPlan ? (
                                        <button
                                          className="text-button"
                                          onClick={() => {
                                            setActiveAgendaItemId(item.id);
                                            setActivePreviewActivityId(item.selectedActivityId);
                                          }}
                                        >
                                          Preview and Swap Activity
                                        </button>
                                      ) : null}
                                    </div>
                                  );
                                })() : null}
                              </div>
                            </div>
                          ))}
                        </div>
                      </section>

                      <section className="packet-block">
                        <h3>If Time Runs Short</h3>
                        <p>{buildTimeShortNote(plan)}</p>
                      </section>

                      <section className="packet-block">
                        <h3>Quick Reflect</h3>
                        <div className="reflect-block">
                          <strong>What was completed?</strong>
                          <div className="reflect-lines" />
                          <strong>What should I log in Scoutbook later?</strong>
                          <div className="reflect-lines" />
                          <strong>What do I want to remember for next time?</strong>
                          <div className="reflect-lines" />
                        </div>
                      </section>
                    </article>
                  </section>

                  <section className="print-sheet print-only">
                    <header className="print-sheet-header">
                      <div>
                        <h2>{plan.denName} Leader Packet</h2>
                        <p>
                          {plan.request.meetingDate || "Date TBD"} · {plan.adventures.map((adventure) => adventure.name).join(", ")}
                        </p>
                      </div>
                      <div className={`print-budget print-budget-${plan.timeBudget.status}`}>
                        {timeBudgetLabel(plan.timeBudget.status)} · {plan.timeBudget.plannedMinutes}/{plan.timeBudget.targetMinutes} min
                      </div>
                    </header>

                    <section className="print-section">
                      <h3>Meeting At a Glance</h3>
                      <p>
                        Den: {plan.denName} · Space: {labelMeetingSpace(plan.request.meetingSpace)} · Scouts: {plan.request.scoutCount}
                      </p>
                      <p>
                        Tonight’s success looks like: {buildSuccessSummary(plan)}
                      </p>
                    </section>

                    <section className="print-columns">
                      <div className="print-section">
                        <h3>Before Scouts Arrive</h3>
                        <ul className="print-checklist">
                          <li><span className="print-checkbox" aria-hidden="true" /> Materials out</li>
                          <li><span className="print-checkbox" aria-hidden="true" /> Opening ready</li>
                          <li><span className="print-checkbox" aria-hidden="true" /> First activity staged</li>
                        </ul>
                      </div>
                      <div className="print-section">
                        <h3>Materials Checklist</h3>
                        <ul className="print-checklist">
                          {plan.materials.map((item) => (
                            <li key={`print-${item}`}>
                              <span className="print-checkbox" aria-hidden="true" />
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </section>

                    <section className="print-section">
                      <h3>Activity Overview</h3>
                      <div className="print-activity-list">
                        {plan.agenda.map((item) => (
                          <div key={`print-activity-${item.id}`} className="print-activity-row">
                            <div>
                              <strong>{item.title}</strong>
                              <p>
                                {item.requirementNumber ? `Requirement ${item.requirementNumber}` : "Packet support block"}
                                {item.adventureName ? ` · ${item.adventureName}` : ""}
                              </p>
                            </div>
                            <div>
                              <strong>{item.durationMinutes} min</strong>
                              <p>{shortenRequirementText(item.editableNotes || item.description, 120)}</p>
                              {item.kind === "activity" && item.selectedActivityId && activityLookup.get(item.selectedActivityId) ? (() => {
                                const selectedActivity = activityLookup.get(item.selectedActivityId) as Activity;
                                const materials = getActivityMaterials(selectedActivity);
                                return (
                                  <>
                                    <p>{describeActivityKey(selectedActivity).join(" · ")}</p>
                                    <p>{materials.length ? `Materials: ${materials.join(" · ")}` : `Materials / setup: ${shortenRequirementText(getActivityOverview(selectedActivity), 120)}`}</p>
                                  </>
                                );
                              })() : null}
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>

                    <section className="print-section">
                      <h3>If Time Runs Short</h3>
                      <p>{buildTimeShortNote(plan)}</p>
                    </section>

                    <section className="print-section">
                      <h3>Quick Reflect</h3>
                      <div className="reflect-block">
                        <strong>What was completed?</strong>
                        <div className="reflect-lines" />
                        <strong>What should I log in Scoutbook later?</strong>
                        <div className="reflect-lines" />
                        <strong>What do I want to remember for next time?</strong>
                        <div className="reflect-lines" />
                      </div>
                    </section>
                  </section>

                  <div className="wizard-actions">
                    <button className="secondary-button" onClick={() => setCurrentStep(3)}>
                      Back
                    </button>
                    <button className="primary-button" onClick={() => window.print()}>
                      Print Packet
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </section>

        <aside className="sidebar-stack">
          <section className="panel">
            <h2>Meeting Scope</h2>
            <p className="subtle-line">Use the setup steps to trim what appears in the final packet.</p>
            <div className="summary-card">
              <span>Selected Adventures</span>
              <strong>{selectedAdventures.length ? selectedAdventures.map((adventure) => adventure.name).join(", ") : "None yet"}</strong>
            </div>
            <div className="summary-card">
              <span>Selected Requirements</span>
              <strong>{selectedRequirementIds.length || 0}</strong>
            </div>
          </section>

          <section className="panel">
            <h2>Adventure Trail Progress</h2>
            <div className="trail-progress-list">
              {trailProgress?.buckets.map((bucket) => (
                <div className="summary-card" key={bucket.key}>
                  <span>{bucket.label}</span>
                  <strong className="summary-progress">{describeProgress(bucket.completedCount, bucket.targetCount, bucket.required)}</strong>
                </div>
              )) ?? <div className="empty-state compact-empty">Select a den to see trail progress.</div>}
            </div>
          </section>
        </aside>

        <section className="panel panel-wide">
          <h2>Den Year Plan</h2>
          <p>Saved meetings stay grouped by month so leaders can reuse what worked and still see trail progress across the year.</p>
          {yearPlan?.months.length ? (
            <div className="year-plan-list">
              {yearPlan.months.map((month) => (
                <article className="year-plan-card" key={month.monthKey}>
                  <span>{month.monthLabel}</span>
                  <strong>{month.theme}</strong>
                  {month.items.map((item) => (
                    <div key={item.id} className="year-plan-item">
                      <p>{item.title}</p>
                      <small>{item.plannedDate || "No date"} · {item.payload.adventures.map((adventure: Adventure) => adventure.name).join(", ")}</small>
                      {item.recap ? <small>Recap saved</small> : <small>No recap yet</small>}
                      <button className="text-button" onClick={() => void handleDuplicate(item)}>Reuse in Current Month</button>
                    </div>
                  ))}
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">Save the first meeting packet to start this den’s year plan.</div>
          )}
        </section>
      </main>

      {activeAgendaItem && activePreviewActivity ? (
        <div className="drawer-backdrop" role="dialog" aria-modal="true">
          <div className="drawer">
            <div className="drawer-header">
              <div>
                <p className="eyebrow">Activity Options</p>
                <h2>{activeAgendaItem.title}</h2>
              </div>
              <button className="close-button" onClick={() => setActiveAgendaItemId(null)}>Close</button>
            </div>
            <div className="drawer-layout">
              <aside className="options-list">
                {previewOptionCards.length ? (
                  previewOptionCards.map(({ activity, requirement, badge }) => (
                    <button key={activity.id} className={`option-card ${activity.id === activePreviewActivity.id ? "option-card-active" : ""}`} onClick={() => setActivePreviewActivityId(activity.id)}>
                      <div className="option-card-topline">
                        <strong>{activity.name}</strong>
                        <span className="option-badge">{badge}</span>
                      </div>
                      <span>{describeActivityKey(activity).join(" · ")}</span>
                      {activity.adventureId !== activeAgendaItem.adventureId && activeAgendaItem.adventureName ? (
                        <span>{plan?.adventures.find((adventure) => adventure.id === activity.adventureId)?.name ?? "Other adventure"}</span>
                      ) : null}
                      {requirement ? (
                        <span>
                          Requirement {requirement.requirementNumber}: {shortenRequirementText(requirement.text, 72)}
                        </span>
                      ) : (
                        <span>Requirement mapping unavailable</span>
                      )}
                    </button>
                  ))
                ) : (
                  <div className="empty-state compact-empty">No alternate official activities are available for this meeting scope.</div>
                )}
              </aside>
              <section className="preview-panel">
                <h3>{activePreviewActivity.name}</h3>
                <p>{activePreviewActivity.summary}</p>
                {activePreviewActivity.requirementId ? (
                  <div className="agenda-requirement">
                    <strong>
                      Requirement {requirementLookup.get(activePreviewActivity.requirementId)?.requirementNumber ?? "?"}
                    </strong>
                    <p>{requirementLookup.get(activePreviewActivity.requirementId)?.text ?? "Requirement text unavailable."}</p>
                  </div>
                ) : null}
                <div className="preview-meta">
                  {describeActivityKey(activePreviewActivity).map((detail) => (
                    <span key={detail}>{detail}</span>
                  ))}
                </div>
                <div className="agenda-requirement">
                  <strong>Materials</strong>
                  <p>
                    {getActivityMaterials(activePreviewActivity).length
                      ? getActivityMaterials(activePreviewActivity).join(" · ")
                      : shortenRequirementText(getActivityOverview(activePreviewActivity), 180)}
                  </p>
                </div>
                <p className="preview-details">{getActivityOverview(activePreviewActivity)}</p>
                {activeAgendaItem.primaryRequirementId &&
                ((activePreviewActivity.requirementId && activePreviewActivity.requirementId !== activeAgendaItem.primaryRequirementId) ||
                  activePreviewActivity.adventureId !== activeAgendaItem.adventureId) ? (
                  <div className="review-banner">
                    This option belongs to a different requirement or adventure in the current meeting. Using it will add that requirement as its own agenda block instead of replacing the current one.
                  </div>
                ) : null}
                <div className="preview-actions">
                  <a href={activePreviewActivity.sourceUrl} target="_blank" rel="noreferrer">View official source</a>
                  {activePreviewActivity.id !== activeAgendaItem.selectedActivityId ? (
                    <button className="primary-button" onClick={() => void handleSwap(activePreviewActivity.id)}>
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