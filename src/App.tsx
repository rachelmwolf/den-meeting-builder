import { useEffect, useMemo, useState } from "react";
import { api } from "./api";
import type {
  Activity,
  ContentStatus,
  CoverageStatus,
  DenProfile,
  Environment,
  MeetingAgendaItem,
  MeetingPlan,
  PackWorkspace,
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

function coverageLabel(status: CoverageStatus | null): string | null {
  if (status === "automatic") return "Auto coverage";
  if (status === "leader-review") return "Leader review";
  if (status === "uncovered") return "Uncovered";
  return null;
}

export function App() {
  const [workspace, setWorkspace] = useState<PackWorkspace | null>(null);
  const [contentStatus, setContentStatus] = useState<ContentStatus | null>(null);
  const [dens, setDens] = useState<DenProfile[]>([]);
  const [selectedDenId, setSelectedDenId] = useState("");
  const [adventures, setAdventures] = useState<MeetingPlan["adventure"][]>([]);
  const [selectedAdventureId, setSelectedAdventureId] = useState("");
  const [request, setRequest] = useState(defaultRequest);
  const [monthPlan, setMonthPlan] = useState(defaultMonth);
  const [plan, setPlan] = useState<MeetingPlan | null>(null);
  const [yearPlan, setYearPlan] = useState<YearPlan | null>(null);
  const [saveMessage, setSaveMessage] = useState("");
  const [activeAgendaItemId, setActiveAgendaItemId] = useState<string | null>(null);
  const [activePreviewActivityId, setActivePreviewActivityId] = useState<string | null>(null);
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
      const safeDens = Array.isArray(nextDens) ? nextDens : [];
      setDens(safeDens);
      if (safeDens[0]) {
        setSelectedDenId(safeDens[0].id);
      }
    });
  }, []);

  useEffect(() => {
    if (!selectedDenId) return;
    api.listAdventures(selectedDenId).then((nextAdventures) => {
      const safeAdventures = Array.isArray(nextAdventures) ? nextAdventures : [];
      setAdventures(safeAdventures);
      setSelectedAdventureId(safeAdventures[0]?.id ?? "");
    });
    api.getYearPlan(selectedDenId).then(setYearPlan).catch(() => setYearPlan(null));
  }, [selectedDenId]);

  const selectedDen = dens.find((den) => den.id === selectedDenId) ?? null;
  const selectedAdventure = adventures.find((adventure) => adventure.id === selectedAdventureId) ?? null;
  const activityLookup = useMemo(
    () => new Map((plan?.activityLibrary ?? []).map((activity) => [activity.id, activity])),
    [plan]
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
    return selected ? [selected, ...alternatives] : alternatives;
  }, [activeAgendaItem, activityLookup]);
  const activePreviewActivity =
    (activePreviewActivityId ? activityLookup.get(activePreviewActivityId) : null) ?? previewOptions[0] ?? null;

  async function handleGenerate(): Promise<void> {
    if (!selectedDen || !selectedAdventure) return;
    const nextPlan = await api.generatePlan({
      denId: selectedDen.id,
      rankId: selectedDen.rankId,
      adventureId: selectedAdventure.id,
      durationMinutes: request.durationMinutes,
      scoutCount: request.scoutCount,
      environment: request.environment,
      notes: request.notes,
      meetingDate: request.meetingDate || null
    });
    setPlan(nextPlan);
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
      title: `${selectedDen.name} - ${plan.adventure.name}`,
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
        .map((item) => item.requirementNumber);
      const completionLine = completedNumbers.length
        ? `Completed tonight: requirement ${completedNumbers.join(", requirement ")}.`
        : "We reviewed the adventure but still need leader confirmation on completed requirements.";
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

  return (
    <div className="page-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">{workspace?.name ?? "Pack Workspace"}</p>
          <h1>Plan for the den. Print for the room. Reuse next year.</h1>
          <p className="hero-copy">
            Build one meeting quickly, save it into a den-level year plan, capture what actually happened, and generate a parent update without turning this into a tracking system.
          </p>
          {contentStatus ? (
            <p className="hero-copy content-status-copy">
              Dataset: <strong>{contentStatus.datasetMode}</strong>
              {contentStatus.importedRanks.length
                ? ` · Imported ranks: ${contentStatus.importedRanks.map((rank) => rank.rankName).join(", ")}`
                : " · Using fallback demo content"}
            </p>
          ) : null}
        </div>
      </section>

      <main className="content-grid">
        <section className="panel">
          <h2>Den Planning</h2>
          <label>
            Den
            <select value={selectedDenId} onChange={(event) => setSelectedDenId(event.target.value)}>
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

          <label>
            Adventure
            <select value={selectedAdventureId} onChange={(event) => setSelectedAdventureId(event.target.value)}>
              {adventures.map((adventure) => (
                <option key={adventure.id} value={adventure.id}>
                  {adventure.name} ({adventure.kind})
                </option>
              ))}
            </select>
          </label>

          <div className="inline-grid">
            <label>
              Minutes
              <input type="number" min={30} max={120} value={request.durationMinutes} onChange={(event) => setRequest((current) => ({ ...current, durationMinutes: Number(event.target.value) }))} />
            </label>
            <label>
              Scouts
              <input type="number" min={1} max={16} value={request.scoutCount} onChange={(event) => setRequest((current) => ({ ...current, scoutCount: Number(event.target.value) }))} />
            </label>
          </div>

          <label>
            Meeting Date
            <input type="date" value={request.meetingDate} onChange={(event) => setRequest((current) => ({ ...current, meetingDate: event.target.value }))} />
          </label>

          <label>
            Environment
            <select value={request.environment} onChange={(event) => setRequest((current) => ({ ...current, environment: event.target.value as Environment }))}>
              <option value="indoor">Indoor</option>
              <option value="outdoor">Outdoor</option>
              <option value="either">Either</option>
            </select>
          </label>

          <label>
            Leader Notes
            <textarea rows={4} value={request.notes} onChange={(event) => setRequest((current) => ({ ...current, notes: event.target.value }))} placeholder="What makes this meeting different this week?" />
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

          <button className="primary-button" onClick={() => void handleGenerate()}>
            Generate Leader Packet
          </button>
        </section>

        <section className="panel panel-large">
          <div className="panel-header">
            <div>
              <h2>Leader Packet</h2>
              <p>Meeting-ready plan with swaps, print support, completion recap, and a parent update.</p>
            </div>
            {plan ? (
              <button className="secondary-button" onClick={() => window.print()}>
                Print Packet
              </button>
            ) : null}
          </div>

          {plan ? (
            <div className="plan-stack">
              <div className="summary-grid">
                <div className="summary-card"><span>Den</span><strong>{plan.denName}</strong></div>
                <div className="summary-card"><span>Adventure</span><strong>{plan.adventure.name}</strong></div>
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
                  <ul>{plan.coverage.map((item) => <li key={item.requirementId}><strong>Req {item.requirementNumber}:</strong> {item.reason}</li>)}</ul>
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
                      Requirement {item.requirementNumber} completed
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
            </div>
          ) : (
            <div className="empty-state">Generate a meeting to get a printable packet, recap form, and parent update template.</div>
          )}
        </section>

        <section className="panel panel-wide">
          <h2>Den Year Plan</h2>
          <p>Monthly themes hold saved meeting plans and become the reusable history for next year.</p>
          {yearPlan?.months.length ? (
            <div className="year-plan-list">
              {yearPlan.months.map((month) => (
                <article className="year-plan-card" key={month.monthKey}>
                  <span>{month.monthLabel}</span>
                  <strong>{month.theme}</strong>
                  {month.items.map((item) => (
                    <div key={item.id} className="year-plan-item">
                      <p>{item.title}</p>
                      <small>{item.plannedDate || "No date"} · {item.payload.adventure.name}</small>
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
                activePreviewActivity.requirementId &&
                activePreviewActivity.requirementId !== activeAgendaItem.primaryRequirementId ? (
                  <div className="review-banner">
                    This option comes from a different requirement in the same adventure. You can use it, but requirement completion will move to leader review.
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