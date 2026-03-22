import { useEffect, useMemo, useState } from "react";
import { api } from "./api";
import type {
  Activity,
  CoverageStatus,
  Environment,
  MeetingAgendaItem,
  MeetingPlan,
  MeetingRequest,
  Rank,
  YearPlanOutline
} from "../shared/types.js";

const defaultRequest = {
  durationMinutes: 60,
  scoutCount: 6,
  environment: "indoor" as Environment,
  notes: ""
};

function coverageLabel(status: CoverageStatus | null): string | null {
  if (status === "automatic") {
    return "Auto coverage";
  }
  if (status === "leader-review") {
    return "Leader review";
  }
  if (status === "uncovered") {
    return "Uncovered";
  }
  return null;
}

export function App() {
  const [ranks, setRanks] = useState<Rank[]>([]);
  const [adventures, setAdventures] = useState<MeetingPlan["adventure"][]>([]);
  const [selectedRankId, setSelectedRankId] = useState("");
  const [selectedAdventureId, setSelectedAdventureId] = useState("");
  const [request, setRequest] = useState(defaultRequest);
  const [plan, setPlan] = useState<MeetingPlan | null>(null);
  const [yearPlan, setYearPlan] = useState<YearPlanOutline | null>(null);
  const [plannedDate, setPlannedDate] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const [activeAgendaItemId, setActiveAgendaItemId] = useState<string | null>(null);
  const [activePreviewActivityId, setActivePreviewActivityId] = useState<string | null>(null);

  useEffect(() => {
    api.listRanks().then((nextRanks) => {
      setRanks(nextRanks);
      if (nextRanks[0]) {
        setSelectedRankId(nextRanks[0].id);
      }
    });
  }, []);

  useEffect(() => {
    if (!selectedRankId) {
      return;
    }
    api.listAdventures(selectedRankId).then((nextAdventures) => {
      setAdventures(nextAdventures);
      setSelectedAdventureId(nextAdventures[0]?.id ?? "");
    });
    api.getYearPlan(selectedRankId).then(setYearPlan).catch(() => setYearPlan(null));
  }, [selectedRankId]);

  const selectedAdventure = useMemo(
    () => adventures.find((adventure) => adventure.id === selectedAdventureId) ?? null,
    [adventures, selectedAdventureId]
  );

  const activityLookup = useMemo(() => {
    return new Map((plan?.activityLibrary ?? []).map((activity) => [activity.id, activity]));
  }, [plan]);

  const activeAgendaItem = useMemo(
    () => plan?.agenda.find((item) => item.id === activeAgendaItemId && item.kind === "activity") ?? null,
    [activeAgendaItemId, plan]
  );

  const previewOptions = useMemo(() => {
    if (!activeAgendaItem || !plan) {
      return [] as Activity[];
    }
    const selected = activeAgendaItem.selectedActivityId
      ? activityLookup.get(activeAgendaItem.selectedActivityId)
      : null;
    const alternatives = activeAgendaItem.alternativeActivityIds
      .map((activityId) => activityLookup.get(activityId))
      .filter((activity): activity is Activity => Boolean(activity));
    return selected ? [selected, ...alternatives] : alternatives;
  }, [activeAgendaItem, activityLookup, plan]);

  const activePreviewActivity =
    (activePreviewActivityId ? activityLookup.get(activePreviewActivityId) : null) ?? previewOptions[0] ?? null;

  async function handleGenerate(): Promise<void> {
    if (!selectedRankId || !selectedAdventureId) {
      return;
    }
    const nextPlan = await api.generatePlan({
      rankId: selectedRankId,
      adventureId: selectedAdventureId,
      ...request
    } satisfies MeetingRequest);
    setPlan(nextPlan);
    setSaveMessage("");
    setActiveAgendaItemId(null);
    setActivePreviewActivityId(null);
  }

  function updateAgendaItem(itemId: string, patch: Partial<MeetingAgendaItem>): void {
    setPlan((current) => {
      if (!current) {
        return current;
      }
      return {
        ...current,
        agenda: current.agenda.map((item) => (item.id === itemId ? { ...item, ...patch } : item))
      };
    });
  }

  async function handleSave(): Promise<void> {
    if (!plan) {
      return;
    }
    const title = `${plan.rank.name} - ${plan.adventure.name}`;
    await api.savePlan(title, plannedDate || null, plan);
    setSaveMessage("Saved to the year plan outline.");
    const refreshed = await api.getYearPlan(plan.rank.id);
    setYearPlan(refreshed);
  }

  function openPreview(item: MeetingAgendaItem): void {
    setActiveAgendaItemId(item.id);
    setActivePreviewActivityId(item.selectedActivityId);
  }

  async function handleSwap(selectedActivityId: string): Promise<void> {
    if (!plan || !activeAgendaItem) {
      return;
    }
    const nextPlan = await api.swapActivity({
      plan,
      agendaItemId: activeAgendaItem.id,
      selectedActivityId
    });
    setPlan(nextPlan);
    const nextAgendaItem = nextPlan.agenda.find((item) => item.id === activeAgendaItem.id) ?? null;
    setActiveAgendaItemId(nextAgendaItem?.id ?? null);
    setActivePreviewActivityId(selectedActivityId);
  }

  return (
    <div className="page-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">Den Meeting Builder</p>
          <h1>Build a den meeting from an official adventure in minutes.</h1>
          <p className="hero-copy">
            Start with a rank and adventure, add the basics about your den, and get a leader-ready run of show with official activity links, requirement coverage, and guided activity swaps.
          </p>
        </div>
      </section>

      <main className="content-grid">
        <section className="panel">
          <h2>Meeting Inputs</h2>
          <label>
            Rank
            <select value={selectedRankId} onChange={(event) => setSelectedRankId(event.target.value)}>
              {ranks.map((rank) => (
                <option key={rank.id} value={rank.id}>
                  {rank.name} ({rank.grade})
                </option>
              ))}
            </select>
          </label>

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
              <input
                type="number"
                min={30}
                max={120}
                value={request.durationMinutes}
                onChange={(event) =>
                  setRequest((current) => ({ ...current, durationMinutes: Number(event.target.value) }))
                }
              />
            </label>

            <label>
              Scouts
              <input
                type="number"
                min={1}
                max={16}
                value={request.scoutCount}
                onChange={(event) =>
                  setRequest((current) => ({ ...current, scoutCount: Number(event.target.value) }))
                }
              />
            </label>
          </div>

          <label>
            Environment
            <select
              value={request.environment}
              onChange={(event) =>
                setRequest((current) => ({ ...current, environment: event.target.value as Environment }))
              }
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
              onChange={(event) => setRequest((current) => ({ ...current, notes: event.target.value }))}
              placeholder="Allergy reminders, room setup limits, or pacing concerns"
            />
          </label>

          <button className="primary-button" onClick={() => void handleGenerate()}>
            Generate Meeting Plan
          </button>

          {selectedAdventure ? (
            <div className="callout">
              <strong>{selectedAdventure.name}</strong>
              <p>{selectedAdventure.snapshot || "Adventure details will be filled in after ingestion."}</p>
              <a href={selectedAdventure.sourceUrl} target="_blank" rel="noreferrer">
                View official adventure
              </a>
            </div>
          ) : null}
        </section>

        <section className="panel panel-large">
          <div className="panel-header">
            <div>
              <h2>Leader Plan</h2>
              <p>Adjust timing, preview official alternates, and swap activities without leaving the meeting plan.</p>
            </div>
          </div>

          {plan ? (
            <div className="plan-stack">
              <div className="summary-grid">
                <div className="summary-card">
                  <span>Adventure</span>
                  <strong>{plan.adventure.name}</strong>
                </div>
                <div className="summary-card">
                  <span>Duration</span>
                  <strong>{plan.request.durationMinutes} min</strong>
                </div>
                <div className="summary-card">
                  <span>Environment</span>
                  <strong>{plan.request.environment}</strong>
                </div>
              </div>

              <div className="list-block">
                <h3>Prep Notes</h3>
                <ul>
                  {plan.prepNotes.map((note) => (
                    <li key={note}>{note}</li>
                  ))}
                </ul>
              </div>

              <div className="list-block">
                <h3>Materials</h3>
                <ul>
                  {plan.materials.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>

              <div className="agenda-list">
                {plan.agenda.map((item) => (
                  <article className="agenda-card" key={item.id}>
                    <div className="agenda-head">
                      <div>
                        <span className="agenda-kind">{item.kind}</span>
                        <h3>{item.title}</h3>
                      </div>
                      <input
                        className="minutes-input"
                        type="number"
                        value={item.durationMinutes}
                        min={5}
                        onChange={(event) =>
                          updateAgendaItem(item.id, { durationMinutes: Number(event.target.value) })
                        }
                      />
                    </div>
                    <p>{item.description}</p>
                    {coverageLabel(item.coverageStatus) ? (
                      <div className={`coverage-chip coverage-${item.coverageStatus}`}>{coverageLabel(item.coverageStatus)}</div>
                    ) : null}
                    <textarea
                      rows={3}
                      value={item.editableNotes}
                      onChange={(event) => updateAgendaItem(item.id, { editableNotes: event.target.value })}
                    />
                    {item.kind === "activity" ? (
                      <div className="agenda-actions">
                        <button className="secondary-button" onClick={() => openPreview(item)}>
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
                        <strong>Req {item.requirementNumber}:</strong> {item.reason}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="list-block">
                  <h3>Leader Guidance</h3>
                  <p>{plan.leaderNotes}</p>
                  <label>
                    Add to year plan
                    <input type="date" value={plannedDate} onChange={(event) => setPlannedDate(event.target.value)} />
                  </label>
                  <button className="secondary-button" onClick={() => void handleSave()}>
                    Save This Meeting
                  </button>
                  {saveMessage ? <p className="save-message">{saveMessage}</p> : null}
                </div>
              </div>
            </div>
          ) : (
            <div className="empty-state">
              Generate a meeting plan to see a timed agenda, prep list, requirement coverage, and activity alternatives.
            </div>
          )}
        </section>

        <section className="panel panel-wide">
          <h2>Year Outline</h2>
          <p>Saved plans for the selected rank become a lightweight curriculum sequence for the year.</p>
          {yearPlan && yearPlan.items.length > 0 ? (
            <div className="year-plan-list">
              {yearPlan.items.map((item) => (
                <article className="year-plan-card" key={item.savedPlanId}>
                  <span>{item.plannedDate || "No date"}</span>
                  <strong>{item.title}</strong>
                  <p>{item.adventureName}</p>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">Save a generated plan to start building the year outline.</div>
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
              <button className="close-button" onClick={() => setActiveAgendaItemId(null)}>
                Close
              </button>
            </div>

            <div className="drawer-layout">
              <aside className="options-list">
                {previewOptions.map((activity) => (
                  <button
                    key={activity.id}
                    className={`option-card ${activity.id === activePreviewActivity.id ? "option-card-active" : ""}`}
                    onClick={() => setActivePreviewActivityId(activity.id)}
                  >
                    <strong>{activity.name}</strong>
                    <span>{activity.location}</span>
                    {activity.requirementId !== activeAgendaItem.primaryRequirementId ? (
                      <span className="option-warning">Review required</span>
                    ) : null}
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
                {activePreviewActivity.requirementId !== activeAgendaItem.primaryRequirementId ? (
                  <div className="review-banner">
                    This activity was suggested under a different requirement. You can use it, but coverage will change to leader review.
                  </div>
                ) : null}
                <p className="preview-details">{activePreviewActivity.previewDetails}</p>
                <div className="preview-actions">
                  <a href={activePreviewActivity.sourceUrl} target="_blank" rel="noreferrer">
                    View official source
                  </a>
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