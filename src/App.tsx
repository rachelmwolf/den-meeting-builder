import { useEffect, useMemo, useState } from "react";
import { api } from "./api";
import type {
  Activity,
  Adventure,
  AdventureTrailData,
  CoverageStatus,
  DenProfile,
  Environment,
  MeetingAgendaItem,
  MeetingPlan,
  PackWorkspace,
  Requirement,
  SaveRecapRequest,
  SavedMeetingPlan,
  YearPlan
} from "../shared/types.js";

const defaultRequest = {
  durationMinutes: 60,
  scoutCount: 6,
  environment: "indoor" as Environment,
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

export function App() {
  const [workspace, setWorkspace] = useState<PackWorkspace | null>(null);
  const [contentStatus, setContentStatus] = useState<any>(null);
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
  const [recap, setRecap] = useState<Omit<SaveRecapRequest, "meetingPlanId">>({
    completedRequirementIds: [],
    recapNotes: "",
    familyFollowUp: "",
    reuseNotes: ""
  });

  useEffect(() => {
    api.getWorkspace().then(setWorkspace);
    api.getContentStatus().then(setContentStatus);
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
  const activePreviewActivity =
    (activePreviewActivityId ? activityLookup.get(activePreviewActivityId) : null) ?? previewOptions[0] ?? null;
  const trailProgress = yearPlan?.trailProgress ?? trailData?.progress ?? null;

  function invalidateGeneratedPlan(): void {
    setPlan(null);
    setSaveMessage("");
    setActiveAgendaItemId(null);
    setActivePreviewActivityId(null);
    setRecap({
      completedRequirementIds: [],
      recapNotes: "",
      familyFollowUp: "",
      reuseNotes: ""
    });
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
      environment: request.environment,
      notes: request.notes,
      meetingDate: request.meetingDate || null
    });
    setPlan(nextPlan);
    setCurrentStep(4);
    setRecap({
      completedRequirementIds: [],
      recapNotes: "",
      familyFollowUp: "",
      reuseNotes: ""
    });
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
    await api.savePlan({
      denId: selectedDen.id,
      title: `${selectedDen.name} - ${plan.adventures.map((adventure) => adventure.name).join(" + ")}`,
      plannedDate: request.meetingDate || null,
      monthKey: monthPlan.monthKey,
      monthLabel: monthPlan.monthLabel,
      theme: monthPlan.theme,
      payload: plan
    });
    setSaveMessage("Saved to the den year plan.");
    setYearPlan(await api.getYearPlan(selectedDen.id));
  }

  async function handleSaveRecap(): Promise<void> {
    if (!plan) return;
    const savedRecap = await api.saveRecap({ meetingPlanId: plan.id, ...recap });
    setPlan((current) => {
      if (!current) return current;
      const completedNumbers = current.coverage
        .filter((item) => savedRecap.completedRequirementIds.includes(item.requirementId))
        .map((item) => `${item.adventureName} requirement ${item.requirementNumber}`);
      const completionLine = completedNumbers.length
        ? `Completed tonight: ${completedNumbers.join(", ")}.`
        : "We reviewed the meeting but still need leader confirmation on completed requirements.";
      const followUpLine = savedRecap.familyFollowUp.trim()
        ? `Family follow-up: ${savedRecap.familyFollowUp.trim()}`
        : "No additional family follow-up is needed right now.";
      return {
        ...current,
        parentUpdate: {
          ...current.parentUpdate,
          message: `${current.parentUpdate.message} ${completionLine} ${followUpLine}`.trim()
        }
      };
    });
    if (selectedDen) {
      setYearPlan(await api.getYearPlan(selectedDen.id));
    }
    setSaveMessage("Meeting recap saved.");
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

  return (
    <div className="page-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">{workspace?.name ?? "Pack Workspace"}</p>
          <h1>Guide the setup. Focus the packet. Keep the year in view.</h1>
          <p className="hero-copy">
            Move through a simple den-planning flow, use the Adventure Trail to choose what matters tonight, then customize the final packet without carrying the whole system on one screen.
          </p>
          {contentStatus ? (
            <p className="hero-copy content-status-copy">
              Dataset: <strong>{contentStatus.datasetMode}</strong>
              {contentStatus.importedRanks.length
                ? ` · Imported ranks: ${contentStatus.importedRanks.map((rank: any) => rank.rankName).join(", ")}`
                : " · Using fallback demo content"}
            </p>
          ) : null}
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
                  <p>Choose the den, capture tonight’s context, and set where this packet should land in the year plan.</p>
                </div>
              </div>

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

              {selectedDen ? (
                <div className="callout">
                  <strong>{selectedDen.name}</strong>
                  <p>
                    {selectedDen.meetingLocation} · {selectedDen.typicalMeetingDay}
                  </p>
                  {contentStatus?.lastRefreshedAt ? (
                    <p>Last content refresh: {new Date(contentStatus.lastRefreshedAt).toLocaleString()}</p>
                  ) : null}
                </div>
              ) : null}

              <div className="inline-grid">
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

              <label>
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

              <label>
                Environment
                <select
                  value={request.environment}
                  onChange={(event) => {
                    setRequest((current) => ({ ...current, environment: event.target.value as Environment }));
                    invalidateGeneratedPlan();
                  }}
                >
                  <option value="indoor">Indoor</option>
                  <option value="outdoor">Outdoor</option>
                  <option value="either">Either</option>
                </select>
              </label>

              <label>
                Leader Notes
                <textarea
                  rows={4}
                  value={request.notes}
                  onChange={(event) => {
                    setRequest((current) => ({ ...current, notes: event.target.value }));
                    invalidateGeneratedPlan();
                  }}
                  placeholder="What makes this meeting different this week?"
                />
              </label>

              <label>
                Year Plan Month
                <input value={monthPlan.monthLabel} onChange={(event) => setMonthPlan((current) => ({ ...current, monthLabel: event.target.value }))} />
              </label>
              <label>
                Month Key
                <input value={monthPlan.monthKey} onChange={(event) => setMonthPlan((current) => ({ ...current, monthKey: event.target.value }))} />
              </label>
              <label>
                Theme
                <input value={monthPlan.theme} onChange={(event) => setMonthPlan((current) => ({ ...current, theme: event.target.value }))} />
              </label>

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

              <div className="trail-grid">
                {trailLoading ? <div className="empty-state">Loading Adventure Trail...</div> : null}
                {!trailLoading && trailError ? <div className="empty-state">Adventure Trail could not be loaded: {trailError}</div> : null}
                {!trailLoading && !trailError
                  ? trailData?.buckets.map((bucket) => {
                  const progressBucket = trailProgress?.buckets.find((item) => item.key === bucket.key);
                  return (
                    <article key={bucket.key} className="trail-card">
                      <div className="trail-card-header">
                        <div>
                          <span className="agenda-kind">{bucket.required ? "Required Trail" : "Elective Trail"}</span>
                          <h3>{bucket.label}</h3>
                        </div>
                        {progressBucket ? (
                          <span className={`coverage-chip ${progressBucket.completedCount >= progressBucket.targetCount ? "coverage-automatic" : "coverage-uncovered"}`}>
                            {describeProgress(progressBucket.completedCount, progressBucket.targetCount, bucket.required)}
                          </span>
                        ) : null}
                      </div>
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
                                <p>{adventure.kind === "required" ? "Required adventure" : "Elective adventure"}</p>
                              </div>
                            </label>
                          ))
                        ) : (
                          <div className="empty-state compact-empty">No adventures imported for this bucket yet.</div>
                        )}
                      </div>
                    </article>
                  );
                    })
                  : null}
              </div>

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
                <button className="primary-button" disabled={selectedRequirementIds.length === 0} onClick={() => setCurrentStep(4)}>
                  Continue to Leader Packet
                </button>
              </div>
            </div>
          ) : null}

          {currentStep === 4 ? (
            <div className="step-panel">
              <div className="panel-header">
                <div>
                  <h2>Step 4 · Leader Packet</h2>
                  <p>Generate the packet only after the den, trail selection, and requirement scope feel right. Then adjust timings, preview activities, and save it into the year plan.</p>
                </div>
                {plan ? (
                  <button className="secondary-button" onClick={() => window.print()}>
                    Print Packet
                  </button>
                ) : null}
              </div>

              {!plan ? (
                <div className="empty-state">
                  <p>Ready to build the packet for {selectedAdventures.map((adventure) => adventure.name).join(", ")}.</p>
                  <button className="primary-button" onClick={() => void handleGenerate()}>
                    Generate Leader Packet
                  </button>
                </div>
              ) : (
                <div className="plan-stack">
                  <div className="summary-grid">
                    <div className="summary-card"><span>Den</span><strong>{plan.denName}</strong></div>
                    <div className="summary-card"><span>Adventures</span><strong>{plan.adventures.map((adventure) => adventure.name).join(", ")}</strong></div>
                    <div className="summary-card"><span>Date</span><strong>{plan.request.meetingDate || "TBD"}</strong></div>
                  </div>

                  <div className="list-block">
                    <h3>Printable Packet Includes</h3>
                    <ul>{plan.printSections.map((section) => <li key={section}>{section}</li>)}</ul>
                  </div>

                  <div className="list-block">
                    <h3>Materials</h3>
                    <ul>{plan.materials.map((item) => <li key={item}>{item}</li>)}</ul>
                  </div>

                  <div className="agenda-list">
                    {plan.agenda.map((item) => (
                      <article className="agenda-card" key={item.id}>
                        <div className="agenda-head">
                          <div>
                            <span className="agenda-kind">{item.kind}</span>
                            <h3>{item.title}</h3>
                            {item.adventureName ? <p className="subtle-line">{item.adventureName}</p> : null}
                          </div>
                          <input className="minutes-input" type="number" min={5} value={item.durationMinutes} onChange={(event) => updateAgendaItem(item.id, { durationMinutes: Number(event.target.value) })} />
                        </div>
                        <p>{item.description}</p>
                        {coverageLabel(item.coverageStatus) ? <div className={`coverage-chip coverage-${item.coverageStatus}`}>{coverageLabel(item.coverageStatus)}</div> : null}
                        <textarea rows={3} value={item.editableNotes} onChange={(event) => updateAgendaItem(item.id, { editableNotes: event.target.value })} />
                        {item.kind === "activity" ? (
                          <div className="agenda-actions">
                            <button className="secondary-button" onClick={() => { setActiveAgendaItemId(item.id); setActivePreviewActivityId(item.selectedActivityId); }}>
                              Preview and Swap Activity
                            </button>
                          </div>
                        ) : null}
                      </article>
                    ))}
                  </div>

                  <div className="coverage-grid">
                    <div className="list-block">
                      <h3>Requirement Coverage</h3>
                      <ul>
                        {plan.coverage.map((item) => (
                          <li key={item.requirementId}>
                            <strong>{item.adventureName} · Req {item.requirementNumber}:</strong> {item.reason}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="list-block">
                      <h3>Leader Guidance</h3>
                      <p>{plan.leaderNotes}</p>
                      <button className="secondary-button" onClick={() => void handleSave()}>
                        Save to Year Plan
                      </button>
                      {saveMessage ? <p className="save-message">{saveMessage}</p> : null}
                    </div>
                  </div>

                  <div className="coverage-grid">
                    <div className="list-block">
                      <h3>Meeting Recap</h3>
                      {plan.coverage.map((item) => (
                        <label key={item.requirementId} className="checkbox-row">
                          <input
                            type="checkbox"
                            checked={recap.completedRequirementIds.includes(item.requirementId)}
                            onChange={(event) =>
                              setRecap((current) => ({
                                ...current,
                                completedRequirementIds: event.target.checked
                                  ? [...current.completedRequirementIds, item.requirementId]
                                  : current.completedRequirementIds.filter((id) => id !== item.requirementId)
                              }))
                            }
                          />
                          {item.adventureName} requirement {item.requirementNumber} completed
                        </label>
                      ))}
                      <label>
                        Recap Notes
                        <textarea rows={3} value={recap.recapNotes} onChange={(event) => setRecap((current) => ({ ...current, recapNotes: event.target.value }))} />
                      </label>
                      <label>
                        Family Follow-up
                        <textarea rows={3} value={recap.familyFollowUp} onChange={(event) => setRecap((current) => ({ ...current, familyFollowUp: event.target.value }))} />
                      </label>
                      <label>
                        Reuse Notes for Next Year
                        <textarea rows={3} value={recap.reuseNotes} onChange={(event) => setRecap((current) => ({ ...current, reuseNotes: event.target.value }))} />
                      </label>
                      <button className="secondary-button" onClick={() => void handleSaveRecap()}>
                        Save Meeting Recap
                      </button>
                    </div>

                    <div className="list-block">
                      <h3>Parent Update Template</h3>
                      <p><strong>{plan.parentUpdate.subject}</strong></p>
                      <textarea rows={8} value={plan.parentUpdate.message} readOnly />
                    </div>
                  </div>

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
                  <strong>{describeProgress(bucket.completedCount, bucket.targetCount, bucket.required)}</strong>
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
                {previewOptions.map((activity) => (
                  <button key={activity.id} className={`option-card ${activity.id === activePreviewActivity.id ? "option-card-active" : ""}`} onClick={() => setActivePreviewActivityId(activity.id)}>
                    <strong>{activity.name}</strong>
                    <span>{activity.location}</span>
                  </button>
                ))}
              </aside>
              <section className="preview-panel">
                <h3>{activePreviewActivity.name}</h3>
                <p>{activePreviewActivity.summary}</p>
                <div className="preview-meta">
                  <span>{activePreviewActivity.location}</span>
                  {activePreviewActivity.durationMinutes ? <span>{activePreviewActivity.durationMinutes} min</span> : null}
                  {activePreviewActivity.prepMinutes ? <span>{activePreviewActivity.prepMinutes} min prep</span> : null}
                </div>
                <p className="preview-details">{activePreviewActivity.previewDetails}</p>
                {activeAgendaItem.primaryRequirementId &&
                ((activePreviewActivity.requirementId && activePreviewActivity.requirementId !== activeAgendaItem.primaryRequirementId) ||
                  activePreviewActivity.adventureId !== activeAgendaItem.adventureId) ? (
                  <div className="review-banner">
                    This option comes from a different requirement or adventure in the current meeting. You can use it, but requirement completion will move to leader review.
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